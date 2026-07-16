"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

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

  // firma podľa IČO (existujúcu aktualizuje, novú založí)
  const company = await prisma.company.upsert({
    where: { ico: req.ico },
    update: { priceTierId: tier.id, splatDays },
    create: { ico: req.ico, name: req.companyName, priceTierId: tier.id, splatDays },
  });

  const admin = createAdminClient();
  const redirectTo = `${await origin()}/auth/callback?next=/nastav-heslo`;

  let authId: string | null = null;
  let inviteLink: string | null = null;

  const { data: gen, error: genErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email: req.email,
    options: { redirectTo },
  });
  if (gen?.user) {
    authId = gen.user.id;
    inviteLink = gen.properties?.action_link ?? null;
  } else {
    // konto už existuje → recovery odkaz; authId vezmeme priamo z jeho odpovede
    // (bez listUsers({perPage:1000}), ktorý by nad 1000 účtov ticho nenašiel usera).
    const { data: rec, error: recErr } = await admin.auth.admin.generateLink({ type: "recovery", email: req.email, options: { redirectTo } });
    if (!rec?.user) return { ok: false, error: "Nepodarilo sa nájsť/vytvoriť konto: " + (recErr?.message ?? genErr?.message ?? "neznáma chyba") };
    authId = rec.user.id;
    inviteLink = rec.properties?.action_link ?? null;
  }

  await prisma.user.upsert({
    where: { email: req.email },
    update: { authId: authId!, role: "CUSTOMER_ADMIN", companyId: company.id, active: true },
    create: { authId: authId!, email: req.email, name: req.contactName, role: "CUSTOMER_ADMIN", companyId: company.id },
  });

  await prisma.accessRequest.update({
    where: { id },
    data: { status: "APPROVED", resolvedById: staff.id, resolvedAt: new Date(), companyId: company.id },
  });

  await writeAudit({ userId: staff.id, companyId: company.id, action: "ACCESS_APPROVE", entity: "Company", entityId: company.id, meta: { requestId: id, email: req.email, ico: req.ico, tier: tierCode, splatDays } });
  // POZN: zámerne NErevalidujeme — necháme kartu zobraziť pozvánkový odkaz staffovi.
  // Po refreshi žiadosť zmizne z PENDING zoznamu (je APPROVED).

  // pošli pozvánku aj priamo zákazníkovi (best-effort, popri zobrazení staffovi)
  if (inviteLink) {
    await sendEmail({
      to: req.email,
      subject: "Prístup do Moonid B2B portálu",
      text: [
        "Dobrý deň,",
        "",
        `pripravili sme vám prístup do B2B portálu Moonid pre firmu ${company.name}.`,
        "Heslo si nastavte cez tento odkaz:",
        inviteLink,
        "",
        `Potom sa prihlásite na ${await origin()}/login.`,
        "",
        "Tím Moonid",
      ].join("\n"),
    });
  }

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
