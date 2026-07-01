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
