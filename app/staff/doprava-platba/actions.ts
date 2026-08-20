"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const CODE = z.string().trim().min(1).max(30);

export type DeliveryInput = {
  label: string; description: string | null; enabled: boolean;
  requiresAddress: boolean; flatFee: number; freeThreshold: number | null;
};
export type PaymentInput = {
  label: string; description: string | null; enabled: boolean; surcharge: number;
};

const deliverySchema = z.object({
  label: z.string().trim().min(1, "Zadajte názov").max(60),
  description: z.string().trim().max(400).nullable(),
  enabled: z.boolean(),
  requiresAddress: z.boolean(),
  flatFee: z.coerce.number().min(0, "Poplatok nemôže byť záporný").max(9999),
  freeThreshold: z.coerce.number().min(0).max(999999).nullable(),
});

const paymentSchema = z.object({
  label: z.string().trim().min(1, "Zadajte názov").max(60),
  description: z.string().trim().max(400).nullable(),
  enabled: z.boolean(),
  surcharge: z.coerce.number().min(0, "Príplatok nemôže byť záporný").max(9999),
});

/** Upraví spôsob dopravy (názov, popis, zapnutie, poplatok, prah zdarma). Len ADMIN; audit. */
export async function updateDeliveryMethod(code: string, input: DeliveryInput): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireAdmin();
  const c = CODE.safeParse(code);
  if (!c.success) return { ok: false, error: "Neplatný kód." };
  const p = deliverySchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Neplatný vstup." };
  const exists = await prisma.deliveryMethod.findUnique({ where: { code: c.data }, select: { code: true } });
  if (!exists) return { ok: false, error: "Spôsob dopravy neexistuje." };
  if (!p.data.enabled) {
    const others = await prisma.deliveryMethod.count({ where: { enabled: true, code: { not: c.data } } });
    if (others === 0) return { ok: false, error: "Aspoň jeden spôsob dopravy musí ostať zapnutý." };
  }
  await prisma.deliveryMethod.update({
    where: { code: c.data },
    data: {
      label: p.data.label, description: p.data.description?.trim() || null,
      enabled: p.data.enabled, requiresAddress: p.data.requiresAddress,
      flatFee: p.data.flatFee, freeThreshold: p.data.freeThreshold,
    },
  });
  await writeAudit({ userId: staff.id, action: "DELIVERY_METHOD_UPDATE", entity: "DeliveryMethod", entityId: c.data, meta: { label: p.data.label, enabled: p.data.enabled, flatFee: p.data.flatFee, freeThreshold: p.data.freeThreshold } });
  revalidatePath("/staff/doprava-platba");
  revalidatePath("/kosik");
  return { ok: true };
}

/** Upraví spôsob platby (názov, popis, zapnutie, príplatok napr. dobierka). Len ADMIN; audit. */
export async function updatePaymentMethod(code: string, input: PaymentInput): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireAdmin();
  const c = CODE.safeParse(code);
  if (!c.success) return { ok: false, error: "Neplatný kód." };
  const p = paymentSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Neplatný vstup." };
  const exists = await prisma.paymentMethod.findUnique({ where: { code: c.data }, select: { code: true } });
  if (!exists) return { ok: false, error: "Spôsob platby neexistuje." };
  if (!p.data.enabled) {
    const others = await prisma.paymentMethod.count({ where: { enabled: true, code: { not: c.data } } });
    if (others === 0) return { ok: false, error: "Aspoň jeden spôsob platby musí ostať zapnutý." };
  }
  await prisma.paymentMethod.update({
    where: { code: c.data },
    data: { label: p.data.label, description: p.data.description?.trim() || null, enabled: p.data.enabled, surcharge: p.data.surcharge },
  });
  await writeAudit({ userId: staff.id, action: "PAYMENT_METHOD_UPDATE", entity: "PaymentMethod", entityId: c.data, meta: { label: p.data.label, enabled: p.data.enabled, surcharge: p.data.surcharge } });
  revalidatePath("/staff/doprava-platba");
  revalidatePath("/kosik");
  return { ok: true };
}
