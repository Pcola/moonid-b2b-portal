"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { inviteUser } from "@/lib/invite";
import { isInternalRole, normalizeInternalEmail } from "@/lib/internal-user-policy";
import { isLastCustomerAdminConstraint } from "@/lib/user-lifecycle-errors";

// ---------- Správa adries (fakturačná + dodacie) — len správca firmy (CUSTOMER_ADMIN) ----------

const ID = z.string().min(1).max(100);
const billingSchema = z.object({
  street: z.string().trim().max(160).nullable(),
  zip: z.string().trim().max(12).nullable(),
  city: z.string().trim().max(80).nullable(),
});
const locSchema = z.object({
  label: z.string().trim().min(1, "Zadajte označenie (napr. Prevádzka centrum)").max(80),
  street: z.string().trim().min(2, "Zadajte ulicu a číslo").max(160),
  zip: z.string().trim().min(3, "Zadajte PSČ").max(12),
  city: z.string().trim().min(1, "Zadajte mesto").max(80),
});

async function requireCompanyAdmin() {
  const user = await requireUser();
  if (!user.companyId) return { user, err: "Konto nie je priradené k firme." as string | null };
  if (user.role !== "CUSTOMER_ADMIN") return { user, err: "Len správca firmy môže upravovať adresy." };
  return { user, err: null as string | null };
}

/** Upraví fakturačnú adresu firmy (adresa na faktúre). Len správca firmy; audit. */
export async function updateBillingAddress(input: z.input<typeof billingSchema>): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  const p = billingSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Neplatný vstup." };
  await prisma.company.update({ where: { id: user.companyId! }, data: { address: p.data.street?.trim() || null, zip: p.data.zip?.trim() || null, city: p.data.city?.trim() || null } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "COMPANY_BILLING_UPDATE", entity: "Company", entityId: user.companyId! });
  revalidatePath("/nastavenia"); revalidatePath("/kosik");
  return { ok: true };
}

/** Pridá dodaciu adresu (pobočku). Prvá sa stane predvolenou. Len správca firmy; audit. */
export async function addDeliveryLocation(input: z.input<typeof locSchema>): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  const p = locSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Neplatný vstup." };
  const count = await prisma.deliveryLocation.count({ where: { companyId: user.companyId! } });
  if (count >= 50) return { ok: false, error: "Dosiahli ste maximum adries." };
  await prisma.deliveryLocation.create({ data: { companyId: user.companyId!, label: p.data.label, street: p.data.street, zip: p.data.zip, city: p.data.city, isDefault: count === 0 } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "DELIVERY_LOCATION_ADD", entity: "DeliveryLocation", meta: { label: p.data.label } });
  revalidatePath("/nastavenia"); revalidatePath("/kosik");
  return { ok: true };
}

/** Upraví dodaciu adresu (IDOR: musí patriť firme). Len správca firmy; audit. */
export async function updateDeliveryLocation(id: string, input: z.input<typeof locSchema>): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const p = locSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Neplatný vstup." };
  const loc = await prisma.deliveryLocation.findFirst({ where: { id, companyId: user.companyId! }, select: { id: true } });
  if (!loc) return { ok: false, error: "Adresa neexistuje." };
  await prisma.deliveryLocation.update({ where: { id }, data: { label: p.data.label, street: p.data.street, zip: p.data.zip, city: p.data.city } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "DELIVERY_LOCATION_UPDATE", entity: "DeliveryLocation", entityId: id });
  revalidatePath("/nastavenia"); revalidatePath("/kosik");
  return { ok: true };
}

/** Zmaže dodaciu adresu. Ak je použitá v objednávkach, nedá sa zmazať (história) — treba upraviť. */
export async function deleteDeliveryLocation(id: string): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const loc = await prisma.deliveryLocation.findFirst({ where: { id, companyId: user.companyId! }, select: { id: true, isDefault: true } });
  if (!loc) return { ok: false, error: "Adresa neexistuje." };
  try {
    await prisma.deliveryLocation.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { ok: false, error: "Táto adresa je použitá v objednávkach — nemožno ju zmazať. Môžete ju upraviť." };
    }
    throw e;
  }
  if (loc.isDefault) {
    const next = await prisma.deliveryLocation.findFirst({ where: { companyId: user.companyId! }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (next) await prisma.deliveryLocation.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "DELIVERY_LOCATION_DELETE", entity: "DeliveryLocation", entityId: id });
  revalidatePath("/nastavenia"); revalidatePath("/kosik");
  return { ok: true };
}

