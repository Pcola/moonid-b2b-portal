"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, type SessionUser } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import { resolveUnitPrice } from "@/lib/pricing";
import { emailNewOrderToStaff, emailOrderConfirmation, emailApprovalRequest } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { reportError } from "@/lib/observability";
import { resolveOrderCharges } from "@/lib/store-config";
import { isInStock } from "@/lib/stock";
import { lineTotal as moneyLine, lineVat, sumMoney } from "@/lib/money";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

// vstupná validácia (A03 — zod na každom server action)
const ID = z.string().min(1).max(100);
const QTY = z.coerce.number().int().min(1).max(9999);

async function tierDiscount(tierCode: string | null): Promise<number> {
  if (!tierCode) return 0;
  const t = await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } });
  return Number(t?.discountPct ?? 0);
}

/** Komu poslať notifikáciu o objednávke na schválenie: určený schvaľovateľ (ak aktívny),
 *  inak všetci aktívni správcovia firmy (fallback, keď approver nie je nastavený). */
async function approverEmailsFor(approverId: string | null, companyId: string): Promise<string[]> {
  if (approverId) {
    const a = await prisma.user.findFirst({ where: { id: approverId, active: true }, select: { email: true } });
    if (a) return [a.email];
  }
  const admins = await prisma.user.findMany({ where: { companyId, role: "CUSTOMER_ADMIN", active: true }, select: { email: true } });
  return admins.map((x) => x.email);
}

/** Notifikuje schvaľovateľa o objednávke čakajúcej na schválenie (best-effort). Ak firma nemá
 *  žiadneho aktívneho schvaľovateľa/správcu, objednávka by inak „zamrzla" ticho → zalogujeme. */
