import { NextResponse } from "next/server";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";

// Príjem dopytu z kontaktného formulára.
// Posiela cez centrálny lib/email (Resend). Ak nie je nakonfigurovaný, dopyt sa zaloguje
// (aby formulár fungoval aj pred zapojením Resend). Cieľ: STAFF_NOTIFY (moonid@moonid.sk).

export async function POST(req: Request) {
  let d: Record<string, string> = {};
  try {
    d = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // základná validácia + anti-spam (honeypot je možné doplniť neskôr)
  if (!d.email || !d.meno || !d.firma || !d.gdpr) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });
  }

  const subject = `Nový dopyt z webu — ${d.firma} (${d.typ || "dopyt"})`;
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
  // sendEmail nehádže: ok=poslané, skipped=Resend nenastavený (zalogované), inak chyba odoslania
  if (!res.ok && !res.skipped) {
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, note: res.skipped ? "logged" : undefined });
}
