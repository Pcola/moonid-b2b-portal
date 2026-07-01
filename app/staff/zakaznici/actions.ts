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

const CUST_ROLE = z.enum(["CUSTOMER_ADMIN", "CUSTOMER_USER"]);

/** Deaktivuje/reaktivuje používateľa firmy (staff). Deaktivovaný sa neprihlási (requireUser
 *  kontroluje `active`). Nedovolí deaktivovať posledného aktívneho správcu firmy. */
export async function setCompanyUserActive(userId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, companyId: true } });
  if (!u || !u.companyId) return { ok: false, error: "Používateľ neexistuje." };
  if (u.role === "STAFF" || u.role === "ADMIN") return { ok: false, error: "Interné kontá sa takto nespravujú." };
  if (!active && u.role === "CUSTOMER_ADMIN") {
    const admins = await prisma.user.count({ where: { companyId: u.companyId, role: "CUSTOMER_ADMIN", active: true, id: { not: userId } } });
    if (admins === 0) return { ok: false, error: "Firme musí ostať aspoň jeden aktívny správca." };
  }
  await prisma.user.update({ where: { id: userId }, data: { active: Boolean(active) } });
  if (!active) {
    // uvoľni ho ako schvaľovateľa — jeho approvees spadnú na správcu firmy (a treba im prideliť nového)
    await prisma.user.updateMany({ where: { companyId: u.companyId, approverId: userId }, data: { approverId: null } });
  }
  await writeAudit({ userId: staff.id, companyId: u.companyId, action: "USER_ACTIVE", entity: "User", entityId: userId, meta: { active: Boolean(active) } });
  revalidatePath(`/staff/zakaznici/${u.companyId}`);
  return { ok: true };
}

/** Zmení rolu používateľa firmy medzi správcom a bežným používateľom (staff).
 *  Nedovolí odobrať poslednému aktívnemu správcovi. Správca objednáva vždy priamo. */
export async function setCompanyUserRole(userId: string, role: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };
  const rp = CUST_ROLE.safeParse(role);
  if (!rp.success) return { ok: false, error: "Neplatná rola." };
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, active: true, companyId: true } });
  if (!u || !u.companyId) return { ok: false, error: "Používateľ neexistuje." };
  if (u.role === "STAFF" || u.role === "ADMIN") return { ok: false, error: "Interné kontá sa takto nemenia." };
  if (u.role === rp.data) return { ok: true };
  if (u.role === "CUSTOMER_ADMIN" && rp.data === "CUSTOMER_USER") {
    const admins = await prisma.user.count({ where: { companyId: u.companyId, role: "CUSTOMER_ADMIN", active: true, id: { not: userId } } });
    if (admins === 0) return { ok: false, error: "Firme musí ostať aspoň jeden správca." };
  }
  // povýšenie na správcu → objednáva priamo, bez schvaľovateľa
  const data = rp.data === "CUSTOMER_ADMIN" ? { role: rp.data, canOrderDirectly: true, approverId: null } : { role: rp.data };
  await prisma.user.update({ where: { id: userId }, data });
  await writeAudit({ userId: staff.id, companyId: u.companyId, action: "USER_ROLE", entity: "User", entityId: userId, meta: { role: rp.data } });
  revalidatePath(`/staff/zakaznici/${u.companyId}`);
  return { ok: true };
}

/** Znovu vygeneruje prístupový odkaz (pozvánka/reset hesla) pre používateľa firmy (staff).
 *  Len pre aktívne kontá — deaktivované sa najprv aktivujú. */
export async function resendCompanyUserInvite(userId: string): Promise<{ ok: boolean; error?: string; inviteLink?: string | null }> {
  const staff = await requireStaff();
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, role: true, active: true, companyId: true, company: { select: { name: true } } } });
  if (!u || !u.companyId) return { ok: false, error: "Používateľ neexistuje." };
  if (u.role === "STAFF" || u.role === "ADMIN") return { ok: false, error: "Interné kontá sa takto nepozývajú." };
  if (!u.active) return { ok: false, error: "Používateľ je deaktivovaný — najprv ho aktivujte." };
  const res = await inviteUser(u.email, u.name, u.role === "CUSTOMER_ADMIN" ? "CUSTOMER_ADMIN" : "CUSTOMER_USER", u.companyId, u.company?.name ?? "Moonid");
  if (!res.ok) return { ok: false, error: res.error };
  await writeAudit({ userId: staff.id, companyId: u.companyId, action: "USER_INVITE_RESEND", entity: "User", entityId: userId, meta: { email: u.email } });
  revalidatePath(`/staff/zakaznici/${u.companyId}`);
  return { ok: true, inviteLink: res.inviteLink ?? null };
}