/** Nastaví predvolenú dodaciu adresu (ostatné zruší). Len správca firmy. */
export async function setDefaultDeliveryLocation(id: string): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const loc = await prisma.deliveryLocation.findFirst({ where: { id, companyId: user.companyId! }, select: { id: true } });
  if (!loc) return { ok: false, error: "Adresa neexistuje." };
  await prisma.$transaction([
    prisma.deliveryLocation.updateMany({ where: { companyId: user.companyId! }, data: { isDefault: false } }),
    prisma.deliveryLocation.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/nastavenia"); revalidatePath("/kosik");
  return { ok: true };
}

/** GDPR čl. 15/20 — individuálny export aktuálneho používateľa, NIKDY údajov kolegov.
 *  Rozsah = úplná kópia osobných údajov, ktoré o žiadateľovi držíme: konto, firemný
 *  kontext, jeho objednávky, jeho košík a koncept opakovanej objednávky, jeho zmeny
 *  stavov, jeho auditná stopa a verejné dopyty/žiadosti podané z jeho e-mailu.
 *  AuditLog.meta je zámerne VYNECHANÉ — môže niesť údaje tretích osôb (napr. e-mail
 *  pozývaného kolegu), a čl. 15 ods. 4 zakazuje, aby kópia poškodila práva iných.
 *  Tenant hranica: objednávky ostávajú filtrované aj na companyId, zvyšok je viazaný
 *  výlučne na user.id / vlastný e-mail. Limit 5 exportov/hod (dotaz je DB-náročný). */
export async function exportMyData(): Promise<{ ok: boolean; data?: string; error?: string }> {
  const user = await requireUser();
  const gate = await rateLimit(rateLimitKey("gdpr-export", user.id), { limit: 5, windowSec: 3600 });
  if (!gate.ok) return { ok: false, error: "Priveľa exportov za sebou. Skúste to znova o hodinu." };
  const cid = user.companyId;

  const [me, company, myOrders, myCart, myRepeatDraft, myStatusEvents, myAudit, myInquiries, myAccessRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, role: true, active: true, mfaEnabled: true, canOrderDirectly: true, approverId: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    }),
    cid ? prisma.company.findUnique({ where: { id: cid }, select: { name: true, ico: true, dic: true, icDph: true, address: true, zip: true, city: true, splatDays: true } }) : Promise.resolve(null),
    prisma.order.findMany({
      where: cid ? { companyId: cid, createdById: user.id } : { createdById: user.id },
      orderBy: { createdAt: "desc" },
      select: { number: true, status: true, createdAt: true, subtotal: true, vat: true, total: true, note: true, poNumber: true, deliveryMethodLabel: true, shippingFee: true, paymentMethodLabel: true, paymentSurcharge: true, deliveryAddressSnapshot: true, termsVersion: true, termsSha256: true, termsAcknowledgedAt: true, items: { select: { skuSnapshot: true, nameSnapshot: true, qty: true, unitPriceSnapshot: true, lineTotal: true } } },
    }),
    prisma.cart.findUnique({ where: { createdById: user.id }, select: { createdAt: true, updatedAt: true, items: { select: { qty: true, product: { select: { sku: true, name: true } } } } } }),
    prisma.repeatDraftItem.findMany({ where: { userId: user.id }, select: { qty: true, product: { select: { sku: true, name: true } } } }),
    prisma.orderStatusEvent.findMany({ where: { changedById: user.id }, orderBy: { occurredAt: "desc" }, select: { status: true, occurredAt: true, note: true, order: { select: { number: true } } } }),
    prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { action: true, entity: true, entityId: true, ip: true, userAgent: true, createdAt: true } }),
    prisma.inquiry.findMany({ where: { email: { equals: user.email, mode: "insensitive" } }, orderBy: { createdAt: "desc" }, select: { name: true, company: true, email: true, phone: true, location: true, type: true, segment: true, message: true, createdAt: true, handledAt: true } }),
    prisma.accessRequest.findMany({ where: { email: { equals: user.email, mode: "insensitive" } }, orderBy: { createdAt: "desc" }, select: { ico: true, companyName: true, contactName: true, email: true, phone: true, note: true, status: true, createdAt: true, resolvedAt: true } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    poznamka: "Úplná kópia osobných údajov, ktoré o vás vedieme v B2B portáli Moonid (GDPR čl. 15 a 20). Údaje vašich kolegov export neobsahuje. Auditné záznamy neuvádzajú technické pole „meta“, pretože môže obsahovať údaje iných osôb (čl. 15 ods. 4 GDPR). Vystavené faktúry a účtovné doklady vedieme v účtovnom systéme mimo portálu — na požiadanie ich poskytneme samostatne.",
    konto: {
      email: me?.email ?? user.email,
      meno: me?.name ?? null,
      rola: me?.role ?? user.role,
      aktivneKonto: me?.active ?? null,
      dvojfaktoroveOverenie: me?.mfaEnabled ?? null,
      objednavaPriamo: me?.canOrderDirectly ?? null,
      idSchvalovatela: me?.approverId ?? null,
      poslednePrihlasenie: me?.lastLoginAt ?? null,
      kontoVytvorene: me?.createdAt ?? null,
      kontoNaposledyZmenene: me?.updatedAt ?? null,
    },
    firma: company,
    mojeObjednavky: myOrders,
    mojKosik: myCart,
    mojKonceptOpakovanejObjednavky: myRepeatDraft,
    mnouZmeneneStavyObjednavok: myStatusEvents,
    mojaAuditnaStopa: myAudit,
    mojeDopyty: myInquiries,
    mojeZiadostiOPristup: myAccessRequests,
  };
  await writeAudit({ userId: user.id, companyId: cid, action: "GDPR_ACCESS", entity: "User", entityId: user.id });
  return { ok: true, data: JSON.stringify(payload, null, 2) };
}

