"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import { resolveUnitPrice } from "@/lib/pricing";
import { emailNewOrderToStaff, emailOrderConfirmation } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

function r2(n: number) { return Math.round(n * 100) / 100; }

// vstupná validácia (A03 — zod na každom server action)
const ID = z.string().min(1).max(100);
const QTY = z.coerce.number().int().min(1).max(9999);

async function tierDiscount(tierCode: string | null): Promise<number> {
  if (!tierCode) return 0;
  const t = await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } });
  return Number(t?.discountPct ?? 0);
}

// overí, že CartItem patrí košíku firmy aktuálneho usera (IDOR ochrana)
async function ownItemOrNull(itemId: string, companyId: string) {
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, select: { id: true, cart: { select: { companyId: true } } } });
  if (!item || item.cart.companyId !== companyId) return null;
  return item;
}

export async function addToCart(productId: string, qty = 1): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const pv = ID.safeParse(productId);
  const qv = QTY.safeParse(qty);
  if (!pv.success || !qv.success) return { ok: false, error: "Neplatný vstup." };
  productId = pv.data;
  const q = qv.data;

  const p = await prisma.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { id: true, basePrice: true, vatRate: true, isSubsidized: true, prices: { where: { priceTierCode: user.company?.priceTier?.code ?? "__none__" }, take: 1, select: { unitPriceNet: true } } },
  });
  if (!p) return { ok: false, error: "Produkt nie je dostupný." };

  const price = resolveUnitPrice({
    basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
    vatRate: Number(p.vatRate),
    isSubsidized: p.isSubsidized,
    tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
    discountPct: await tierDiscount(user.company?.priceTier?.code ?? null),
  });
  if (price.kind !== "PRICE") return { ok: false, error: "Tento produkt je na vyžiadanie — kontaktujte nás." };

  const cart = await getOrCreateCart(user.companyId, user.id);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, qty: q },
    update: { qty: { increment: q } },
  });
  revalidatePath("/kosik");
  revalidatePath("/katalog");
  return { ok: true };
}

export async function setQty(itemId: string, qty: number): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false };
  if (!ID.safeParse(itemId).success) return { ok: false };
  const item = await ownItemOrNull(itemId, user.companyId);
  if (!item) return { ok: false };
  const q = Math.floor(qty);
  if (q <= 0) await prisma.cartItem.delete({ where: { id: itemId } });
  else await prisma.cartItem.update({ where: { id: itemId }, data: { qty: Math.min(9999, q) } });
  revalidatePath("/kosik");
  return { ok: true };
}

export async function removeItem(itemId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false };
  if (!ID.safeParse(itemId).success) return { ok: false };
  const item = await ownItemOrNull(itemId, user.companyId);
  if (!item) return { ok: false };
  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/kosik");
  return { ok: true };
}

type QuickResult = { ok: boolean; error?: string; added: { sku: string; name: string; qty: number }[]; notFound: string[]; onRequest: string[] };

/** Rýchla objednávka: vloží viacero položiek naraz podľa SKU (paste/CSV: "SKU, množstvo" na riadok). */
export async function quickAddToCart(raw: string): Promise<QuickResult> {
  const empty = { added: [], notFound: [], onRequest: [] };
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme.", ...empty };

  // parse: každý riadok "SKU[,; \t]množstvo" (množstvo nepovinné = 1); max 500 riadkov
  const bySku = new Map<string, number>();
  for (const line of String(raw ?? "").split(/\r?\n/).slice(0, 500)) {
    const parts = line.trim().split(/[,;\t]+|\s{2,}|\s+/).filter(Boolean);
    const sku = parts[0]?.trim().slice(0, 60);
    if (!sku) continue;
    const qty = Math.max(1, Math.min(9999, Math.floor(Number(parts[1] ?? "1")) || 1));
    bySku.set(sku, (bySku.get(sku) ?? 0) + qty);
  }
  if (bySku.size === 0) return { ok: false, error: "Zadajte aspoň jeden riadok (SKU, množstvo).", ...empty };

  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);
  const products = await prisma.product.findMany({
    where: { sku: { in: [...bySku.keys()] }, isPublished: true },
    select: { id: true, sku: true, name: true, nameDisplay: true, basePrice: true, vatRate: true, isSubsidized: true, prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } },
  });
  const bySkuProduct = new Map(products.map((p) => [p.sku, p]));

  const cart = await getOrCreateCart(user.companyId, user.id);
  const added: { sku: string; name: string; qty: number }[] = [];
  const notFound: string[] = [];
  const onRequest: string[] = [];

  for (const [sku, qty] of bySku) {
    const p = bySkuProduct.get(sku);
    if (!p) { notFound.push(sku); continue; }
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    if (price.kind !== "PRICE") { onRequest.push(sku); continue; }
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: p.id } },
      create: { cartId: cart.id, productId: p.id, qty },
      update: { qty: { increment: qty } },
    });
    added.push({ sku, name: p.nameDisplay || p.name, qty });
  }

  revalidatePath("/kosik");
  revalidatePath("/katalog");
  return { ok: true, added, notFound, onRequest };
}

