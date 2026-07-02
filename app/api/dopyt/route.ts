import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { reportError } from "@/lib/observability";
import { PRIVACY_VERSION } from "@/lib/consent";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Príjem dopytu z kontaktného formulára. Validácia (zod + max dĺžky), kontrola Origin,
// honeypot proti botom, sanitizácia subjectu. Posiela cez centrálny lib/email (Resend);
// ak nie je nakonfigurovaný, dopyt sa zaloguje. Cieľ: STAFF_NOTIFY (moonid@moonid.sk).

const schema = z.object({
  meno: z.string().trim().min(2).max(120),
  firma: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160),
  telefon: z.string().trim().max(40).optional().default(""),
  lokalita: z.string().trim().max(120).optional().default(""),
  typ: z.string().trim().max(60).optional().default(""),
  segment: z.string().trim().max(80).optional().default(""),
  sprava: z.string().trim().max(4000).optional().default(""),
  gdpr: z.union([z.boolean(), z.string()]).optional(),
  web: z.string().optional(), // honeypot — ľudia ho nevidia, boti ho vyplnia
});

function originOk(req: Request): boolean {
  // Anti-CSRF: požaduj Origin alebo aspoň Referer zhodný s vlastným hostom/SITE_URL.
  // Prehliadačový fetch (kontaktný formulár) posiela Origin pri POST vždy; požiadavka
  // bez Origin aj Referer (holý skript) sa odmietne (SECURITY_AUDIT M-1).
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  let candidate: string | null = null;
  try {
    if (origin) candidate = new URL(origin).host;
    else if (referer) candidate = new URL(referer).host;
  } catch {
    return false;
  }
  if (!candidate) return false;
  const host = req.headers.get("host");
  const site = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
  return candidate === host || candidate === site;
}

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function POST(req: Request) {
  if (!originOk(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  // anti-abuse: max 5 dopytov / 10 min na IP (SECURITY_AUDIT M-1)
  const rl = await rateLimit(`dopyt:${clientIp(req.headers)}`, { limit: 5, windowSec: 600 });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  const d = parsed.data;

  // honeypot vyplnený → bot. Tvárime sa OK, ale nič neodošleme.
  if (d.web && d.web.trim()) return NextResponse.json({ ok: true });
  // GDPR súhlas je povinný
  if (!d.gdpr || d.gdpr === "false") return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });

  // záznam súhlasu do append-only auditu (preukázateľnosť: kto/kedy/akú verziu)
  await writeAudit({ action: "CONSENT", entity: "Dopyt", meta: { email: d.email, privacyVersion: PRIVACY_VERSION, basis: "kontaktny-formular" } });

  const subject = oneLine(`Nový dopyt z webu — ${d.firma} (${d.typ || "dopyt"})`);
  const lines = [
    `Meno: ${d.meno}`,
    `Firma / prevádzka: ${d.firma}`,
    `Lokalita: ${d.lokalita || "—"}`,
    `Typ dopytu: ${d.typ || "—"}`,
    `Segment: ${d.segment || "—"}`,
    `E-mail: ${d.email}`,
    `Telefón: ${d.telefon || "—"}`,
    "",
    "Správa:",
    d.sprava || "—",
  ].join("\n");

  // dopyt uložíme do DB PRED odoslaním e-mailu — aby sa lead nestratil, keď je Resend
  // neaktívny/nedostupný (e-mail je best-effort). Zlyhanie zápisu neprehltneme ticho.
  const inquiry = await prisma.inquiry
    .create({ data: { name: d.meno, company: d.firma, email: d.email, phone: d.telefon || null, location: d.lokalita || null, type: d.typ || null, segment: d.segment || null, message: d.sprava || null } })
    .catch((e) => { reportError("dopyt.persist", e, {}); return null; });

  const res = await sendEmail({ to: STAFF_NOTIFY, subject, text: lines, replyTo: d.email });
  if (inquiry && res.ok) await prisma.inquiry.update({ where: { id: inquiry.id }, data: { emailSent: true } }).catch(() => {});

  // úspech, ak sa dopyt aspoň uložil ALEBO odoslal; 502 len keď zlyhalo oboje
  if (!inquiry && !res.ok && !res.skipped) return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  return NextResponse.json({ ok: true, note: res.skipped ? "logged" : undefined });
}
