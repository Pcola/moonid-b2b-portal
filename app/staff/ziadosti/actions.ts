"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { inviteUser } from "@/lib/invite";
import { isInternalRole, normalizeInternalEmail } from "@/lib/internal-user-policy";

export async function approveRequest(
  id: string,
  tierCode: string,
  splatDays: number
): Promise<{ ok: boolean; error?: string; inviteLink?: string | null }> {
  const staff = await requireStaff();
  if (!Number.isInteger(splatDays) || splatDays < 0 || splatDays > 365) return { ok: false, error: "Splatnosť musí byť 0–365 dní." };
  if (typeof tierCode !== "string" || tierCode.length < 1 || tierCode.length > 20) return { ok: false, error: "Neplatná cenová úroveň." };
  const req = await prisma.accessRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") return { ok: false, error: "Žiadosť už nie je otvorená." };
  const tier = await prisma.priceTier.findFirst({ where: { code: tierCode } });
  if (!tier) return { ok: false, error: "Neznáma cenová úroveň." };
  const normalizedEmail = normalizeInternalEmail(req.email);
  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: { role: true },
  });
  if (existing && isInternalRole(existing.role)) {
    return { ok: false, error: "E-mail žiadosti patrí internému Moonid účtu; schválenie bolo zablokované." };
  }

  // Verejná žiadosť s IČO existujúceho zákazníka nikdy automaticky nepridá nového
  // tenant admina ani neprepíše obchodné podmienky. Vyžaduje samostatné overenie firmy.
  const existingCompany = await prisma.company.findUnique({ where: { ico: req.ico }, select: { id: true, name: true } });
  if (existingCompany && req.companyId !== existingCompany.id) {
    return {
      ok: false,
      error: "Firma s týmto IČO už v portáli existuje. Žiadosť ponechajte otvorenú a overte oprávnenie kontaktu mimo portálu; používateľa potom pridajte cez detail firmy.",
    };
  }

  let company = existingCompany;
  if (!company) {
    try {
      company = await prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: { ico: req.ico, name: req.companyName, priceTierId: tier.id, splatDays },
        });
        // Väzba umožní bezpečný retry iba pre firmu vytvorenú touto konkrétnou žiadosťou.
        await tx.accessRequest.update({ where: { id }, data: { companyId: created.id } });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { ok: false, error: "Firma s týmto IČO medzitým vznikla. Automatické schválenie bolo bezpečne zastavené." };
      }
      throw error;
    }
  }

  const invited = await inviteUser(
    normalizedEmail,
    req.contactName,
    "CUSTOMER_ADMIN",
    company.id,
    company.name,
    { id: staff.id, kind: "STAFF" },
  );
  if (!invited.ok) return { ok: false, error: invited.error };
  const inviteLink = invited.inviteLink ?? null;

  await prisma.accessRequest.update({
    where: { id },
    data: { status: "APPROVED", resolvedById: staff.id, resolvedAt: new Date(), companyId: company.id },
  });

  await writeAudit({ userId: staff.id, companyId: company.id, action: "ACCESS_APPROVE", entity: "Company", entityId: company.id, meta: { requestId: id, email: req.email, ico: req.ico, tier: tierCode, splatDays } });
  // POZN: zámerne NErevalidujeme — necháme kartu zobraziť pozvánkový odkaz staffovi.
  // Po refreshi žiadosť zmizne z PENDING zoznamu (je APPROVED).

  return { ok: true, inviteLink };
}

export async function rejectRequest(id: string): Promise<{ ok: boolean }> {
  const staff = await requireStaff();
  await prisma.accessRequest.update({
    where: { id },
    data: { status: "REJECTED", resolvedById: staff.id, resolvedAt: new Date() },
  });
  await writeAudit({ userId: staff.id, action: "ACCESS_REJECT", entity: "AccessRequest", entityId: id });
  revalidatePath("/staff/ziadosti");
  return { ok: true };
}