type NewAddress = { label?: string; street: string; city: string; zip: string };
type CreateOrderOpts = { note?: string; deliveryLocationId?: string | null; newAddress?: NewAddress | null };

const newAddressSchema = z.object({
  label: z.string().trim().max(80).optional(),
  street: z.string().trim().min(2, "Zadajte ulicu a číslo").max(160),
  city: z.string().trim().min(1, "Zadajte mesto").max(80),
  zip: z.string().trim().min(3, "Zadajte PSČ").max(12),
});

export async function createOrder(opts?: string | CreateOrderOpts): Promise<{ ok: boolean; error?: string; number?: string }> {
  const o: CreateOrderOpts = typeof opts === "string" ? { note: opts } : (opts ?? {});
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);

  // dodacia adresa: nová (vytvorí sa pre firmu) alebo už uložená (IDOR check). Termín dodania
  // si zákazník nediktuje — rozvoz plánuje dodávateľ.
  let deliveryLocationId: string | null = null;
  const requestedDeliveryDate: Date | null = null;
  if (o.newAddress) {
    const av = newAddressSchema.safeParse(o.newAddress);
    if (!av.success) return { ok: false, error: av.error.issues[0]?.message ?? "Vyplňte dodaciu adresu." };
    const a = av.data;
    const count = await prisma.deliveryLocation.count({ where: { companyId: user.companyId } });
    const loc = await prisma.deliveryLocation.create({
      data: { companyId: user.companyId, label: a.label || "Dodacia adresa", street: a.street, city: a.city, zip: a.zip, isDefault: count === 0 },
      select: { id: true },
    });
    deliveryLocationId = loc.id;
  } else if (o.deliveryLocationId) {
    const loc = await prisma.deliveryLocation.findFirst({ where: { id: o.deliveryLocationId, companyId: user.companyId }, select: { id: true } });
    if (!loc) return { ok: false, error: "Neplatná dodacia adresa." };
    deliveryLocationId = loc.id;
  }

  const cart = await prisma.cart.findFirst({ where: { companyId: user.companyId }, select: { id: true } });
  if (!cart) return { ok: false, error: "Košík je prázdny." };
  const rows = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: {
      qty: true,
      product: {
        select: {
          id: true, sku: true, name: true, nameDisplay: true,
          basePrice: true, costPrice: true, vatRate: true, isSubsidized: true,
          isStocked: true, stockCache: true, stockSyncedAt: true,
          prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
          pohodaLink: { select: { pohodaSku: true, linkStatus: true } },
        },
      },
    },
  });
  if (!rows.length) return { ok: false, error: "Košík je prázdny." };

  const now = new Date();
  const year = now.getFullYear();
  const FRESH_MS = 48 * 3600 * 1000;

  type Snap = { productId: string; skuSnapshot: string; pohodaSkuSnapshot: string | null; nameSnapshot: string; unitPriceSnapshot: number; costSnapshot: number | null; qty: number; lineTotal: number; fulfillment: "SKLADOM" | "NA_OBJEDNAVKU" };
  const items: Snap[] = [];
  let subtotal = 0, vat = 0, hasBackorder = false;

  for (const row of rows) {
    const p = row.product;
    const qty = Math.floor(Number(row.qty));
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate),
      isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    if (price.kind !== "PRICE") {
      return { ok: false, error: `Položka „${p.nameDisplay || p.name}" je na vyžiadanie — odoberte ju z košíka alebo nás kontaktujte.` };
    }
    const fresh = !!p.stockSyncedAt && now.getTime() - p.stockSyncedAt.getTime() < FRESH_MS;
    const inStock = p.isStocked && p.stockCache != null && Number(p.stockCache) >= qty && fresh;
    if (!inStock) hasBackorder = true;
    const lineTotal = r2(price.net * qty);
    subtotal += lineTotal;
    vat += r2((price.gross - price.net) * qty);
    // most do Pohody: zamkni kód karty (len ak je most ACTIVE), inak null = nepôjde do Pohody
    const pohodaSku = p.pohodaLink && p.pohodaLink.linkStatus === "ACTIVE" ? p.pohodaLink.pohodaSku : null;
    items.push({
      productId: p.id, skuSnapshot: p.sku, pohodaSkuSnapshot: pohodaSku, nameSnapshot: p.nameDisplay || p.name,
      unitPriceSnapshot: price.net, costSnapshot: p.costPrice != null ? Number(p.costPrice) : null,
      qty, lineTotal, fulfillment: inStock ? "SKLADOM" : "NA_OBJEDNAVKU",
    });
  }
  subtotal = r2(subtotal); vat = r2(vat);
  const total = r2(subtotal + vat);

  const order = await prisma.$transaction(async (tx) => {
    // delete-first guard: súbežná požiadavka (2 taby/dvojklik) — ak košík už bol spracovaný,
    // deleteMany vráti 0 (riadky sú zamknuté/zmazané) → neduplikujeme objednávku.
    const del = await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (del.count === 0) return null;
    const counter = await tx.orderCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } });
    const number = `WEB-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
    return tx.order.create({
      data: {
        number, companyId: user.companyId!, createdById: user.id,
        status: "PRIJATA", pohodaSync: "LOKALNA", priceTierCode: tierCode ?? "—",
        hasBackorder, subtotal, vat, total, note: o.note?.trim().slice(0, 2000) || null,
        deliveryLocationId, requestedDeliveryDate,
        items: { create: items.map((it) => ({ productId: it.productId, skuSnapshot: it.skuSnapshot, pohodaSkuSnapshot: it.pohodaSkuSnapshot, nameSnapshot: it.nameSnapshot, unitPriceSnapshot: it.unitPriceSnapshot, costSnapshot: it.costSnapshot, qty: it.qty, lineTotal: it.lineTotal, fulfillment: it.fulfillment })) },
        events: { create: { status: "PRIJATA", source: "PORTAL", changedById: user.id } },
      },
      select: { id: true, number: true },
    });
  });
  if (!order) return { ok: false, error: "Košík bol medzičasom spracovaný — skontrolujte sekciu Objednávky." };

  await writeAudit({ userId: user.id, companyId: user.companyId, action: "ORDER_CREATE", entity: "Order", entityId: order.id, meta: { number: order.number, total } });
  // e-maily — best-effort, nikdy nezhodia objednávku (sendEmail nehádže)
  await Promise.allSettled([
    emailNewOrderToStaff({ number: order.number, companyName: user.company?.name, customerEmail: user.email, total, itemCount: items.length }),
    emailOrderConfirmation({ to: user.email, number: order.number, items: items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, lineTotal: it.lineTotal })), subtotal, vat, total }),
  ]);
  revalidatePath("/objednavky");
  revalidatePath("/kosik");
  return { ok: true, number: order.number };
}

/** Skopíruje položky predošlej objednávky do košíka (opakovať objednávku). Preskočí
 *  nedostupné/„na vyžiadanie" produkty. IDOR: objednávka musí patriť firme usera. */
export async function reorderFromOrder(orderId: string): Promise<{ ok: boolean; error?: string; added?: number; skipped?: number }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  if (!ID.safeParse(orderId).success) return { ok: false, error: "Neplatný vstup." };

  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId: user.companyId },
    select: { id: true, items: { select: { productId: true, qty: true } } },
  });
  if (!order) return { ok: false, error: "Objednávka neexistuje." };

  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);
  const productIds = order.items.map((i) => i.productId).filter((x): x is string => !!x);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isPublished: true },
    select: { id: true, basePrice: true, vatRate: true, isSubsidized: true, prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const cart = await getOrCreateCart(user.companyId, user.id);
  let added = 0, skipped = 0;
  for (const it of order.items) {
    const p = it.productId ? byId.get(it.productId) : undefined;
    if (!p) { skipped++; continue; } // nepublikovaný / zmazaný
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    if (price.kind !== "PRICE") { skipped++; continue; } // na vyžiadanie
    const q = Math.max(1, Math.min(9999, Math.floor(Number(it.qty))));
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: p.id } },
      create: { cartId: cart.id, productId: p.id, qty: q },
      update: { qty: { increment: q } },
    });
    added++;
  }
  revalidatePath("/kosik");
  revalidatePath("/katalog");
  return { ok: true, added, skipped };
}

/** Zopakuje objednávku jedným potvrdením: zoberie položky + dodaciu adresu z predošlej
 *  objednávky, prepočíta aktuálne ceny/sklad a vytvorí novú objednávku (bez košíka, bez
 *  vypĺňania). Nedostupné/„na vyžiadanie" položky vynechá. */
export async function placeRepeatOrder(sourceOrderId: string): Promise<{ ok: boolean; error?: string; number?: string; id?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  if (!ID.safeParse(sourceOrderId).success) return { ok: false, error: "Neplatný vstup." };

  const src = await prisma.order.findFirst({
    where: { id: sourceOrderId, companyId: user.companyId }, // IDOR: musí patriť firme
    select: { id: true, note: true, deliveryLocationId: true, items: { select: { productId: true, qty: true } } },
  });
  if (!src) return { ok: false, error: "Objednávka neexistuje." };

  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);
  const productIds = src.items.map((i) => i.productId).filter((x): x is string => !!x);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isPublished: true },
    select: {
      id: true, sku: true, name: true, nameDisplay: true,
      basePrice: true, costPrice: true, vatRate: true, isSubsidized: true,
      isStocked: true, stockCache: true, stockSyncedAt: true,
      prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
      pohodaLink: { select: { pohodaSku: true, linkStatus: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const now = new Date();
  const year = now.getFullYear();
  const FRESH_MS = 48 * 3600 * 1000;
  type Snap = { productId: string; skuSnapshot: string; pohodaSkuSnapshot: string | null; nameSnapshot: string; unitPriceSnapshot: number; costSnapshot: number | null; qty: number; lineTotal: number; fulfillment: "SKLADOM" | "NA_OBJEDNAVKU" };
  const items: Snap[] = [];
  let subtotal = 0, vat = 0, hasBackorder = false;

  for (const it of src.items) {
    const p = it.productId ? byId.get(it.productId) : undefined;
    if (!p) continue; // nepublikovaný/zmazaný → vynechá
    const qty = Math.floor(Number(it.qty));
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    if (price.kind !== "PRICE") continue; // na vyžiadanie → vynechá
    const fresh = !!p.stockSyncedAt && now.getTime() - p.stockSyncedAt.getTime() < FRESH_MS;
    const inStock = p.isStocked && p.stockCache != null && Number(p.stockCache) >= qty && fresh;
    if (!inStock) hasBackorder = true;
    const lineTotal = r2(price.net * qty);
    subtotal += lineTotal;
    vat += r2((price.gross - price.net) * qty);
    const pohodaSku = p.pohodaLink && p.pohodaLink.linkStatus === "ACTIVE" ? p.pohodaLink.pohodaSku : null;
    items.push({ productId: p.id, skuSnapshot: p.sku, pohodaSkuSnapshot: pohodaSku, nameSnapshot: p.nameDisplay || p.name, unitPriceSnapshot: price.net, costSnapshot: p.costPrice != null ? Number(p.costPrice) : null, qty, lineTotal, fulfillment: inStock ? "SKLADOM" : "NA_OBJEDNAVKU" });
  }
  if (items.length === 0) return { ok: false, error: "Žiadna z položiek už nie je dostupná na objednanie." };
  subtotal = r2(subtotal); vat = r2(vat);
  const total = r2(subtotal + vat);

  // dodacia adresa z predošlej objednávky (ak ešte existuje pre firmu)
  let deliveryLocationId: string | null = null;
  if (src.deliveryLocationId) {
    const loc = await prisma.deliveryLocation.findFirst({ where: { id: src.deliveryLocationId, companyId: user.companyId }, select: { id: true } });
    deliveryLocationId = loc?.id ?? null;
  }

  const order = await prisma.$transaction(async (tx) => {
    const counter = await tx.orderCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } });
    const number = `WEB-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
    return tx.order.create({
      data: {
        number, companyId: user.companyId!, createdById: user.id,
        status: "PRIJATA", pohodaSync: "LOKALNA", priceTierCode: tierCode ?? "—",
        hasBackorder, subtotal, vat, total, note: src.note?.trim().slice(0, 2000) || null, deliveryLocationId,
        items: { create: items.map((it) => ({ productId: it.productId, skuSnapshot: it.skuSnapshot, pohodaSkuSnapshot: it.pohodaSkuSnapshot, nameSnapshot: it.nameSnapshot, unitPriceSnapshot: it.unitPriceSnapshot, costSnapshot: it.costSnapshot, qty: it.qty, lineTotal: it.lineTotal, fulfillment: it.fulfillment })) },
        events: { create: { status: "PRIJATA", source: "PORTAL", changedById: user.id } },
      },
      select: { id: true, number: true },
    });
  });

  await writeAudit({ userId: user.id, companyId: user.companyId, action: "ORDER_CREATE", entity: "Order", entityId: order.id, meta: { number: order.number, total, repeatOf: src.id } });
  await Promise.allSettled([
    emailNewOrderToStaff({ number: order.number, companyName: user.company?.name, customerEmail: user.email, total, itemCount: items.length }),
    emailOrderConfirmation({ to: user.email, number: order.number, items: items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, lineTotal: it.lineTotal })), subtotal, vat, total }),
  ]);
  revalidatePath("/objednavky");
  return { ok: true, number: order.number, id: order.id };
}
