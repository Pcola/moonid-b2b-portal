"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";

// Copy-on-confirm: pri potvrdení zhody sa obsah zdroja JEDNORAZOVO skopíruje do Product
// (len ak je pole prázdne — manuálne/existujúce hodnoty vyhrávajú). Re-import feedu
// Product už neprepíše. Žiadny nočný projekčný engine.
export async function confirmMatch(sourceId: string) {
  await requireStaff(); // server action si rolu MUSÍ overiť sama (layout chráni len render)
  const src = await prisma.productSource.findUnique({
    where: { id: sourceId },
    include: { product: { include: { media: true } } },
  });
  if (!src || !src.productId || !src.product) return;
  const p = src.product;

  const data: { descriptionLong?: string; brand?: string; ean?: string } = {};
  if (!p.descriptionLong && src.descriptionLong) data.descriptionLong = src.descriptionLong;
  if (!p.brand && src.brand) data.brand = src.brand;
  if (!p.ean && src.ean) data.ean = src.ean;
  if (Object.keys(data).length) {
    await prisma.product.update({ where: { id: p.id }, data });
  }

  // obrázok → ProductMedia (len ak produkt nemá primárny a zdroj má URL)
  const hasPrimary = p.media.some((m) => m.isPrimary);
  if (!hasPrimary && src.imageUrl) {
    await prisma.productMedia.create({
      data: { productId: p.id, storagePath: src.imageUrl, isPrimary: true, alt: p.nameDisplay || p.name },
    });
  }

  await prisma.productSource.update({
    where: { id: sourceId },
    data: { matchStatus: "CONFIRMED", matchedAt: new Date() },
  });
  revalidatePath("/staff/katalog");
}

// REJECT necháva productId vyplnené → matcher nenavrhne tú istú dvojicu znova.
export async function rejectMatch(sourceId: string) {
  await requireStaff();
  await prisma.productSource.update({
    where: { id: sourceId },
    data: { matchStatus: "REJECTED", matchedAt: new Date() },
  });
  revalidatePath("/staff/katalog");
}

export async function togglePublish(productId: string, value: boolean) {
  await requireStaff();
  await prisma.product.update({ where: { id: productId }, data: { isPublished: value } });
  revalidatePath("/staff/katalog");
}
