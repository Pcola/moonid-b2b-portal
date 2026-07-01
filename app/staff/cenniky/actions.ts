"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1, "Zadajte názov úrovne").max(60),
  discountPct: z.coerce.number().min(0, "Zľava nemôže byť záporná").max(90, "Zľava max 90 %"),
});

/** Upraví cenovú úroveň (názov + %). POZOR: mení ceny VŠETKÝCH zákazníkov na tejto úrovni
 *  (cena = basePrice × (1 − discountPct)). Len STAFF; zmena ide do auditu. */
export async function updateTier(code: string, input: { name: string; discountPct: number }): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const c = String(code ?? "").trim().slice(0, 20);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };

  const tier = await prisma.priceTier.findUnique({ where: { code: c }, select: { discountPct: true } });
  if (!tier) return { ok: false, error: "Cenová úroveň neexistuje." };

  await prisma.priceTier.update({ where: { code: c }, data: { name: parsed.data.name, discountPct: parsed.data.discountPct } });
  await writeAudit({
    userId: staff.id, action: "PRICETIER_UPDATE", entity: "PriceTier", entityId: c,
    meta: { name: parsed.data.name, discountPct: parsed.data.discountPct, prevPct: Number(tier.discountPct) },
  });
  revalidatePath("/staff/cenniky");
  revalidatePath("/katalog"); // ceny zákazníkov sa počítajú z discountPct → prepočítať
  return { ok: true };
}

const createSchema = z.object({
  code: z.string().trim().min(1, "Zadajte kód").max(20).regex(/^[A-Za-z0-9_-]+$/, "Kód: len písmená, číslice, - a _"),
  name: z.string().trim().min(1, "Zadajte názov").max(60),
  discountPct: z.coerce.number().min(0, "Zľava nemôže byť záporná").max(90, "Zľava max 90 %"),
});

/** Vytvorí novú cenovú úroveň (napr. bespoke „VIP −25 %" pre konkrétneho zákazníka).
 *  Pricing sa resolvuje po tieroch → žiadna zmena money-path, len nová úroveň na priradenie. */
export async function createTier(input: z.input<typeof createSchema>): Promise<{ ok: boolean; error?: string; code?: string }> {
  const staff = await requireStaff();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };
  const code = parsed.data.code.toUpperCase();
  if (await prisma.priceTier.findUnique({ where: { code }, select: { code: true } })) {
    return { ok: false, error: "Úroveň s týmto kódom už existuje." };
  }
  await prisma.priceTier.create({ data: { code, name: parsed.data.name, discountPct: parsed.data.discountPct } });
  await writeAudit({ userId: staff.id, action: "PRICETIER_CREATE", entity: "PriceTier", entityId: code, meta: { name: parsed.data.name, discountPct: parsed.data.discountPct } });
  revalidatePath("/staff/cenniky");
  return { ok: true, code };
}

/** Zmaže cenovú úroveň — iba ak ju nemá priradený žiadny zákazník ani individuálne ceny. */
export async function deleteTier(code: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const c = String(code ?? "").trim().slice(0, 20);
  const tier = await prisma.priceTier.findUnique({ where: { code: c }, select: { id: true, _count: { select: { companies: true } } } });
  if (!tier) return { ok: false, error: "Úroveň neexistuje." };
  if (tier._count.companies > 0) return { ok: false, error: "Úroveň má priradených zákazníkov — najprv ich preraďte." };
  const priced = await prisma.productPrice.count({ where: { priceTierCode: c } });
  if (priced > 0) return { ok: false, error: "Úroveň má individuálne ceny produktov." };
  await prisma.priceTier.delete({ where: { code: c } });
  await writeAudit({ userId: staff.id, action: "PRICETIER_DELETE", entity: "PriceTier", entityId: c });
  revalidatePath("/staff/cenniky");
  return { ok: true };
}
