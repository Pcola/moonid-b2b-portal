"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail, STAFF_NOTIFY } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { PRIVACY_VERSION } from "@/lib/consent";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

const schema = z.object({
  ico: z.string().trim().min(6, "Neplatné IČO").max(12),
  companyName: z.string().trim().min(2, "Zadajte názov firmy").max(160),
  contactName: z.string().trim().min(2, "Zadajte meno").max(120),
  email: z.string().trim().email("Neplatný e-mail").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
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
  // anti-abuse: max 5 žiadostí / hod na IP (SECURITY_AUDIT M-1)
  const rl = await rateLimit(rateLimitKey("access-req", clientIp(await headers())), { limit: 5, windowSec: 3600 });
  if (!rl.ok) return { ok: false, error: "Priveľa pokusov. Skúste o chvíľu znova." };

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

  // Dôkaz, aká privacy notice bola pri zbere poskytnutá. Nejde o súhlas.
  await writeAudit({ action: "PRIVACY_NOTICE_PROVIDED", entity: "AccessRequest", entityId: req.id, meta: { privacyVersion: PRIVACY_VERSION, context: "registracia-pristup" } });

  // notifikuj Moonid o novej žiadosti (best-effort, nikdy nehádže)
  const portal = SITE_URL;
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
