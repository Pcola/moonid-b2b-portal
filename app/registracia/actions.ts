"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { PRIVACY_VERSION } from "@/lib/consent";

const schema = z.object({
  ico: z.string().trim().min(6, "Neplatné IČO").max(12),
  companyName: z.string().trim().min(2, "Zadajte názov firmy").max(160),
  contactName: z.string().trim().min(2, "Zadajte meno").max(120),
  email: z.string().trim().email("Neplatný e-mail").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  gdpr: z.any().optional(), // súhlas so spracovaním OÚ (checkbox)
  hp: z.string().optional(), // honeypot
});

export async function createAccessRequest(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte vyplnené polia." };
  }
  const d = parsed.data;
  // honeypot vyplnený → bot. Tvárime sa OK, ale žiadosť nezakladáme.
  if (d.hp && d.hp.trim()) return { ok: true };
  // súhlas so spracovaním OÚ je povinný — overené aj server-side, nielen v UI
  if (!d.gdpr) return { ok: false, error: "Potvrďte súhlas so spracovaním údajov." };
  const req = await prisma.accessRequest.create({
    data: {
      ico: d.ico,
      companyName: d.companyName,
      contactName: d.contactName,
      email: d.email,
      phone: d.phone || null,
      note: d.note || null,
    },
  });

  // záznam súhlasu do append-only auditu (GDPR čl. 7 — preukázateľnosť: kto/kedy/akú verziu)
  await writeAudit({ action: "CONSENT", entity: "AccessRequest", entityId: req.id, meta: { email: d.email, privacyVersion: PRIVACY_VERSION, basis: "registracia-pristup" } });

  // notifikuj Moonid o novej žiadosti (best-effort, nikdy nehádže)
  const portal = process.env.NEXT_PUBLIC_SITE_URL ?? "https://moonid-b2b-portal.vercel.app";
  await sendEmail({
    to: STAFF_NOTIFY,
    subject: `Nová žiadosť o prístup — ${d.companyName}`,
    replyTo: d.email,
    text: [
      "Nová žiadosť o prístup do B2B portálu:",
      "",
      `Firma:    ${d.companyName} (IČO ${d.ico})`,
      `Kontakt:  ${d.contactName} <${d.email}>${d.phone ? ", tel. " + d.phone : ""}`,
      d.note ? `Poznámka: ${d.note}` : "",
      "",
      `Spracovať: ${portal}/staff/ziadosti`,
    ].filter(Boolean).join("\n"),
  });

  return { ok: true };
}
