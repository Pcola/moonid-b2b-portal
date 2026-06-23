import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { PortalCatalog } from "./portal-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Katalóg — Moonid portál", robots: { index: false, follow: false } };

export default async function KatalogPage() {
  const user = await requireUser();
  const tierCode = user.company?.priceTier?.code ?? null;
  // discountPct si držíme LEN tu na serveri (nikdy nejde do user objektu/klienta)
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const rows = await prisma.product.findMany({
    where: { isPublished: true },
    select: {
      id: true, slug: true, name: true, nameDisplay: true, unit: true,
      basePrice: true, vatRate: true, isSubsidized: true, isStocked: true, stockCache: true,
      shelfStatus: true,
      category: { select: { name: true } },
      media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
      prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
    },
    orderBy: [{ shelfStatus: "asc" }, { name: "asc" }],
  });

  const items = rows
    .map((p) => {
      const tierUnitNet = p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null;
      const price = resolveUnitPrice({
        basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
        vatRate: Number(p.vatRate),
        isSubsidized: p.isSubsidized,
        tierUnitNet,
        discountPct,
      });
      return {
        id: p.id,
        slug: p.slug ?? p.id,
        n: p.nameDisplay || p.name,
        i: p.media[0]?.storagePath ?? "",
        c: p.category?.name ?? "Ostatné",
        unit: p.unit,
        stocked: p.isStocked && p.stockCache != null && Number(p.stockCache) > 0,
        price,
      };
    })
    .sort((a, b) => (b.i ? 1 : 0) - (a.i ? 1 : 0));

  const categories = Object.entries(
    items.reduce<Record<string, number>>((m, p) => { m[p.c] = (m[p.c] || 0) + 1; return m; }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return <PortalCatalog items={items} categories={categories} tierCode={tierCode} />;
}