/** Prevádzkový firemný export — samostatná B2B funkcia, nie individuálna GDPR odpoveď. */
export async function exportCompanyData(): Promise<{ ok: boolean; data?: string; error?: string }> {
  const user = await requireUser();
  if (!user.companyId || user.role !== "CUSTOMER_ADMIN") return { ok: false, error: "Nemáte oprávnenie na firemný export." };
  const cid = user.companyId;
  const [company, users, orders, invoices, locations] = await Promise.all([
    prisma.company.findUnique({ where: { id: cid }, select: { name: true, ico: true, dic: true, icDph: true, address: true, zip: true, city: true, splatDays: true, createdAt: true, priceTier: { select: { code: true, name: true } } } }),
    prisma.user.findMany({ where: { companyId: cid }, select: { email: true, name: true, role: true, active: true, createdAt: true } }),
    prisma.order.findMany({ where: { companyId: cid }, orderBy: { createdAt: "desc" }, select: { number: true, status: true, createdAt: true, subtotal: true, vat: true, total: true, poNumber: true, items: { select: { nameSnapshot: true, qty: true, unitPriceSnapshot: true, lineTotal: true } } } }),
    prisma.invoice.findMany({ where: { companyId: cid }, orderBy: { issuedAt: "desc" }, select: { pohodaNumber: true, status: true, issuedAt: true, dueAt: true, total: true } }),
    prisma.deliveryLocation.findMany({ where: { companyId: cid }, select: { label: true, street: true, city: true, zip: true } }),
  ]);
  const payload = { exportedAt: new Date().toISOString(), purpose: "Prevádzkový export firemných údajov Moonid B2B", firma: company, pouzivatelia: users, objednavky: orders, faktury: invoices, dodacieAdresy: locations };
  await writeAudit({ userId: user.id, companyId: cid, action: "COMPANY_DATA_EXPORT", entity: "Company", entityId: cid });
  return { ok: true, data: JSON.stringify(payload, null, 2) };
}

