"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import { resolveUnitPrice } from "@/lib/pricing";
import { emailNewOrderToStaff, emailOrderConfirmation } from "@/lib/email";

function r2(n: number) { return Math.round(n * 100) / 100; }

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
  const q = Math.max(1, Math.min(9999, Math.floor(qty)));

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
  const item = await ownItemOrNull(itemId, user.companyId);
  if (!item) return { ok: false };
  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/kosik");
  return { ok: true };
}

export async function createOrder(note?: string): Promise<{ ok: boolean; error?: string; number?: string }> {
  const user = await requireUser();
  if (!user.companyId) return { ok: false, error: "Konto nie je priradené k firme." };
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = await tierDiscount(tierCode);

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
    const counter = await tx.orderCounter.upsert({ where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } } });
    const number = `WEB-${year}-${String(counter.lastSeq).padStart(5, "0")}`;
    const created = await tx.order.create({
      data: {
        number, companyId: user.companyId!, createdById: user.id,
        status: "PRIJATA", pohodaSync: "LOKALNA", priceTierCode: tierCode ?? "—",
        hasBackorder, subtotal, vat, total, note: note?.trim() || null,
        items: { create: items.map((it) => ({ productId: it.productId, skuSnapshot: it.skuSnapshot, pohodaSkuSnapshot: it.pohodaSkuSnapshot, nameSnapshot: it.nameSnapshot, unitPriceSnapshot: it.unitPriceSnapshot, costSnapshot: it.costSnapshot, qty: it.qty, lineTotal: it.lineTotal, fulfillment: it.fulfillment })) },
        events: { create: { status: "PRIJATA", source: "PORTAL", changedById: user.id } },
      },
      select: { id: true, number: true },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  await prisma.auditLog.create({ data: { userId: user.id, action: "ORDER_CREATE", entity: "Order", entityId: order.id, meta: { number: order.number, total } } });
  // e-maily — best-effort, nikdy nezhodia objednávku (sendEmail nehádže)
  await Promise.allSettled([
    emailNewOrderToStaff({ number: order.number, companyName: user.company?.name, customerEmail: user.email, total, itemCount: items.length }),
    emailOrderConfirmation({ to: user.email, number: order.number, items: items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, lineTotal: it.lineTotal })), subtotal, vat, total }),
  ]);
  revalidatePath("/objednavky");
  revalidatePath("/kosik");
  return { ok: true, number: order.number };
}
