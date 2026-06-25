"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";

/** GDPR čl. 15/20 — právo na prístup a prenosnosť: export údajov firmy do JSON. */
export async function exportMyData(): Promise<{ ok: boolean; data?: string; error?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const cid = user.companyId;

  const [company, users, orders, invoices, locations] = await Promise.all([
    prisma.company.findUnique({ where: { id: cid }, select: { name: true, ico: true, dic: true, icDph: true, address: true, city: true, splatDays: true, createdAt: true, priceTier: { select: { code: true, name: true } } } }),
    prisma.user.findMany({ where: { companyId: cid }, select: { email: true, name: true, role: true, lastLoginAt: true, createdAt: true } }),
    prisma.order.findMany({ where: { companyId: cid }, orderBy: { createdAt: "desc" }, select: { number: true, status: true, createdAt: true, subtotal: true, vat: true, total: true, note: true, items: { select: { nameSnapshot: true, qty: true, unitPriceSnapshot: true, lineTotal: true } } } }),
    prisma.invoice.findMany({ where: { companyId: cid }, orderBy: { issuedAt: "desc" }, select: { pohodaNumber: true, status: true, issuedAt: true, dueAt: true, total: true } }),
    prisma.deliveryLocation.findMany({ where: { companyId: cid }, select: { label: true, street: true, city: true, zip: true } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    poznamka: "Export osobných a firemných údajov vedených v B2B portáli Moonid (GDPR čl. 15/20).",
    konto: { email: user.email, meno: user.name, rola: user.role },
    firma: company,
    pouzivatelia: users,
    objednavky: orders,
    faktury: invoices,
    dodacieAdresy: locations,
  };

  await writeAudit({ userId: user.id, companyId: cid, action: "GDPR_ACCESS", entity: "Company", entityId: cid });
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
