import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { PortalCatalog } from "./portal-catalog";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Katalóg — Moonid portál", robots: { index: false, follow: false } };

const PAGE = 24;
type SP = { q?: string; cat?: string; sub?: string; brand?: string; stock?: string; sort?: string; page?: string; from?: string };
type Active = { q: string; cat: string; sub: string; brand: string; stock: string; sort: string };

// where so VŠETKÝMI aktívnymi filtrami OKREM `exclude` (pre faceted counts)
function buildWhere(a: Active, exclude: string | null): Prisma.ProductWhereInput {
  // listing zobrazí 1 kartu na skupinu: default variant alebo samostatný produkt
  const and: Prisma.ProductWhereInput[] = [{ OR: [{ variantGroupId: null }, { isDefaultVariant: true }] }];
  if (a.q && exclude !== "q") and.push({ OR: [{ name: { contains: a.q, mode: "insensitive" } }, { nameDisplay: { contains: a.q, mode: "insensitive" } }] });
  const w: Prisma.ProductWhereInput = { isPublished: true, AND: and };
  if (a.cat && exclude !== "cat") w.category = { name: a.cat };
  if (a.sub && exclude !== "sub") w.subcategory = a.sub;
  if (a.brand && exclude !== "brand") w.brand = a.brand;
  if (a.stock === "1" && exclude !== "stock") w.isStocked = true;
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
  };
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = buildWhere(a, null);
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    a.sort === "az" ? [{ name: "asc" }] : [{ shelfStatus: "asc" }, { media: { _count: "desc" } }, { name: "asc" }];

  const [rows, total, catRows, subRows, brandRows, stockCount, allCats] = await Promise.all([
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
    // podkategórie LEN keď je vybraná kategória (kaskáda)
    a.cat
      ? prisma.product.groupBy({ by: ["subcategory"], where: { ...buildWhere(a, "sub"), subcategory: { not: null } }, _count: { _all: true }, orderBy: { _count: { subcategory: "desc" } } })
      : Promise.resolve([] as { subcategory: string | null; _count: { _all: number } }[]),
    prisma.product.groupBy({ by: ["brand"], where: { ...buildWhere(a, "brand"), brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } }, take: 60 }),
    prisma.product.count({ where: { ...buildWhere(a, "stock"), isStocked: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const catName = new Map(allCats.map((c) => [c.id, c.name]));
  const categories = catRows
    .filter((r) => r.categoryId && catName.get(r.categoryId))
    .map((r) => ({ name: catName.get(r.categoryId!)!, count: r._count._all }))
    .sort((x, y) => y.count - x.count);
  const subcategories = subRows.filter((r) => r.subcategory).map((r) => ({ name: r.subcategory!, count: r._count._all }));
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
          <span><strong className="font-semibold text-brand">Dopĺňate opakovanú objednávku.</strong> Pridajte tovar do košíka a vráťte sa späť na potvrdenie.</span>
          <span className="inline-flex flex-none items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Späť na potvrdenie
          </span>
        </Link>
      )}
      <PortalCatalog
        items={items} tierCode={tierCode}
        total={total} page={page} pageSize={PAGE}
        facets={{ categories, subcategories, brands, stockCount }}
        active={a}
      />
    </>
  );
}
