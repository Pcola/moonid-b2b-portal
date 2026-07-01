"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const ID = z.string().min(1).max(100);

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/** Vytvorí/pozve používateľa pre firmu (Supabase invite alebo recovery ak konto existuje) +
 *  upsertne User. Vráti pozvánkový odkaz (staff ho vidí; e-mail ide best-effort). */
async function inviteUser(email: string, name: string | null, role: "CUSTOMER_ADMIN" | "CUSTOMER_USER", companyId: string, companyName: string): Promise<{ ok: boolean; error?: string; inviteLink?: string | null }> {
  const admin = createAdminClient();
  const redirectTo = `${await origin()}/auth/callback?next=/nastav-heslo`;
  let authId: string | null = null;
  let inviteLink: string | null = null;

  const { data: gen, error: genErr } = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });
  if (gen?.user) {
    authId = gen.user.id;
    inviteLink = gen.properties?.action_link ?? null;
  } else {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: "Nepodarilo sa vytvoriť konto: " + (genErr?.message ?? "neznáma chyba") };
    authId = found.id;
    const { data: rec } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    inviteLink = rec?.properties?.action_link ?? null;
  }

  await prisma.user.upsert({
    where: { email },
    update: { authId: authId!, role, companyId, active: true },
    create: { authId: authId!, email, name: name ?? undefined, role, companyId },
  });

  if (inviteLink) {
    await sendEmail({
      to: email,
      subject: "Prístup do Moonid B2B portálu",
      text: [`Dobrý deň,`, "", `pripravili sme vám prístup do B2B portálu Moonid pre firmu ${companyName}.`, "Heslo si nastavte cez tento odkaz:", inviteLink, "", `Potom sa prihlásite na ${await origin()}/login.`, "", "Tím Moonid"].join("\n"),
    });
  }
  return { ok: true, inviteLink };
}

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
