import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { PortalCatalog } from "./portal-catalog";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Katalóg — Moonid portál", robots: { index: false, follow: false } };

const PAGE = 24;
type SP = { q?: string; cat?: string; brand?: string; stock?: string; kind?: string; sort?: string; page?: string };
type Active = { q: string; cat: string; brand: string; stock: string; kind: string; sort: string };

// where so VŠETKÝMI aktívnymi filtrami OKREM `exclude` (pre faceted counts)
function buildWhere(a: Active, exclude: string | null): Prisma.ProductWhereInput {
  // listing zobrazí 1 kartu na skupinu: default variant alebo samostatný produkt
  const and: Prisma.ProductWhereInput[] = [{ OR: [{ variantGroupId: null }, { isDefaultVariant: true }] }];
  if (a.q && exclude !== "q") and.push({ OR: [{ name: { contains: a.q, mode: "insensitive" } }, { nameDisplay: { contains: a.q, mode: "insensitive" } }] });
  const w: Prisma.ProductWhereInput = { isPublished: true, AND: and };
  if (a.cat && exclude !== "cat") w.category = { name: a.cat };
  if (a.brand && exclude !== "brand") w.brand = a.brand;
  if (a.stock === "1" && exclude !== "stock") w.isStocked = true;
  if (a.kind && exclude !== "kind") w.productKind = a.kind as Prisma.EnumProductKindFilter["equals"];
  return w;
}

export default async function KatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const tierCode = user.company?.priceTier?.code ?? null;
  // discountPct LEN na serveri (nikdy do klienta)
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const a: Active = {
    q: (sp.q ?? "").trim(), cat: sp.cat ?? "", brand: sp.brand ?? "",
    stock: sp.stock === "1" ? "1" : "", kind: sp.kind ?? "", sort: sp.sort ?? "rec",
  };
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = buildWhere(a, null);
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    a.sort === "az" ? [{ name: "asc" }] : [{ shelfStatus: "asc" }, { media: { _count: "desc" } }, { name: "asc" }];

  const [rows, total, catRows, brandRows, kindRows, stockCount, allCats] = await Promise.all([
    prisma.product.findMany({
      where, orderBy, take: PAGE, skip: (page - 1) * PAGE,
      select: {
        id: true, slug: true, name: true, nameDisplay: true, unit: true,
        basePrice: true, vatRate: true, isSubsidized: true, isStocked: true, stockCache: true,
        category: { select: { name: true } },
        media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
        prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ["categoryId"], where: buildWhere(a, "cat"), _count: { _all: true } }),
    prisma.product.groupBy({ by: ["brand"], where: { ...buildWhere(a, "brand"), brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } }, take: 18 }),
    prisma.product.groupBy({ by: ["productKind"], where: buildWhere(a, "kind"), _count: { _all: true } }),
    prisma.product.count({ where: { ...buildWhere(a, "stock"), isStocked: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const catName = new Map(allCats.map((c) => [c.id, c.name]));
  const categories = catRows
    .filter((r) => r.categoryId && catName.get(r.categoryId))
    .map((r) => ({ name: catName.get(r.categoryId!)!, count: r._count._all }))
    .sort((x, y) => y.count - x.count);
  const brands = brandRows.filter((r) => r.brand).map((r) => ({ name: r.brand!, count: r._count._all }));
  const KIND_LABEL: Record<string, string> = { CONSUMABLE: "Spotrebný materiál", DISPENSER: "Dávkovače", EQUIPMENT: "Vybavenie" };
  const kinds = kindRows.map((r) => ({ value: r.productKind, label: KIND_LABEL[r.productKind] ?? r.productKind, count: r._count._all }));

  const items = rows.map((p) => {
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate),
      isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    return {
      id: p.id, slug: p.slug ?? p.id, n: p.nameDisplay || p.name,
      i: p.media[0]?.storagePath ?? "", c: p.category?.name ?? "Ostatné", unit: p.unit,
      stocked: p.isStocked && p.stockCache != null && Number(p.stockCache) > 0, price,
    };
  });

  return (
    <PortalCatalog
      items={items} tierCode={tierCode}
      total={total} page={page} pageSize={PAGE}
      facets={{ categories, brands, kinds, stockCount }}
      active={a}
    />
  );
}
