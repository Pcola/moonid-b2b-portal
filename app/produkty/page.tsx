import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { PageHero, CtaBand } from "@/components/site/sections";
import { CatalogBrowser } from "@/components/site/catalog-browser";

export const dynamic = "force-dynamic"; // katalóg sa mení (publikovanie/enrichment)

export const metadata: Metadata = {
  title: "Katalóg produktov — Moonid s.r.o. | hygiena, čistenie a vybavenie",
  description:
    "Sortiment Moonid pre hygienu, čistenie a chod vašej prevádzky. Filtrovanie podľa kategórií a značiek, ceny na vyžiadanie alebo po prihlásení do B2B portálu.",
  alternates: { canonical: "/produkty" },
};

const PAGE = 24;
type SP = { q?: string; cat?: string; sub?: string; brand?: string; sort?: string; page?: string };
type Active = { q: string; cat: string; sub: string; brand: string; sort: string };

function buildWhere(a: Active, exclude: string | null): Prisma.ProductWhereInput {
  // listing zobrazí 1 kartu na skupinu: default variant alebo samostatný produkt
  const and: Prisma.ProductWhereInput[] = [{ OR: [{ variantGroupId: null }, { isDefaultVariant: true }] }];
  if (a.q && exclude !== "q") and.push({ OR: [{ name: { contains: a.q, mode: "insensitive" } }, { nameDisplay: { contains: a.q, mode: "insensitive" } }] });
  const w: Prisma.ProductWhereInput = { isPublished: true, AND: and };
  if (a.cat && exclude !== "cat") w.category = { name: a.cat };
  if (a.sub && exclude !== "sub") w.subcategory = a.sub;
  if (a.brand && exclude !== "brand") w.brand = a.brand;
  return w;
}

// Verejný výber — ZÁMERNE bez cien/nákladov/skladu.
const publicProductSelect = {
  id: true, slug: true, name: true, nameDisplay: true,
  category: { select: { name: true } },
  media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
} as const;

export default async function Produkty({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const a: Active = { q: (sp.q ?? "").trim().slice(0, 120), cat: (sp.cat ?? "").slice(0, 80), sub: (sp.sub ?? "").slice(0, 80), brand: (sp.brand ?? "").slice(0, 60), sort: sp.sort ?? "rec" };
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = buildWhere(a, null);
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    a.sort === "az" ? [{ name: "asc" }] : a.sort === "za" ? [{ name: "desc" }] : [{ shelfStatus: "asc" }, { media: { _count: "desc" } }, { name: "asc" }];

  const [rows, total, catRows, subRows, brandRows, allCats] = await Promise.all([
    prisma.product.findMany({ where, orderBy, take: PAGE, skip: (page - 1) * PAGE, select: publicProductSelect }),
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ["categoryId"], where: buildWhere(a, "cat"), _count: { _all: true } }),
    a.cat
      ? prisma.product.groupBy({ by: ["subcategory"], where: { ...buildWhere(a, "sub"), subcategory: { not: null } }, _count: { _all: true }, orderBy: { _count: { subcategory: "desc" } } })
      : Promise.resolve([] as { subcategory: string | null; _count: { _all: number } }[]),
    prisma.product.groupBy({ by: ["brand"], where: { ...buildWhere(a, "brand"), brand: { not: null } }, _count: { _all: true }, orderBy: { _count: { brand: "desc" } }, take: 60 }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const catName = new Map(allCats.map((c) => [c.id, c.name]));
  const categories = catRows
    .filter((r) => r.categoryId && catName.get(r.categoryId))
    .map((r) => ({ name: catName.get(r.categoryId!)!, count: r._count._all }))
    .sort((x, y) => y.count - x.count);
  const subcategories = subRows.filter((r) => r.subcategory).map((r) => ({ name: r.subcategory!, count: r._count._all }));
  const brands = brandRows.filter((r) => r.brand).map((r) => ({ name: r.brand!, count: r._count._all }));

  const products = rows.map((p) => ({
    id: p.id, n: p.nameDisplay || p.name, i: p.media[0]?.storagePath ?? "",
    c: p.category?.name ?? "Ostatné", slug: p.slug ?? p.id,
  }));

  return (
    <>
      <SiteHeader solid />
      <main id="top">
        <PageHero
          eyebrow="Sortiment"
          title="Katalóg produktov"
          subtitle="Sortiment pre hygienu, čistenie a chod vašej prevádzky. Ceny vidíte po prihlásení do portálu alebo na vyžiadanie."
        />
        <section style={{ padding: "clamp(48px,6vw,80px) 0" }}>
          <CatalogBrowser products={products} categories={categories} subcategories={subcategories} brands={brands} total={total} page={page} pageSize={PAGE} active={a} />
        </section>
        <CtaBand />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
