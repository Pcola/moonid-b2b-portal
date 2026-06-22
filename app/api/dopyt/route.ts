import { NextResponse } from "next/server";

// Príjem dopytu z kontaktného formulára.
// Ak je nastavený RESEND_API_KEY + RESEND_FROM, pošle e-mail; inak dopyt zaloguje
// (aby formulár fungoval aj pred zapojením Resend). Cieľ: moonid@moonid.sk.
const TO = "moonid@moonid.sk";

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

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM; // napr. "Moonid web <web@moonid.sk>" (overená doména)

  if (key && from) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(key);
      await resend.emails.send({
        from,
        to: TO,
        replyTo: d.email,
        subject,
        text: lines,
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[dopyt] resend error:", e);
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
    }
  }

  // Fallback kým nie je zapojený Resend — dopyt sa nestratí, zaloguje sa.
  console.log("[dopyt] (Resend nenastavený) nový dopyt:\n" + subject + "\n" + lines);
  return NextResponse.json({ ok: true, note: "logged" });
}