async function notifyApprovalRequest(user: SessionUser, order: { id: string; number: string }, total: number, itemCount: number) {
  const to = await approverEmailsFor(user.approverId, user.companyId!);
  if (to.length) {
    await Promise.allSettled([
      emailApprovalRequest({ to, number: order.number, requesterName: user.name ?? user.email, companyName: user.company?.name, total, itemCount }),
    ]);
  } else {
    reportError("order.approval.no_approver", new Error("Objednávka čaká na schválenie, ale firma nemá aktívneho schvaľovateľa"), { orderId: order.id, companyId: user.companyId ?? undefined });
  }
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

// parse "SKU[,; tab/medzera]množstvo" na riadok → Map<sku, qty> (množstvo nepovinné = 1)
function parseSkuQty(raw: string): Map<string, number> {
  const bySku = new Map<string, number>();
  for (const line of String(raw ?? "").split(/\r?\n/).slice(0, 500)) {
    const parts = line.trim().split(/[,;\t]+|\s{2,}|\s+/).filter(Boolean);
    const sku = parts[0]?.trim().slice(0, 60);
    if (!sku) continue;
    const qty = Math.max(1, Math.min(9999, Math.floor(Number(parts[1] ?? "1")) || 1));
    bySku.set(sku, (bySku.get(sku) ?? 0) + qty);
  }
  return bySku;
}

type QuickResult = { ok: boolean; error?: string; added: { sku: string; name: string; qty: number }[]; notFound: string[]; onRequest: string[] };

/** Rýchla objednávka: vloží viacero položiek naraz podľa SKU (paste/CSV: "SKU, množstvo" na riadok). */
export async function quickAddToCart(raw: string): Promise<QuickResult> {
  const empty = { added: [], notFound: [], onRequest: [] };
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme.", ...empty };

  const bySku = parseSkuQty(raw);
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
type CreateOrderOpts = { note?: string; poNumber?: string | null; deliveryLocationId?: string | null; newAddress?: NewAddress | null; deliveryCode?: string | null; paymentCode?: string | null };

const newAddressSchema = z.object({
  label: z.string().trim().max(80).optional(),
  street: z.string().trim().min(2, "Zadajte ulicu a číslo").max(160),
  city: z.string().trim().min(1, "Zadajte mesto").max(80),
  zip: z.string().trim().min(3, "Zadajte PSČ").max(12),
});

export async function createOrder(opts?: string | CreateOrderOpts): Promise<{ ok: boolean; error?: string; number?: string; pendingApproval?: boolean }> {
  const o: CreateOrderOpts = typeof opts === "string" ? { note: opts } : (opts ?? {});
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const needsApproval = !user.canOrderDirectly; // reštrikčný user → objednávka ide na schválenie
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

  type Snap = { productId: string; skuSnapshot: string; pohodaSkuSnapshot: string | null; nameSnapshot: string; unitPriceSnapshot: number; costSnapshot: number | null; qty: number; lineTotal: number; fulfillment: "SKLADOM" | "NA_OBJEDNAVKU" };
  const items: Snap[] = [];
  const lineVats: number[] = [];
  let hasBackorder = false;

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
    const inStock = isInStock(p, qty, now.getTime()); // rovnaká podmienka ako badge v katalógu (lib/stock.ts)
    if (!inStock) hasBackorder = true;
    const lineTotal = moneyLine(price.net, qty);
    lineVats.push(lineVat(price.net, price.gross, qty));
    // most do Pohody: zamkni kód karty (len ak je most ACTIVE), inak null = nepôjde do Pohody
    const pohodaSku = p.pohodaLink && p.pohodaLink.linkStatus === "ACTIVE" ? p.pohodaLink.pohodaSku : null;
    items.push({
      productId: p.id, skuSnapshot: p.sku, pohodaSkuSnapshot: pohodaSku, nameSnapshot: p.nameDisplay || p.name,
      unitPriceSnapshot: price.net, costSnapshot: p.costPrice != null ? Number(p.costPrice) : null,
      qty, lineTotal, fulfillment: inStock ? "SKLADOM" : "NA_OBJEDNAVKU",
    });
  }
  const subtotal = sumMoney(items.map((it) => it.lineTotal));
  // poplatky: doprava (podľa prahu) + príplatok platby — server-side autorita (jediný zdroj pravdy)
  const charges = await resolveOrderCharges({ deliveryCode: o.deliveryCode, paymentCode: o.paymentCode, itemsNet: subtotal });
  // deliveryLocationId null = doručiť na fakturačnú adresu (platná voľba); osobný odber → bez adresy
  if (charges.delivery && !charges.delivery.requiresAddress) deliveryLocationId = null;
  const vat = sumMoney([...lineVats, charges.extrasVat]);
  const total = sumMoney([subtotal, charges.shippingFee, charges.paymentSurcharge, vat]);

  let order: { id: string; number: string } | null = null;
  try {
    order = await prisma.$transaction(async (tx) => {
    // delete-first guard: súbežná požiadavka (2 taby/dvojklik) — ak košík už bol spracovaný,
    // deleteMany vráti 0 (riadky sú zamknuté/zmazané) → neduplikujeme objednávku.
    const del = await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (del.count === 0) return null;
    const counter = await tx.orderCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } });
    const number = `WEB-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
    return tx.order.create({
      data: {
        number, companyId: user.companyId!, createdById: user.id,
        status: needsApproval ? "CAKA_SCHVALENIE" : "PRIJATA", pohodaSync: "LOKALNA", priceTierCode: tierCode ?? "—",
        hasBackorder, subtotal, vat, total, note: o.note?.trim().slice(0, 2000) || null,
        poNumber: o.poNumber?.trim().slice(0, 60) || null,
        deliveryLocationId, requestedDeliveryDate,
        deliveryMethodCode: charges.delivery?.code ?? null, deliveryMethodLabel: charges.delivery?.label ?? null, shippingFee: charges.shippingFee,
        paymentMethodCode: charges.payment?.code ?? null, paymentMethodLabel: charges.payment?.label ?? null, paymentSurcharge: charges.paymentSurcharge,
        items: { create: items.map((it) => ({ productId: it.productId, skuSnapshot: it.skuSnapshot, pohodaSkuSnapshot: it.pohodaSkuSnapshot, nameSnapshot: it.nameSnapshot, unitPriceSnapshot: it.unitPriceSnapshot, costSnapshot: it.costSnapshot, qty: it.qty, lineTotal: it.lineTotal, fulfillment: it.fulfillment })) },
        events: { create: { status: needsApproval ? "CAKA_SCHVALENIE" : "PRIJATA", source: "PORTAL", changedById: user.id } },
      },
      select: { id: true, number: true },
    });
    });
  } catch (e) {
    reportError("order.create", e, { companyId: user.companyId });
    return { ok: false, error: "Objednávku sa nepodarilo vytvoriť. Skúste to znova." };
  }
  if (!order) return { ok: false, error: "Košík bol medzičasom spracovaný — skontrolujte sekciu Objednávky." };

  await writeAudit({ userId: user.id, companyId: user.companyId, action: needsApproval ? "ORDER_PENDING_APPROVAL" : "ORDER_CREATE", entity: "Order", entityId: order.id, meta: { number: order.number, total } });
  // Pri priamej objednávke ide staffu hneď; pri schvaľovaní až po schválení (approveOrder → email).
  if (!needsApproval) {
    await Promise.allSettled([
      emailNewOrderToStaff({ number: order.number, companyName: user.company?.name, customerEmail: user.email, total, itemCount: items.length }),
      emailOrderConfirmation({ to: user.email, number: order.number, items: items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, lineTotal: it.lineTotal })), subtotal, vat, total }),
    ]);
  } else {
    // objednávka ide na schválenie — notifikuj schvaľovateľa (staff dostane e-mail až po schválení)
    await notifyApprovalRequest(user, order, total, items.length);
  }
  revalidatePath("/objednavky");
  revalidatePath("/kosik");
  return { ok: true, number: order.number, pendingApproval: needsApproval };
}

/** Skopíruje položky predošlej objednávky do košíka (opakovať objednávku). Preskočí
 *  nedostupné/„na vyžiadanie" produkty. IDOR: objednávka musí patriť firme usera. */
// ---------- Opakovanie objednávky: doobjednané sa stagujú v RepeatDraftItem (ODDELENÉ od košíka) ----------

/** Začne/reštartuje opakovanie: vyčistí doobjednané (draft) tohto usera, aby sa do opakovanej
 *  objednávky nedostalo nič staré/zabudnuté, a presmeruje na potvrdzovaciu obrazovku. Volá sa
 *  z tlačidiel „Opakovať poslednú objednávku" (dashboard, zoznam objednávok). */
export async function startRepeat(): Promise<void> {
  const user = await requireUser();
  if (user.companyId) await prisma.repeatDraftItem.deleteMany({ where: { userId: user.id } });
  revalidatePath("/objednavky/opakovat");
  redirect("/objednavky/opakovat");
}

/** Ako startRepeat, ale pre KONKRÉTNU objednávku (z detailu alebo zo zoznamu objednávok):
 *  vyčistí draft a presmeruje na potvrdzovaciu obrazovku s danou objednávkou ako zdrojom.
 *  Vlastníctvo objednávky (IDOR) overuje potvrdzovacia obrazovka pri načítaní (companyId filter). */
export async function startRepeatOrder(sourceOrderId: string): Promise<void> {
  const user = await requireUser();
  if (!ID.safeParse(sourceOrderId).success) redirect("/objednavky");
  if (user.companyId) await prisma.repeatDraftItem.deleteMany({ where: { userId: user.id } });
  revalidatePath("/objednavky/opakovat");
  redirect(`/objednavky/opakovat?source=${encodeURIComponent(sourceOrderId)}`);
}

/** Pridá produkt medzi doobjednané (draft) pri opakovaní — NIE do bežného košíka. */
export async function addToRepeatDraft(productId: string, qty = 1): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const pv = ID.safeParse(productId);
  const qv = QTY.safeParse(qty);
  if (!pv.success || !qv.success) return { ok: false, error: "Neplatný vstup." };
  productId = pv.data;
  const q = qv.data;

  const tierCode = user.company?.priceTier?.code ?? null;
  const p = await prisma.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { id: true, basePrice: true, vatRate: true, isSubsidized: true, prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } },
  });
  if (!p) return { ok: false, error: "Produkt nie je dostupný." };
  const price = resolveUnitPrice({
    basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
    vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
    tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
    discountPct: await tierDiscount(tierCode),
  });
  if (price.kind !== "PRICE") return { ok: false, error: "Tento produkt je na vyžiadanie — kontaktujte nás." };

  await prisma.repeatDraftItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, qty: q },
    update: { qty: { increment: q } },
  });
  revalidatePath("/objednavky/opakovat");
  return { ok: true };
}

/** Doobjednať podľa SKU (paste/CSV: „SKU, množstvo" na riadok) do draftu opakovania — NIE do košíka. */
export async function quickAddToRepeatDraft(raw: string): Promise<QuickResult> {
  const empty = { added: [], notFound: [], onRequest: [] };
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme.", ...empty };
  const bySku = parseSkuQty(raw);
  if (bySku.size === 0) return { ok: false, error: "Zadajte aspoň jeden riadok (SKU, množstvo).", ...empty };

  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);
  const products = await prisma.product.findMany({
    where: { sku: { in: [...bySku.keys()] }, isPublished: true },
    select: { id: true, sku: true, name: true, nameDisplay: true, basePrice: true, vatRate: true, isSubsidized: true, prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } },
  });
  const bySkuProduct = new Map(products.map((p) => [p.sku, p]));
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
    await prisma.repeatDraftItem.upsert({
      where: { userId_productId: { userId: user.id, productId: p.id } },
      create: { userId: user.id, productId: p.id, qty },
      update: { qty: { increment: qty } },
    });
    added.push({ sku, name: p.nameDisplay || p.name, qty });
  }
  revalidatePath("/objednavky/opakovat");
  return { ok: true, added, notFound, onRequest };
}

/** Odoberie položku z doobjednaných (draft). IDOR: musí patriť aktuálnemu userovi. */
export async function removeRepeatDraftItem(itemId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!ID.safeParse(itemId).success) return { ok: false };
  const item = await prisma.repeatDraftItem.findUnique({ where: { id: itemId }, select: { userId: true } });
  if (!item || item.userId !== user.id) return { ok: false };
  await prisma.repeatDraftItem.delete({ where: { id: itemId } });
  revalidatePath("/objednavky/opakovat");
  return { ok: true };
}

/** Zopakuje objednávku jedným potvrdením: zoberie položky z predošlej objednávky + doobjednané
 *  položky z draftu (SKU aj výber z katalógu), prepočíta aktuálne ceny/sklad a vytvorí novú
 *  objednávku (a vyčistí draft). Dodaciu adresu prevezme z predošlej. Nedostupné vynechá. */
export async function placeRepeatOrder(sourceOrderId: string, idempotencyKey?: string): Promise<{ ok: boolean; error?: string; number?: string; id?: string; pendingApproval?: boolean }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  if (!ID.safeParse(sourceOrderId).success) return { ok: false, error: "Neplatný vstup." };
  const needsApproval = !user.canOrderDirectly; // reštrikčný user → objednávka ide na schválenie
  // Idempotencia odoslania: kľúč z potvrdzovacej obrazovky (stabilný pre daný render), takže
  // dvojklik / dva taby / retry posielajú ten istý kľúč → 2. insert koliduje na unique indexe a
  // vrátime pôvodnú objednávku. Chýbajúci/neplatný kľúč (anomálny priamy call) → náhradný UUID:
  // flow funguje, len bez cross-request dedupu pre tento prípad.
  const idemKey = z.string().uuid().safeParse(idempotencyKey).success ? idempotencyKey! : randomUUID();

  const src = await prisma.order.findFirst({
    // IDOR: musí patriť firme; bežný člen naviac len vlastnú objednávku (nie kolegovu)
    where: { id: sourceOrderId, companyId: user.companyId, ...(user.role === "CUSTOMER_ADMIN" ? {} : { createdById: user.id }) },
    select: { id: true, note: true, deliveryLocationId: true, deliveryMethodCode: true, paymentMethodCode: true, items: { select: { productId: true, qty: true } } },
  });
  if (!src) return { ok: false, error: "Objednávka neexistuje." };

  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);
  // qty po productId: zdrojová objednávka + doobjednané položky z draftu (SKU aj výber z katalógu)
  const qtyByPid = new Map<string, number>();
  for (const it of src.items) if (it.productId) qtyByPid.set(it.productId, (qtyByPid.get(it.productId) ?? 0) + Math.floor(Number(it.qty)));
  const draft = await prisma.repeatDraftItem.findMany({ where: { userId: user.id }, select: { productId: true, qty: true } });
  for (const d of draft) qtyByPid.set(d.productId, (qtyByPid.get(d.productId) ?? 0) + Math.floor(Number(d.qty)));

  const products = await prisma.product.findMany({
    where: { id: { in: [...qtyByPid.keys()] }, isPublished: true },
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
  type Snap = { productId: string; skuSnapshot: string; pohodaSkuSnapshot: string | null; nameSnapshot: string; unitPriceSnapshot: number; costSnapshot: number | null; qty: number; lineTotal: number; fulfillment: "SKLADOM" | "NA_OBJEDNAVKU" };
  const items: Snap[] = [];
  const lineVats: number[] = [];
  let hasBackorder = false;

  for (const [productId, qtyRaw] of qtyByPid) {
    const p = byId.get(productId);
    if (!p) continue; // nepublikovaný/zmazaný → vynechá
    const qty = Math.floor(Number(qtyRaw));
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    if (price.kind !== "PRICE") continue; // na vyžiadanie → vynechá
    const inStock = isInStock(p, qty, now.getTime()); // rovnaká podmienka ako badge v katalógu (lib/stock.ts)
    if (!inStock) hasBackorder = true;
    const lineTotal = moneyLine(price.net, qty);
    lineVats.push(lineVat(price.net, price.gross, qty));
    const pohodaSku = p.pohodaLink && p.pohodaLink.linkStatus === "ACTIVE" ? p.pohodaLink.pohodaSku : null;
    items.push({ productId: p.id, skuSnapshot: p.sku, pohodaSkuSnapshot: pohodaSku, nameSnapshot: p.nameDisplay || p.name, unitPriceSnapshot: price.net, costSnapshot: p.costPrice != null ? Number(p.costPrice) : null, qty, lineTotal, fulfillment: inStock ? "SKLADOM" : "NA_OBJEDNAVKU" });
  }
  if (items.length === 0) return { ok: false, error: "Žiadna z položiek už nie je dostupná na objednanie." };
  const subtotal = sumMoney(items.map((it) => it.lineTotal));

  // dodacia adresa z predošlej objednávky (ak ešte existuje pre firmu)
  let deliveryLocationId: string | null = null;
  if (src.deliveryLocationId) {
    const loc = await prisma.deliveryLocation.findFirst({ where: { id: src.deliveryLocationId, companyId: user.companyId }, select: { id: true } });
    deliveryLocationId = loc?.id ?? null;
  }
  // doprava + platba: prevezmeme metódy z pôvodnej objednávky, dopravu prepočítame k aktuálnej hodnote
  const charges = await resolveOrderCharges({ deliveryCode: src.deliveryMethodCode, paymentCode: src.paymentMethodCode, itemsNet: subtotal });
  if (charges.delivery && !charges.delivery.requiresAddress) deliveryLocationId = null; // osobný odber → bez adresy
  const vat = sumMoney([...lineVats, charges.extrasVat]);
  const total = sumMoney([subtotal, charges.shippingFee, charges.paymentSurcharge, vat]);

  let order: { id: string; number: string };
  try {
    order = await prisma.$transaction(async (tx) => {
      await tx.repeatDraftItem.deleteMany({ where: { userId: user.id } }); // doobjednané sa premietli, draft vyčistený
      const counter = await tx.orderCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } });
      const number = `WEB-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
      return tx.order.create({
        data: {
          number, companyId: user.companyId!, createdById: user.id, idempotencyKey: idemKey,
          status: needsApproval ? "CAKA_SCHVALENIE" : "PRIJATA", pohodaSync: "LOKALNA", priceTierCode: tierCode ?? "—",
          hasBackorder, subtotal, vat, total, note: src.note?.trim().slice(0, 2000) || null, deliveryLocationId,
          deliveryMethodCode: charges.delivery?.code ?? null, deliveryMethodLabel: charges.delivery?.label ?? null, shippingFee: charges.shippingFee,
          paymentMethodCode: charges.payment?.code ?? null, paymentMethodLabel: charges.payment?.label ?? null, paymentSurcharge: charges.paymentSurcharge,
          items: { create: items.map((it) => ({ productId: it.productId, skuSnapshot: it.skuSnapshot, pohodaSkuSnapshot: it.pohodaSkuSnapshot, nameSnapshot: it.nameSnapshot, unitPriceSnapshot: it.unitPriceSnapshot, costSnapshot: it.costSnapshot, qty: it.qty, lineTotal: it.lineTotal, fulfillment: it.fulfillment })) },
          events: { create: { status: needsApproval ? "CAKA_SCHVALENIE" : "PRIJATA", source: "PORTAL", changedById: user.id } },
        },
        select: { id: true, number: true },
      });
    });
  } catch (e) {
    // Súbežný/duplicitný submit (dvojklik, dva taby, retry) s rovnakým idempotencyKey → unique index
    // odmietne 2. insert (transakcia sa vráti vrátane counter incrementu). Vrátime PÔVODNÚ objednávku
    // idempotentne — bez druhého e-mailu/auditu, takže nikdy nevzniknú dve identické objednávky.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey: idemKey }, select: { id: true, number: true } });
      if (existing) {
        revalidatePath("/objednavky");
        return { ok: true, number: existing.number, id: existing.id };
      }
    }
    reportError("order.repeat", e, { sourceOrderId, companyId: user.companyId });
    return { ok: false, error: "Objednávku sa nepodarilo vytvoriť. Skúste to znova." };
  }

  await writeAudit({ userId: user.id, companyId: user.companyId, action: needsApproval ? "ORDER_PENDING_APPROVAL" : "ORDER_CREATE", entity: "Order", entityId: order.id, meta: { number: order.number, total, repeatOf: src.id } });
  if (!needsApproval) {
    await Promise.allSettled([
      emailNewOrderToStaff({ number: order.number, companyName: user.company?.name, customerEmail: user.email, total, itemCount: items.length }),
      emailOrderConfirmation({ to: user.email, number: order.number, items: items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, lineTotal: it.lineTotal })), subtotal, vat, total }),
    ]);
  } else {
    // objednávka ide na schválenie — notifikuj schvaľovateľa (staff dostane e-mail až po schválení)
    await notifyApprovalRequest(user, order, total, items.length);
  }
  revalidatePath("/objednavky");
  revalidatePath("/objednavky/opakovat");
  return { ok: true, number: order.number, id: order.id, pendingApproval: needsApproval };
}
