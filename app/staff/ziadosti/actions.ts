"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

export async function approveRequest(
  id: string,
  tierCode: string,
  splatDays: number
): Promise<{ ok: boolean; error?: string; inviteLink?: string | null }> {
  const staff = await requireStaff();
  const req = await prisma.accessRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") return { ok: false, error: "Žiadosť už nie je otvorená." };
  const tier = await prisma.priceTier.findFirst({ where: { code: tierCode } });
  if (!tier) return { ok: false, error: "Neznáma cenová úroveň." };

  // firma podľa IČO (existujúcu aktualizuje, novú založí)
  const company = await prisma.company.upsert({
    where: { ico: req.ico },
    update: { priceTierId: tier.id, splatDays },
    create: { ico: req.ico, name: req.companyName, priceTierId: tier.id, splatDays },
  });

  const admin = createAdminClient();
  const redirectTo = `${await origin()}/auth/callback?next=/nastav-heslo`;

  let authId: string | null = null;
  let inviteLink: string | null = null;

  const { data: gen, error: genErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email: req.email,
    options: { redirectTo },
  });
  if (gen?.user) {
    authId = gen.user.id;
    inviteLink = gen.properties?.action_link ?? null;
  } else {
    // konto už existuje → nájdi a vygeneruj recovery odkaz
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list.data.users.find((u) => u.email?.toLowerCase() === req.email.toLowerCase());
    if (!found) return { ok: false, error: "Nepodarilo sa vytvoriť konto: " + (genErr?.message ?? "neznáma chyba") };
    authId = found.id;
    const { data: rec } = await admin.auth.admin.generateLink({ type: "recovery", email: req.email, options: { redirectTo } });
    inviteLink = rec?.properties?.action_link ?? null;
  }

  await prisma.user.upsert({
    where: { email: req.email },
    update: { authId: authId!, role: "CUSTOMER_ADMIN", companyId: company.id, active: true },
    create: { authId: authId!, email: req.email, name: req.contactName, role: "CUSTOMER_ADMIN", companyId: company.id },
  });

  await prisma.accessRequest.update({
    where: { id },
    data: { status: "APPROVED", resolvedById: staff.id, resolvedAt: new Date(), companyId: company.id },
  });

  // POZN: zámerne NErevalidujeme — necháme kartu zobraziť pozvánkový odkaz staffovi.
  // Po refreshi žiadosť zmizne z PENDING zoznamu (je APPROVED).
  return { ok: true, inviteLink };
}

export async function rejectRequest(id: string): Promise<{ ok: boolean }> {
  const staff = await requireStaff();
  await prisma.accessRequest.update({
    where: { id },
    data: { status: "REJECTED", resolvedById: staff.id, resolvedAt: new Date() },
  });
  revalidatePath("/staff/ziadosti");
  return { ok: true };
}
