"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { inviteUser } from "@/lib/invite";

const ID = z.string().min(1).max(100);

const companySchema = z.object({
  name: z.string().trim().min(2, "Zadajte názov firmy").max(160),
  ico: z.string().trim().min(6, "Neplatné IČO").max(12),
  dic: z.string().trim().max(20).optional().or(z.literal("")),
  icDph: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  tierCode: z.string().trim().min(1, "Vyberte cenovú úroveň").max(20),
  splatDays: z.coerce.number().int().min(0).max(365),
  contactEmail: z.string().trim().email("Neplatný e-mail").max(160).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
});

/** Založí nového zákazníka (firmu) priamo zo staffu + voliteľne pozve prvého používateľa. */
export async function createCustomer(input: z.input<typeof companySchema>): Promise<{ ok: boolean; error?: string; id?: string; inviteLink?: string | null }> {
  const staff = await requireStaff();
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte polia." };
  const d = parsed.data;

  const tier = await prisma.priceTier.findFirst({ where: { code: d.tierCode }, select: { id: true } });
  if (!tier) return { ok: false, error: "Neznáma cenová úroveň." };
  if (await prisma.company.findUnique({ where: { ico: d.ico }, select: { id: true } })) {
    return { ok: false, error: "Firma s týmto IČO už existuje." };
  }
  if (d.contactEmail) {
    const u = await prisma.user.findUnique({ where: { email: d.contactEmail }, select: { companyId: true } });
    if (u?.companyId) return { ok: false, error: "Tento e-mail už patrí inej firme." };
  }

  const company = await prisma.company.create({
    data: { ico: d.ico, name: d.name, dic: d.dic || null, icDph: d.icDph || null, city: d.city || null, address: d.address || null, priceTierId: tier.id, splatDays: d.splatDays },
  });
  await writeAudit({ userId: staff.id, companyId: company.id, action: "COMPANY_CREATE", entity: "Company", entityId: company.id, meta: { ico: d.ico, tier: d.tierCode } });

  let inviteLink: string | null = null;
  if (d.contactEmail) {
    const res = await inviteUser(d.contactEmail, d.contactName || null, "CUSTOMER_ADMIN", company.id, company.name);
    if (!res.ok) { revalidatePath("/staff/zakaznici"); return { ok: true, id: company.id, error: "Firma vytvorená, ale pozvánka zlyhala: " + res.error }; }
    inviteLink = res.inviteLink ?? null;
  }
  revalidatePath("/staff/zakaznici");
  return { ok: true, id: company.id, inviteLink };
}

/** Pridá (pozve) ďalšieho používateľa k existujúcej firme. */
export async function addUserToCompany(companyId: string, email: string, name: string): Promise<{ ok: boolean; error?: string; inviteLink?: string | null }> {
  const staff = await requireStaff();
  if (!ID.safeParse(companyId).success) return { ok: false, error: "Neplatný vstup." };
  const ev = z.string().trim().email().max(160).safeParse(String(email ?? "").trim());
  if (!ev.success) return { ok: false, error: "Neplatný e-mail." };

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) return { ok: false, error: "Firma neexistuje." };
  const existing = await prisma.user.findUnique({ where: { email: ev.data }, select: { companyId: true } });
  if (existing?.companyId && existing.companyId !== companyId) return { ok: false, error: "Tento e-mail už patrí inej firme." };

  const res = await inviteUser(ev.data, String(name ?? "").trim() || null, "CUSTOMER_USER", companyId, company.name);
  if (!res.ok) return { ok: false, error: res.error };
  await writeAudit({ userId: staff.id, companyId, action: "USER_INVITE", entity: "User", entityId: companyId, meta: { email: ev.data } });
  revalidatePath(`/staff/zakaznici/${companyId}`);
  return { ok: true, inviteLink: res.inviteLink ?? null };
}
