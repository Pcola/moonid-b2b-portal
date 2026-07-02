import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { PortalCatalog } from "./portal-catalog";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Katalóg — Moonid portál", robots: { index: false, follow: false } };

const PAGE = 24;
type SP = { q?: string; cat?: string; sub?: string; brand?: string; stock?: string; sort?: string; page?: string; from?: string; pmin?: string; pmax?: string };
type Active = { q: string; cat: string; sub: string; brand: string; stock: string; sort: string; pmin: string; pmax: string };

// where so VŠETKÝMI aktívnymi filtrami OKREM `exclude` (pre faceted counts).
// Kategória = strom: categoryId (úroveň 1) + subcategoryId (úroveň 2, dieťa categoryId).
function buildWhere(a: Active, exclude: string | null, catId: string | null, subId: string | null, priceMin: number | null, priceMax: number | null): Prisma.ProductWhereInput {
  // listing zobrazí 1 kartu na skupinu: default variant alebo samostatný produkt
  const and: Prisma.ProductWhereInput[] = [{ OR: [{ variantGroupId: null }, { isDefaultVariant: true }] }];
  // hľadá aj podľa kódu (SKU) a EAN — B2B zákazník objednáva podľa kódu z faktúry/etikety
  if (a.q && exclude !== "q") and.push({ OR: [
    { name: { contains: a.q, mode: "insensitive" } },
    { nameDisplay: { contains: a.q, mode: "insensitive" } },
    { sku: { contains: a.q, mode: "insensitive" } },
    { ean: { contains: a.q, mode: "insensitive" } },
  ] });
  const w: Prisma.ProductWhereInput = { isPublished: true, AND: and };
  if (catId && exclude !== "cat") w.categoryId = catId;
  if (subId && exclude !== "sub") w.subcategoryId = subId;
  if (a.brand && exclude !== "brand") w.brand = a.brand;
  if (a.stock === "1" && exclude !== "stock") w.isStocked = true;
  // cenový rozsah (priceMin/priceMax sú už prepočítané na basePrice cez tier zľavu)
  if ((priceMin != null || priceMax != null) && exclude !== "price") {
    const bp: Prisma.DecimalFilter = {};
    if (priceMin != null) bp.gte = priceMin;
    if (priceMax != null) bp.lte = priceMax;
    w.basePrice = bp;
  }
  return w;
}

