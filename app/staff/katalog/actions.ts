"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rehostImage, PRODUCT_BUCKET } from "@/lib/rehost-image";

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
    // obrázok re-hostujeme do vlastného Storage — nikdy neukladáme dodávateľskú URL
    const hosted = await rehostImage(createAdminClient(), src.imageUrl, `prod-${p.id}`);
    if (hosted) {
      await prisma.productMedia.create({
        data: { productId: p.id, storagePath: hosted, isPrimary: true, alt: p.nameDisplay || p.name },
      });
    }
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

function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

// Manuálne pridanie produktu (origin=MANUAL → Pohoda reconcile ho nearchivuje).
// Obrázok sa nahráva priamo do vlastného Storage (žiadna externá URL).
export async function createProduct(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireStaff();

  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const unit = (String(formData.get("unit") ?? "ks").trim() || "ks").slice(0, 20);
  const basePriceRaw = String(formData.get("basePrice") ?? "").trim().replace(",", ".");
  const vatRaw = String(formData.get("vatRate") ?? "23").trim().replace(",", ".");
  const descriptionLong = String(formData.get("descriptionLong") ?? "").trim().slice(0, 4000) || null;
  const isSubsidized = formData.get("isSubsidized") != null;
  const isPublished = formData.get("isPublished") != null;
  const image = formData.get("image");

  if (name.length < 2) return { ok: false, error: "Zadajte názov (min. 2 znaky)." };
  if (sku.length < 1 || sku.length > 60) return { ok: false, error: "Zadajte SKU (1–60 znakov)." };
  const basePrice = basePriceRaw ? Number(basePriceRaw) : null;
  if (basePriceRaw && (!Number.isFinite(basePrice) || (basePrice as number) < 0)) return { ok: false, error: "Neplatná cena." };
  const vatRate = Number(vatRaw);
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return { ok: false, error: "Neplatná sadzba DPH." };

  if (await prisma.product.findUnique({ where: { sku }, select: { id: true } })) {
    return { ok: false, error: "Produkt s týmto SKU už existuje." };
  }

  const product = await prisma.product.create({
    data: {
      sku, origin: "MANUAL", name, nameDisplay: name, categoryId, unit,
      basePrice: basePrice ?? undefined, vatRate, descriptionLong, isSubsidized, isPublished,
      slug: `${slugify(name)}-${slugify(sku)}`.slice(0, 80),
    },
  });

  if (image && typeof image !== "string" && image.size > 0) {
    const file = image as File;
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
    const admin = createAdminClient();
    const { error } = await admin.storage.from(PRODUCT_BUCKET).upload(`manual-${product.id}.${ext}`, buf, { contentType: file.type || "image/jpeg", upsert: true });
    if (!error) {
      const url = admin.storage.from(PRODUCT_BUCKET).getPublicUrl(`manual-${product.id}.${ext}`).data.publicUrl;
      await prisma.productMedia.create({ data: { productId: product.id, storagePath: url, isPrimary: true, alt: name } });
    }
  }

  revalidatePath("/staff/katalog");
  revalidatePath("/katalog");
  revalidatePath("/produkty");
  return { ok: true, id: product.id };
}
