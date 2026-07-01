"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_BUCKET } from "@/lib/rehost-image";

const ID = z.string().min(1).max(100);

const editSchema = z.object({
  nameDisplay: z.string().trim().max(200).optional().or(z.literal("")),
  categoryId: z.string().trim().max(100).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(20),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  basePrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  vatRate: z.coerce.number().min(0).max(100),
  descriptionLong: z.string().trim().max(4000).optional().or(z.literal("")),
  isPublished: z.boolean(),
  isSubsidized: z.boolean(),
});

function revalidate(id: string) {
  revalidatePath("/staff/produkty");
  revalidatePath(`/staff/produkty/${id}`);
  revalidatePath("/katalog");
}

/** Úprava produktu (portál-strana: názov/kategória/publikovanie/obrázok…). Len STAFF.
 *  Pozn.: basePrice/vatRate sú editovateľné (zatiaľ niet Pohoda sync); po zavedení denného
 *  syncu sa cena/sklad budú ťahať z Pohody. sku sa nemení (identita/Pohoda kľúč). */
export async function updateProduct(id: string, input: z.input<typeof editSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Skontrolujte polia." };
  const d = parsed.data;

  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { ok: false, error: "Produkt neexistuje." };

  if (d.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: d.categoryId }, select: { id: true } });
    if (!cat) return { ok: false, error: "Neplatná kategória." };
  }

  await prisma.product.update({
    where: { id },
    data: {
      nameDisplay: d.nameDisplay?.trim() || null,
      categoryId: d.categoryId || null,
      unit: d.unit,
      brand: d.brand?.trim() || null,
      basePrice: d.basePrice ?? null,
      vatRate: d.vatRate,
      descriptionLong: d.descriptionLong?.trim() || null,
      isPublished: d.isPublished,
      isSubsidized: d.isSubsidized,
    },
  });
  await writeAudit({ userId: staff.id, action: "PRODUCT_UPDATE", entity: "Product", entityId: id, meta: { isPublished: d.isPublished } });
  revalidate(id);
  return { ok: true };
}

/** Rýchle publikovať/skryť zo zoznamu. */
export async function setProductPublished(id: string, value: boolean): Promise<{ ok: boolean }> {
  const staff = await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false };
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { ok: false };
  await prisma.product.update({ where: { id }, data: { isPublished: !!value } });
  await writeAudit({ userId: staff.id, action: "PRODUCT_PUBLISH", entity: "Product", entityId: id, meta: { isPublished: !!value } });
  revalidate(id);
  return { ok: true };
}

/** Nahrá/nahradí hlavný obrázok produktu (do vlastného Storage; nikdy externá URL). */
export async function updateProductImage(id: string, formData: FormData): Promise<{ ok: boolean; error?: string; url?: string }> {
  await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, nameDisplay: true } });
  if (!product) return { ok: false, error: "Produkt neexistuje." };

  const image = formData.get("image");
  if (!image || typeof image === "string" || image.size === 0) return { ok: false, error: "Vyberte obrázok." };
  const f = image as File;
  if (f.size > 5 * 1024 * 1024) return { ok: false, error: "Obrázok je príliš veľký (max 5 MB)." };
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)) {
    return { ok: false, error: "Nepovolený formát (JPG, PNG, WEBP, GIF)." };
  }

  const buf = Buffer.from(await f.arrayBuffer());
  const ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
  const admin = createAdminClient();
  const path = `manual-${id}.${ext}`;
  const { error } = await admin.storage.from(PRODUCT_BUCKET).upload(path, buf, { contentType: f.type, upsert: true });
  if (error) return { ok: false, error: "Nahrávanie zlyhalo." };
  const url = admin.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;

  // nahradí primárny obrázok
  await prisma.productMedia.deleteMany({ where: { productId: id, isPrimary: true } });
  await prisma.productMedia.create({ data: { productId: id, storagePath: url, isPrimary: true, alt: product.nameDisplay || product.name } });
  revalidate(id);
  return { ok: true, url };
}