export default async function KatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const a: Active = {
    q: (sp.q ?? "").trim().slice(0, 120), cat: (sp.cat ?? "").slice(0, 80), sub: (sp.sub ?? "").slice(0, 80), brand: (sp.brand ?? "").slice(0, 60),
    stock: sp.stock === "1" ? "1" : "", sort: sp.sort ?? "rec",
    pmin: (sp.pmin ?? "").replace(/[^\d.,]/g, "").slice(0, 12), pmax: (sp.pmax ?? "").replace(/[^\d.,]/g, "").slice(0, 12),
  };
  // cena filter: zákazník zadáva svoju (zľavnenú) cenu; prepočítame na basePrice cez tier zľavu
  const div = 1 - discountPct / 100;
  const num = (s: string) => { const n = parseFloat(s.replace(",", ".")); return isNaN(n) ? null : n; };
  const priceMin = div > 0 && num(a.pmin) != null ? num(a.pmin)! / div : null;
  const priceMax = div > 0 && num(a.pmax) != null ? num(a.pmax)! / div : null;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // strom kategórií — načítame vopred, aby sme názvy filtrov preložili na id (categoryId/subcategoryId)
  const allCats = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const catId = a.cat ? (allCats.find((c) => !c.parentId && c.name === a.cat)?.id ?? null) : null;
  const subId = a.sub && catId ? (allCats.find((c) => c.parentId === catId && c.name === a.sub)?.id ?? null) : null;

  const where = buildWhere(a, null, catId, subId, priceMin, priceMax);
  // cena: triedime podľa basePrice (jednotná tier zľava zachováva poradie; ProductPrice overrides
  // sú prázdne). nulls:"last" → položky „na vyžiadanie" (basePrice null) idú na koniec pri oboch smeroch.
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    a.sort === "az" ? [{ name: "asc" }]
    : a.sort === "price-asc" ? [{ basePrice: { sort: "asc", nulls: "last" } }, { name: "asc" }]
    : a.sort === "price-desc" ? [{ basePrice: { sort: "desc", nulls: "last" } }, { name: "asc" }]
    : [{ shelfStatus: "asc" }, { media: { _count: "desc" } }, { name: "asc" }];

  const [rows, total, catRows, subRows, brandRows, stockCount] = await Promise.all([
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
    // hlavné kategórie (úroveň 1) — počty vrátane podkategórií (produkty držia categoryId aj keď majú subcategoryId)
    prisma.product.groupBy({ by: ["categoryId"], where: buildWhere(a, "cat", null, null, priceMin, priceMax), _count: { _all: true } }),
    // počty VŠETKÝCH podkategórií (pre rozklikávací strom — nezávisle od vybranej hlavnej kategórie)
    prisma.product.groupBy({ by: ["subcategoryId"], where: { ...buildWhere(a, "cat", null, null, priceMin, priceMax), subcategoryId: { not: null } }, _count: { _all: true } }),
    prisma.product.groupBy({ by: ["brand"], where: { ...buildWhere(a, "brand", catId, subId, priceMin, priceMax), brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } }, take: 60 }),
    prisma.product.count({ where: { ...buildWhere(a, "stock", catId, subId, priceMin, priceMax), isStocked: true } }),
  ]);

  // poskladáme strom: hlavné kategórie (s produktmi) + ich rozklikávacie podkategórie
  const catCount = new Map(catRows.filter((r) => r.categoryId).map((r) => [r.categoryId!, r._count._all] as const));
  const childCount = new Map(subRows.filter((r) => r.subcategoryId).map((r) => [r.subcategoryId!, r._count._all] as const));
  const childrenByParent = new Map<string, { name: string; count: number; sort: number }[]>();
  for (const c of allCats) {
    if (c.parentId && childCount.has(c.id)) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push({ name: c.name, count: childCount.get(c.id)!, sort: c.sortOrder });
      childrenByParent.set(c.parentId, arr);
    }
  }
  const categories = allCats
    .filter((c) => !c.parentId && (catCount.get(c.id) ?? 0) > 0)
    .map((c) => ({
      name: c.name,
      count: catCount.get(c.id) ?? 0,
      children: (childrenByParent.get(c.id) ?? []).sort((x, y) => x.sort - y.sort || y.count - x.count).map(({ name, count }) => ({ name, count })),
    }))
    .sort((x, y) => y.count - x.count);
  const brands = brandRows.filter((r) => r.brand).map((r) => ({ name: r.brand!, count: r._count._all }));

  const favSet = user.companyId
    ? new Set((await prisma.favorite.findMany({ where: { companyId: user.companyId }, select: { productId: true } })).map((f) => f.productId))
    : new Set<string>();

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
      stocked: p.isStocked && p.stockCache != null && Number(p.stockCache) > 0, fav: favSet.has(p.id), price,
    };
  });

  return (
    <>
      {sp.from === "opakovat" && (
        <Link href="/objednavky/opakovat" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mint-2 bg-mintbg/40 px-4 py-3 text-[13.5px] text-ink">
          <span><strong className="font-semibold text-brand">Dopĺňate opakovanú objednávku.</strong> Pri produktoch kliknite „Doobjednať" a vráťte sa späť na potvrdenie.</span>
          <span className="inline-flex flex-none items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Späť na potvrdenie
          </span>
        </Link>
      )}
      <PortalCatalog
        items={items} tierCode={tierCode}
        total={total} page={page} pageSize={PAGE}
        facets={{ categories, brands, stockCount }}
        active={a} repeatMode={sp.from === "opakovat"}
      />
    </>
  );
}