/** GDPR čl. 17 — právo na výmaz: zaeviduje žiadosť (audit) + notifikuje Moonid.
 *  Reálny výmaz vybaví prevádzkovateľ (účtovné doklady podliehajú zákonnej archivácii). */
export async function requestErasure(reason?: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const clean = (reason ?? "").trim().slice(0, 1000);

  await writeAudit({ userId: user.id, companyId: user.companyId, action: "GDPR_ERASURE_REQUEST", entity: "Company", entityId: user.companyId, meta: { reason: clean || null, email: user.email } });
  await sendEmail({
    to: STAFF_NOTIFY,
    subject: `Žiadosť o výmaz údajov (GDPR) — ${user.email}`,
    replyTo: user.email,
    text: [
      `Používateľ ${user.email} (firma ${user.companyId}) požiadal o výmaz osobných údajov.`,
      `Dôvod: ${clean || "—"}`,
      "",
      "Vybaviť do 30 dní (GDPR čl. 17). POZOR: vystavené faktúry a účtovné doklady podliehajú zákonnej archivácii (10 r.) — tie sa nemažú, ostatné osobné údaje anonymizovať/zmazať podľa rozsahu žiadosti.",
    ].join("\n"),
  });
  return { ok: true };
}

// ---------- Správa členov firmy (pozvať, práva, aktivácia) — len správca firmy ----------

/** Pozve nového člena firmy (CUSTOMER_USER) — e-mailový odkaz na nastavenie hesla. */
export async function inviteMember(input: { email: string; name?: string }): Promise<{ ok: boolean; error?: string; warning?: string; inviteLink?: string | null }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  const ev = z.string().trim().email("Neplatný e-mail").max(160).safeParse(String(input.email ?? "").trim());
  if (!ev.success) return { ok: false, error: "Neplatný e-mail." };
  const normalizedEmail = normalizeInternalEmail(ev.data);
  const existing = await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: "insensitive" } }, select: { companyId: true, role: true } });
  if (existing && isInternalRole(existing.role)) return { ok: false, error: "Tento e-mail nemožno pozvať do zákazníckej firmy." };
  if (existing?.companyId) {
    if (existing.companyId !== user.companyId) return { ok: false, error: "Tento e-mail už patrí inej firme." };
    // už je členom TEJTO firmy — opätovné „pozvanie" by cez inviteUser potichu prepísalo rolu
    // (CUSTOMER_ADMIN → CUSTOMER_USER) a reaktivovalo konto; správu robte v sekcii Používatelia
    return { ok: false, error: "Tento používateľ už je členom vašej firmy — spravujte ho v sekcii Používatelia." };
  }
  const company = await prisma.company.findUnique({ where: { id: user.companyId! }, select: { name: true } });
  const res = await inviteUser(normalizedEmail, String(input.name ?? "").trim() || null, "CUSTOMER_USER", user.companyId!, company?.name ?? "Moonid", { id: user.id, kind: "COMPANY_ADMIN" });
  if (!res.ok) return { ok: false, error: res.error };
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "MEMBER_INVITE", entity: "User", meta: { email: ev.data } });
  revalidatePath("/nastavenia");
  return { ok: true, warning: res.warning, inviteLink: null };
}

/** Opätovne odošle prístup členovi e-mailom; customer admin nikdy neuvidí bearer link. */
export async function resendMemberAccess(userId: string): Promise<{ ok: boolean; error?: string; warning?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };
  const member = await prisma.user.findFirst({
    where: { id: userId, companyId: user.companyId! },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!member || member.role !== "CUSTOMER_USER") return { ok: false, error: "Prístup možno takto odoslať iba členovi firmy." };
  if (!member.active) return { ok: false, error: "Deaktivované konto najprv aktivujte." };
  const company = await prisma.company.findUnique({ where: { id: user.companyId! }, select: { name: true } });
  const res = await inviteUser(
    member.email,
    member.name,
    "CUSTOMER_USER",
    user.companyId!,
    company?.name ?? "Moonid",
    { id: user.id, kind: "COMPANY_ADMIN" },
  );
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/nastavenia");
  return { ok: true, warning: res.warning };
}

