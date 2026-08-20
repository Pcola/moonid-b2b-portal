"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rehostImage, PRODUCT_BUCKET } from "@/lib/rehost-image";
import { writeAudit } from "@/lib/audit";
import { normalizeImageFile, type NormalizedImage } from "@/lib/safe-image";

// Copy-on-confirm: pri potvrdení zhody sa obsah zdroja JEDNORAZOVO skopíruje do Product
// (len ak je pole prázdne — manuálne/existujúce hodnoty vyhrávajú). Re-import feedu
// Product už neprepíše. Žiadny nočný projekčný engine.
export async function confirmMatch(sourceId: string) {
  const staff = await requireStaff(); // server action si rolu MUSÍ overiť sama (layout chráni len render)
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
  await writeAudit({ userId: staff.id, action: "CATALOG_MATCH_CONFIRM", entity: "ProductSource", entityId: sourceId, meta: { productId: src.productId } });
  revalidatePath("/staff/katalog");
}

// REJECT necháva productId vyplnené → matcher nenavrhne tú istú dvojicu znova.
export async function rejectMatch(sourceId: string) {
  const staff = await requireStaff();
  await prisma.productSource.update({
    where: { id: sourceId },
    data: { matchStatus: "REJECTED", matchedAt: new Date() },
  });
  await writeAudit({ userId: staff.id, action: "CATALOG_MATCH_REJECT", entity: "ProductSource", entityId: sourceId });
  revalidatePath("/staff/katalog");
}

// Vyhľadá Pohoda produkty pre manuálny picker (podľa názvu/SKU).
export async function searchPohodaProducts(q: string): Promise<{ id: string; sku: string; name: string }[]> {
  await requireStaff();
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return [];
  const rows = await prisma.product.findMany({
    where: {
      origin: "POHODA",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { nameDisplay: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, sku: true, name: true, nameDisplay: true },
    take: 20,
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({ id: r.id, sku: r.sku, name: r.nameDisplay || r.name }));
}

// Manuálne napárovanie feed položky na konkrétny Pohoda produkt + potvrdenie
// (skopíruje obrázok do Storage + popis cez confirmMatch). matchMethod=MANUAL.
export async function manualPair(sourceId: string, productId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const prod = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!prod) return { ok: false, error: "Vybraný Pohoda produkt neexistuje." };
  await prisma.productSource.update({
    where: { id: sourceId },
    data: { productId, matchMethod: "MANUAL", matchScore: null },
  });
  await writeAudit({ userId: staff.id, action: "CATALOG_MANUAL_PAIR", entity: "ProductSource", entityId: sourceId, meta: { productId } });
  await confirmMatch(sourceId); // copy-on-confirm: obrázok (re-host) + popis + CONFIRMED
  return { ok: true };
}

function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

// Manuálne pridanie produktu (origin=MANUAL → Pohoda reconcile ho nearchivuje).
// Obrázok sa nahráva priamo do vlastného Storage (žiadna externá URL).
export async function createProduct(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const staff = await requireStaff();

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

  // validácia uploadu pred vytvorením (žiadny orphan produkt pri zlom obrázku)
  let safeImage: NormalizedImage | null = null;
  if (image && typeof image !== "string" && image.size > 0) {
    try { safeImage = await normalizeImageFile(image as File); }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Neplatný obrázok." }; }
  }

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

  if (safeImage) {
    const admin = createAdminClient();
    const path = `manual-${product.id}.${safeImage.extension}`;
    const { error } = await admin.storage.from(PRODUCT_BUCKET).upload(path, safeImage.buffer, { contentType: safeImage.contentType, upsert: true });
    if (!error) {
      const url = admin.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
      await prisma.productMedia.create({ data: { productId: product.id, storagePath: url, isPrimary: true, alt: name } });
    }
  }

  await writeAudit({ userId: staff.id, action: "PRODUCT_CREATE", entity: "Product", entityId: product.id, meta: { sku } });
  revalidatePath("/staff/katalog");
  revalidatePath("/katalog");
  revalidatePath("/produkty");
  return { ok: true, id: product.id };
}
