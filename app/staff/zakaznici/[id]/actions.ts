"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const ID = z.string().min(1).max(100);

const companySchema = z.object({
  name: z.string().trim().min(2, "Zadajte názov firmy").max(160),
  dic: z.string().trim().max(20).optional().or(z.literal("")),
  icDph: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  priceTierCode: z.string().trim().min(1, "Zvoľte cenovú úroveň").max(20),
  splatDays: z.coerce.number().int().min(0, "Min. 0").max(365, "Max. 365"),
  active: z.boolean(),
});

/** Úprava firemných údajov, cenovej úrovne, splatnosti a aktivity. Iba STAFF. */
export async function updateCompany(companyId: string, input: unknown): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(companyId).success) return { ok: false, error: "Neplatný vstup." };
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte polia." };
  const d = parsed.data;

  const tier = await prisma.priceTier.findUnique({ where: { code: d.priceTierCode }, select: { id: true } });
  if (!tier) return { ok: false, error: "Neznáma cenová úroveň." };

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: d.name, dic: d.dic || null, icDph: d.icDph || null,
      address: d.address || null, city: d.city || null,
      priceTierId: tier.id, splatDays: d.splatDays, active: d.active,
    },
  });
  await writeAudit({ userId: staff.id, companyId, action: "COMPANY_UPDATE", entity: "Company", entityId: companyId, meta: { tier: d.priceTierCode, splatDays: d.splatDays, active: d.active } });
  revalidatePath(`/staff/zakaznici/${companyId}`);
  revalidatePath("/staff/zakaznici");
  return { ok: true };
}

const locationSchema = z.object({
  label: z.string().trim().min(1, "Zadajte označenie").max(80),
  street: z.string().trim().min(2, "Zadajte ulicu").max(160),
  city: z.string().trim().min(1, "Zadajte mesto").max(80),
  zip: z.string().trim().min(3, "Zadajte PSČ").max(12),
});

/** Pridá dodaciu adresu firme. Iba STAFF. */
export async function addDeliveryLocation(companyId: string, input: unknown): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(companyId).success) return { ok: false, error: "Neplatný vstup." };
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte polia." };
  const a = parsed.data;
  const count = await prisma.deliveryLocation.count({ where: { companyId } });
  await prisma.deliveryLocation.create({ data: { companyId, label: a.label, street: a.street, city: a.city, zip: a.zip, isDefault: count === 0 } });
  await writeAudit({ userId: staff.id, companyId, action: "DELIVERY_LOCATION_ADD", entity: "Company", entityId: companyId, meta: { label: a.label } });
  revalidatePath(`/staff/zakaznici/${companyId}`);
  return { ok: true };
}

/** Odoberie dodaciu adresu. Iba STAFF. */
export async function removeDeliveryLocation(locationId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(locationId).success) return { ok: false, error: "Neplatný vstup." };
  const loc = await prisma.deliveryLocation.findUnique({ where: { id: locationId }, select: { id: true, companyId: true } });
  if (!loc) return { ok: false, error: "Adresa neexistuje." };
  await prisma.deliveryLocation.delete({ where: { id: locationId } });
  await writeAudit({ userId: staff.id, companyId: loc.companyId, action: "DELIVERY_LOCATION_REMOVE", entity: "Company", entityId: loc.companyId, meta: { locationId } });
  revalidatePath(`/staff/zakaznici/${loc.companyId}`);
  return { ok: true };
}
