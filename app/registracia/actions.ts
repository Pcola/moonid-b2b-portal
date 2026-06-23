"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ico: z.string().trim().min(6, "Neplatné IČO").max(12),
  companyName: z.string().trim().min(2, "Zadajte názov firmy"),
  contactName: z.string().trim().min(2, "Zadajte meno"),
  email: z.string().trim().email("Neplatný e-mail"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function createAccessRequest(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte vyplnené polia." };
  }
  const d = parsed.data;
  await prisma.accessRequest.create({
    data: {
      ico: d.ico,
      companyName: d.companyName,
      contactName: d.contactName,
      email: d.email,
      phone: d.phone || null,
      note: d.note || null,
    },
  });
  return { ok: true };
}