const permSchema = z.object({ canOrderDirectly: z.boolean(), approverId: z.string().max(100).nullable() });

/** Nastaví právo člena: objednáva priamo, alebo objednávka ide na schválenie určenému schvaľovateľovi. */
export async function setMemberPermissions(userId: string, input: z.input<typeof permSchema>): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };
  const p = permSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Neplatný vstup." };
  const member = await prisma.user.findFirst({ where: { id: userId, companyId: user.companyId! }, select: { id: true, role: true } });
  if (!member) return { ok: false, error: "Člen neexistuje." };
  if (member.role === "CUSTOMER_ADMIN" && !p.data.canOrderDirectly) return { ok: false, error: "Správca firmy objednáva vždy priamo." };
  const approverId = p.data.canOrderDirectly ? null : p.data.approverId;
  if (!p.data.canOrderDirectly) {
    if (!approverId) return { ok: false, error: "Vyberte schvaľovateľa." };
    if (approverId === userId) return { ok: false, error: "Schvaľovateľ nemôže byť ten istý používateľ." };
    const appr = await prisma.user.findFirst({ where: { id: approverId, companyId: user.companyId!, active: true }, select: { id: true } });
    if (!appr) return { ok: false, error: "Neplatný schvaľovateľ." };
  }
  await prisma.user.update({ where: { id: userId }, data: { canOrderDirectly: p.data.canOrderDirectly, approverId } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "MEMBER_PERMISSIONS", entity: "User", entityId: userId, meta: { canOrderDirectly: p.data.canOrderDirectly, approverId } });
  revalidatePath("/nastavenia");
  return { ok: true };
}

/** Deaktivuje/reaktivuje člena. Nedovolí deaktivovať seba ani posledného aktívneho správcu. */
export async function setMemberActive(userId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const { user, err } = await requireCompanyAdmin();
  if (err) return { ok: false, error: err };
  if (!ID.safeParse(userId).success) return { ok: false, error: "Neplatný vstup." };
  if (userId === user.id) return { ok: false, error: "Nemôžete deaktivovať vlastné konto." };
  const member = await prisma.user.findFirst({ where: { id: userId, companyId: user.companyId! }, select: { id: true, role: true } });
  if (!member) return { ok: false, error: "Člen neexistuje." };
  if (!active && member.role === "CUSTOMER_ADMIN") {
    const admins = await prisma.user.count({ where: { companyId: user.companyId!, role: "CUSTOMER_ADMIN", active: true, id: { not: userId } } });
    if (admins === 0) return { ok: false, error: "Musí ostať aspoň jeden aktívny správca firmy." };
  }
  try {
    await prisma.user.update({ where: { id: userId }, data: { active: Boolean(active) } });
  } catch (error) {
    if (isLastCustomerAdminConstraint(error)) return { ok: false, error: "Musí ostať aspoň jeden aktívny správca firmy." };
    throw error;
  }
  if (!active) {
    // uvoľni ho ako schvaľovateľa iných členov — treba im prideliť nového (dovtedy schvaľuje správca)
    await prisma.user.updateMany({ where: { companyId: user.companyId!, approverId: userId }, data: { approverId: null } });
  }
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "MEMBER_ACTIVE", entity: "User", entityId: userId, meta: { active: Boolean(active) } });
  revalidatePath("/nastavenia");
  return { ok: true };
}

// ---------- Osobné konto (každý používateľ svoje) ----------

const profileSchema = z.object({ name: z.string().trim().min(1, "Zadajte meno").max(120) });

/** Upraví vlastné meno prihláseného používateľa (heslo mení klient cez Supabase). */
export async function updateProfile(input: z.input<typeof profileSchema>): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const p = profileSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Neplatný vstup." };
  await prisma.user.update({ where: { id: user.id }, data: { name: p.data.name } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "PROFILE_UPDATE", entity: "User", entityId: user.id });
  revalidatePath("/nastavenia");
  return { ok: true };
}
