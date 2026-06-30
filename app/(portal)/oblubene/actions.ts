"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ID = z.string().min(1).max(100);

/** Pridá/odoberie produkt z obľúbených firmy (zdieľané medzi používateľmi firmy). */
export async function toggleFavorite(productId: string): Promise<{ ok: boolean; favorited?: boolean; error?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  if (!ID.safeParse(productId).success) return { ok: false, error: "Neplatný vstup." };

  const existing = await prisma.favorite.findUnique({
    where: { companyId_productId: { companyId: user.companyId, productId } },
    select: { id: true },
  });
  let favorited: boolean;
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    favorited = false;
  } else {
    const p = await prisma.product.findFirst({ where: { id: productId, isPublished: true }, select: { id: true } });
    if (!p) return { ok: false, error: "Produkt nie je dostupný." };
    await prisma.favorite.create({ data: { companyId: user.companyId, productId, createdById: user.id } });
    favorited = true;
  }
  revalidatePath("/oblubene");
  revalidatePath("/katalog");
  return { ok: true, favorited };
}
