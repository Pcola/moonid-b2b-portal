import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { PageHero, CtaBand } from "@/components/site/sections";
import { CatalogBrowser } from "@/components/site/catalog-browser";
import productsData from "@/content/products.json";

type P = { id: string; n: string; i: string; c: string };
const products = productsData as P[];

const categories = Object.entries(
  products.reduce<Record<string, number>>((m, p) => { m[p.c] = (m[p.c] || 0) + 1; return m; }, {})
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count);

export const metadata: Metadata = {
  title: "Katalóg produktov — Moonid s.r.o. | hygiena, čistenie a vybavenie",
  description: "Kompletný sortiment Moonid — cez 1 600 položiek pre hygienu, čistenie a chod prevádzky. Filtrovanie podľa kategórií, ceny na vyžiadanie alebo po prihlásení do B2B portálu.",
  alternates: { canonical: "/produkty" },
};

export default function Produkty() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <PageHero
          eyebrow="Sortiment"
          title="Katalóg produktov"
          subtitle="Cez 1 600 položiek pre hygienu, čistenie a chod vašej prevádzky. Ceny vidíte po prihlásení do portálu alebo na vyžiadanie."
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
