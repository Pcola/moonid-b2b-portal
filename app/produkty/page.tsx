import type { Metadata } from "next";
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
    "Sortiment Moonid pre hygienu, čistenie a chod vašej prevádzky. Filtrovanie podľa kategórií, ceny na vyžiadanie alebo po prihlásení do B2B portálu.",
  alternates: { canonical: "/produkty" },
};

// Verejný výber — ZÁMERNE bez cien/nákladov (basePrice, costPrice, prices, stock).
const publicProductSelect = {
  id: true,
  slug: true,
  sku: true,
  name: true,
  nameDisplay: true,
  brand: true,
  shelfStatus: true,
  category: { select: { name: true } },
  media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
} as const;

export default async function Produkty() {
  const rows = await prisma.product.findMany({
    where: { isPublished: true },
    select: publicProductSelect,
    orderBy: [{ shelfStatus: "asc" }, { name: "asc" }], // FEATURED najprv
  });

  const products = rows
    .map((p) => ({
      id: p.id,
      n: p.nameDisplay || p.name,
      i: p.media[0]?.storagePath ?? "",
      c: p.category?.name ?? "Ostatné",
      slug: p.slug ?? p.id,
    }))
    .sort((a, b) => (b.i ? 1 : 0) - (a.i ? 1 : 0)); // produkty s obrázkom hore

  const categories = Object.entries(
    products.reduce<Record<string, number>>((m, p) => { m[p.c] = (m[p.c] || 0) + 1; return m; }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <SiteHeader />
      <main id="top">
        <PageHero
          eyebrow="Sortiment"
          title="Katalóg produktov"
          subtitle="Sortiment pre hygienu, čistenie a chod vašej prevádzky. Ceny vidíte po prihlásení do portálu alebo na vyžiadanie."
        />
        <section style={{ padding: "clamp(48px,6vw,80px) 0" }}>
          <CatalogBrowser products={products} categories={categories} />
        </section>
        <CtaBand />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
