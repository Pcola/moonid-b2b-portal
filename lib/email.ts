import "server-only";

// Centrálne odosielanie e-mailov cez Resend. Best-effort: NIKDY nehádže výnimku
// (objednávka sa nesmie zrušiť kvôli e-mailu) a ak nie je nakonfigurované
// (RESEND_API_KEY + RESEND_FROM), len zaloguje a pokračuje.

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM; // napr. "Moonid <web@moonid.sk>" — OVERENÁ doména
/** Interná adresa pre notifikácie staffu o nových objednávkach. */
export const STAFF_NOTIFY = process.env.STAFF_NOTIFY_EMAIL || "moonid@moonid.sk";

export function isEmailConfigured(): boolean {
  return !!(KEY && FROM);
}

/** Escapuje HTML špeciálne znaky — pre user-controlled hodnoty v e-mailových šablónach. */
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Maskuje e-mail pre logy (PII): jan@firma.sk → j**@firma.sk */
function maskEmail(e: string): string {
  const [u, d] = String(e).split("@");
  if (!d) return "***";
  return `${u.slice(0, 1)}**@${d}`;
}

type SendArgs = { to: string | string[]; subject: string; text: string; html?: string; replyTo?: string };

/** Odošle e-mail. Vráti {ok}; pri nenastavení/chybe nehádže, len zaloguje. */
export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!KEY || !FROM) {
    const to = Array.isArray(args.to) ? args.to.map(maskEmail).join(", ") : maskEmail(args.to);
    console.log(`[email] Resend nenastavený — skipnuté: "${args.subject}" → ${to}`);
    return { ok: false, skipped: true };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(KEY);
    await resend.emails.send({
      from: FROM, to: args.to, subject: args.subject,
      text: args.text, html: args.html, replyTo: args.replyTo,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send error:", e);
    return { ok: false };
  }
}

// ---------- formátovanie ----------

const eur = (n: number) => `${n.toFixed(2)} €`;

const STATUS_SK: Record<string, string> = {
  PRIJATA: "Prijatá",
  POTVRDENA: "Potvrdená",
  PRIPRAVUJE: "Pripravuje sa",
  NA_CESTE: "Na ceste",
  DORUCENA: "Doručená",
  STORNO: "Stornovaná",
};

function wrapHtml(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="font-size:18px;font-weight:700;padding:16px 0;border-bottom:2px solid #0ea5a4">Moonid s.r.o.</div>
  <h2 style="font-size:18px;margin:24px 0 8px">${title}</h2>
  ${bodyHtml}
  <p style="color:#6b7280;font-size:12px;margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px">
    Moonid s.r.o. — hygiena, čistenie a vybavenie pre prevádzky. Tento e-mail bol odoslaný automaticky.</p>
</div>`;
}

type OrderLine = { name: string; qty: number; lineTotal: number };

/** Notifikácia STAFFU o novej objednávke (interná). */
export async function emailNewOrderToStaff(o: {
  number: string; companyName?: string | null; customerEmail: string; total: number; itemCount: number;
}) {
  const text = [
    `Nová objednávka ${o.number}`,
    `Firma: ${o.companyName ?? "—"}`,
    `Zákazník: ${o.customerEmail}`,
    `Položiek: ${o.itemCount}`,
    `Spolu s DPH: ${eur(o.total)}`,
    "",
    "Spracuj ju v /staff/objednavky.",
  ].join("\n");
  return sendEmail({ to: STAFF_NOTIFY, subject: `Nová objednávka ${o.number} — ${o.companyName ?? o.customerEmail}`, text, replyTo: o.customerEmail });
}

/** Potvrdenie objednávky ZÁKAZNÍKOVI. */
export async function emailOrderConfirmation(o: {
  to: string; number: string; items: OrderLine[]; subtotal: number; vat: number; total: number;
}) {
  const rows = o.items.map((i) => `${i.qty}× ${i.name} — ${eur(i.lineTotal)}`).join("\n");
  const text = [
    `Ďakujeme za objednávku ${o.number}.`,
    "",
    rows,
    "",
    `Medzisúčet: ${eur(o.subtotal)}`,
    `DPH: ${eur(o.vat)}`,
    `Spolu s DPH: ${eur(o.total)}`,
    "",
    "Objednávku spracujeme a o ďalších krokoch vás budeme informovať.",
  ].join("\n");
  const htmlRows = o.items.map((i) =>
    `<tr><td style="padding:4px 0">${i.qty}× ${esc(i.name)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${eur(i.lineTotal)}</td></tr>`).join("");
  const html = wrapHtml(`Ďakujeme za objednávku ${esc(o.number)}`, `
    <table style="width:100%;border-collapse:collapse;font-size:14px">${htmlRows}
      <tr><td style="padding-top:10px;border-top:1px solid #e5e7eb">Medzisúčet</td><td style="padding-top:10px;border-top:1px solid #e5e7eb;text-align:right">${eur(o.subtotal)}</td></tr>
      <tr><td>DPH</td><td style="text-align:right">${eur(o.vat)}</td></tr>
      <tr><td style="font-weight:700">Spolu s DPH</td><td style="font-weight:700;text-align:right">${eur(o.total)}</td></tr>
    </table>
    <p style="font-size:14px;margin-top:16px">Objednávku spracujeme a o ďalších krokoch vás budeme informovať.</p>`);
  return sendEmail({ to: o.to, subject: `Potvrdenie objednávky ${o.number} — Moonid`, text, html });
}

/** Notifikácia ZÁKAZNÍKOVI o zmene stavu objednávky. */
export async function emailOrderStatus(o: { to: string; number: string; status: string; note?: string | null }) {
  const label = STATUS_SK[o.status] ?? o.status;
  const text = [
    `Stav objednávky ${o.number}: ${label}.`,
    o.note ? `\nPoznámka: ${o.note}` : "",
    "\nĎakujeme, že nakupujete u Moonid.",
  ].join("");
  const html = wrapHtml(`Objednávka ${esc(o.number)}: ${esc(label)}`,
    `<p style="font-size:14px">Stav vašej objednávky <strong>${esc(o.number)}</strong> sa zmenil na <strong>${esc(label)}</strong>.</p>
     ${o.note ? `<p style="font-size:14px;color:#374151">${esc(o.note)}</p>` : ""}`);
  return sendEmail({ to: o.to, subject: `Objednávka ${o.number}: ${label} — Moonid`, text, html });
}
