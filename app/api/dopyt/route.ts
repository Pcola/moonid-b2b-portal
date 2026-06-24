import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";

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
  const origin = req.headers.get("origin");
  if (!origin) return true; // niektorí klienti Origin neposielajú — netvrdíme spam
  try {
    const o = new URL(origin).host;
    const host = req.headers.get("host");
    const site = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
    return o === host || o === site;
  } catch {
    return false;
  }
}

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export async function POST(req: Request) {
  if (!originOk(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  const d = parsed.data;

  // honeypot vyplnený → bot. Tvárime sa OK, ale nič neodošleme.
  if (d.web && d.web.trim()) return NextResponse.json({ ok: true });
  // GDPR súhlas je povinný
  if (!d.gdpr || d.gdpr === "false") return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });

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

  const res = await sendEmail({ to: STAFF_NOTIFY, subject, text: lines, replyTo: d.email });
  if (!res.ok && !res.skipped) return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  return NextResponse.json({ ok: true, note: res.skipped ? "logged" : undefined });
}
