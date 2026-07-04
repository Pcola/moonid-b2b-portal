import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice, type PricedLine } from "@/lib/pricing";
import { lineTotal, lineVat, sumMoney } from "@/lib/money";
import { Prisma } from "@prisma/client";

// Atomický get-or-create: 1 košík na firmu (Cart @@unique([companyId])). Nahrádza pôvodný
// findFirst+create, ktorý pri súbehu (dva taby/dvojklik) vytvoril 2 košíky → tichá strata položiek.
// Pri súbežnom create prehrá druhý na unique indexe (P2002) → jednoducho dočítame existujúci košík.
export async function getOrCreateCart(companyId: string, userId: string) {
  try {
    return await prisma.cart.upsert({
      where: { companyId },
      update: {},
      create: { companyId, createdById: userId },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.cart.findUnique({ where: { companyId }, select: { id: true } });
      if (existing) return existing;
    }
    throw e;
  }
}

export async function getCartCount(companyId: string): Promise<number> {
  const cart = await prisma.cart.findFirst({ where: { companyId }, select: { id: true } });
  if (!cart) return 0;
  const agg = await prisma.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { qty: true } });
  return Math.round(Number(agg._sum.qty ?? 0));
}

export type CartLine = {
  id: string; productId: string; slug: string; n: string; i: string; unit: string;
  qty: number; price: PricedLine; lineNet: number | null;
};
export type CartDetail = { items: CartLine[]; subtotalNet: number; vat: number; totalGross: number; hasOnRequest: boolean };

export async function getCartDetail(companyId: string, tierCode: string | null, discountPct: number): Promise<CartDetail> {
  const cart = await prisma.cart.findFirst({ where: { companyId }, select: { id: true } });
  if (!cart) return { items: [], subtotalNet: 0, vat: 0, totalGross: 0, hasOnRequest: false };
  const rows = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { id: "asc" },
    select: {
      id: true, qty: true,
      product: {
        select: {
          id: true, slug: true, name: true, nameDisplay: true, unit: true,
          basePrice: true, vatRate: true, isSubsidized: true,
          media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
          prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
        },
      },
    },
  });

  const lineNets: number[] = [], lineVats: number[] = [];
  let hasOnRequest = false;
  const items: CartLine[] = rows.map((row) => {
    const p = row.product;
    const qty = Number(row.qty);
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate),
      isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    let lineNet: number | null = null;
    if (price.kind === "PRICE") {
      lineNet = lineTotal(price.net, qty);
      lineNets.push(lineNet);
      lineVats.push(lineVat(price.net, price.gross, qty));
    } else {
      hasOnRequest = true;
    }
    return { id: row.id, productId: p.id, slug: p.slug ?? p.id, n: p.nameDisplay || p.name, i: p.media[0]?.storagePath ?? "", unit: p.unit, qty, price, lineNet };
  });

  const subtotalNet = sumMoney(lineNets);
  const vat = sumMoney(lineVats);
  return { items, subtotalNet, vat, totalGross: sumMoney([subtotalNet, vat]), hasOnRequest };
}
