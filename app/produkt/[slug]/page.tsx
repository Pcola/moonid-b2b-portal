import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { ProductImg } from "@/components/product-img";
import { safeJsonLd } from "@/lib/json-ld";

export const dynamic = "force-dynamic";

const detailSelect = {
  id: true, slug: true, sku: true, name: true, nameDisplay: true,
  brand: true, ean: true, unit: true, packSize: true, isStocked: true, descriptionLong: true,
  categoryId: true, subcategory: true,
  category: { select: { name: true } },
  media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
} as const;

async function getProduct(slug: string) {
  return prisma.product.findFirst({ where: { slug, isPublished: true }, select: detailSelect });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Produkt nenájdený — Moonid s.r.o.", robots: { index: false } };
  const name = p.nameDisplay || p.name;
  const desc = (p.descriptionLong || `${name} v ponuke Moonid s.r.o. — hygiena, čistenie a vybavenie pre prevádzky. Cena na vyžiadanie alebo po prihlásení do B2B portálu.`).replace(/\s+/g, " ").trim().slice(0, 158);
  return {
    title: `${name} — Moonid s.r.o.`,
    description: desc,
    alternates: { canonical: `/produkt/${p.slug}` },
    openGraph: p.media[0]?.storagePath ? { title: name, description: desc, images: [p.media[0].storagePath] } : undefined,
  };
}

const TRUST = [
  { t: "Vlastný rozvoz", s: "Nové Zámky a Nitriansky kraj", icon: <><path d="M3 7h11v8H3z" /><path d="M14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="1.6" /><circle cx="17.5" cy="17" r="1.6" /></> },
  { t: "Faktúra so splatnosťou", s: "bez platby vopred", icon: <><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 9h6M9 13h4" /></> },
  { t: "Ceny na mieru", s: "podľa objemu odberu", icon: <><path d="M20 12l-8 8-9-9V4h7z" /><circle cx="7.5" cy="7.5" r="1.4" /></> },
  { t: "9 rokov na trhu", s: "spoľahlivý partner od 2017", icon: <><path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 21l-5 -2.9 1-5.5-4-3.9 5.5-.8z" /></> },
];

export default async function ProduktDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const name = p.nameDisplay || p.name;
  const img = p.media[0]?.storagePath ?? "";
  const cat = p.category?.name ?? "Sortiment";

  const relatedRaw = p.categoryId
    ? await prisma.product.findMany({
        where: { isPublished: true, categoryId: p.categoryId, id: { not: p.id }, OR: [{ variantGroupId: null }, { isDefaultVariant: true }] },
        select: { id: true, slug: true, name: true, nameDisplay: true, media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } } },
        take: 14,
      })
    : [];
  const related = relatedRaw.sort((a, b) => (b.media.length ? 1 : 0) - (a.media.length ? 1 : 0)).slice(0, 5);

  const specs: { label: string; value: string }[] = [{ label: "Kód produktu", value: p.sku }];
  if (p.brand) specs.push({ label: "Značka", value: p.brand });
  if (p.subcategory) specs.push({ label: "Zaradenie", value: p.subcategory });
  if (p.packSize) specs.push({ label: "Balenie", value: p.packSize });
  if (p.ean) specs.push({ label: "EAN", value: p.ean });
  if (p.unit) specs.push({ label: "Merná jednotka", value: p.unit });
  specs.push({ label: "Dostupnosť", value: p.isStocked ? "Skladom" : "Na objednávku" });

  const ld = {
    "@context": "https://schema.org", "@type": "Product", name, category: cat, sku: p.sku,
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.ean ? { gtin13: p.ean } : {}),
    ...(img ? { image: img } : {}),
    ...(p.descriptionLong ? { description: p.descriptionLong.replace(/\s+/g, " ").trim().slice(0, 400) } : {}),
    offers: { "@type": "Offer", availability: p.isStocked ? "https://schema.org/InStock" : "https://schema.org/BackOrder", priceCurrency: "EUR", seller: { "@type": "Organization", name: "Moonid s.r.o." } },
  };

  // BreadcrumbList — pomáha Google rich results aj AI extrakcii cesty (dáta z breadcrumb nav nižšie)
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.moonid.sk";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Produkty", item: `${base}/produkty` },
      { "@type": "ListItem", position: 2, name: cat, item: `${base}/produkty?cat=${encodeURIComponent(cat)}` },
      { "@type": "ListItem", position: 3, name },
    ],
  };

  return (
    <>
      <SiteHeader solid />
      <main id="top" className="mx-auto max-w-[1240px] px-5 sm:px-8" style={{ paddingTop: "clamp(118px,13vw,142px)", paddingBottom: "clamp(72px,9vw,120px)" }}>
        {/* breadcrumb */}
        <nav aria-label="Omrvinková navigácia" className="mb-[clamp(22px,3vw,38px)] flex flex-wrap items-center gap-2.5 text-[13.5px] text-muted-2">
          <Link href="/produkty" className="text-muted transition hover:text-brand">Produkty</Link>
          <span className="text-line">/</span>
          <Link href={`/produkty?cat=${encodeURIComponent(cat)}`} className="text-muted transition hover:text-brand">{cat}</Link>
          <span className="text-line">/</span>
          <span className="truncate text-brand-2">{name}</span>
        </nav>

        <div className="grid items-start gap-[clamp(32px,4.5vw,72px)] lg:grid-cols-[1.05fr_1fr]">
          {/* obrázok */}
          <div className="lg:sticky lg:top-[100px]">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[24px] border border-line p-[clamp(34px,5vw,68px)] shadow-[0_36px_70px_-46px_rgba(16,42,38,0.45)]" style={{ background: "radial-gradient(125% 120% at 28% 0%, #ffffff 0%, #f1f5f3 100%)" }}>
              <span className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-2 backdrop-blur">{cat}</span>
              <span className={`absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${p.isStocked ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fdf6e7] text-[#8a5a00]"}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.isStocked ? "#1aa15f" : "#c98a14" }} />{p.isStocked ? "Skladom" : "Na objednávku"}
              </span>
              <ProductImg src={img} alt={name} sizes="(max-width: 1024px) 92vw, 520px" priority iconSize={72} />
            </div>
          </div>

          {/* info */}
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {p.brand && <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand">{p.brand}</span>}
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-2">{cat}</span>
            </div>
            <h1 className="font-display mt-2.5 font-semibold text-ink" style={{ fontSize: "clamp(27px,3.5vw,42px)", lineHeight: 1.06, letterSpacing: "-0.025em", textWrap: "balance" }}>{name}</h1>

            {/* cena + CTA */}
            <div className="mt-7 overflow-hidden rounded-[18px] border border-mint/45" style={{ background: "linear-gradient(135deg,#f3f8f6 0%,#eaf1ee 100%)" }}>
              <div className="flex flex-wrap items-center justify-between gap-4 p-[clamp(18px,2.4vw,24px)]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-2">Cena</span>
                  <span className="text-[24px] font-medium text-ink">Na vyžiadanie</span>
                  <span className="text-[12.5px] text-muted-3">Firemné ceny vidíte po prihlásení do portálu.</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Link href="/kontakt#form" className="whitespace-nowrap rounded-[11px] bg-brand px-[24px] py-[13px] text-center text-[14.5px] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-2">Vyžiadať ponuku</Link>
                  <Link href="/login" className="whitespace-nowrap rounded-[11px] border border-brand/30 bg-white/70 px-[24px] py-[12px] text-center text-[14px] font-semibold text-brand transition hover:bg-white">Ceny po prihlásení</Link>
                </div>
              </div>
            </div>

            {/* trust strip */}
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 rounded-[16px] border border-line bg-white p-[clamp(16px,2vw,22px)] sm:grid-cols-2">
              {TRUST.map((it) => (
                <div key={it.t} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mintbg text-brand">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-semibold leading-tight text-ink">{it.t}</span>
                    <span className="text-[12px] leading-tight text-muted-2">{it.s}</span>
                  </div>
                </div>
              ))}
            </div>

            {p.descriptionLong && (
              <div className="mt-8">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-2">Popis produktu</h2>
                <p className="mt-2.5 text-[15.5px] leading-relaxed text-muted-3" style={{ textWrap: "pretty" }}>{p.descriptionLong}</p>
              </div>
            )}

            {/* parametre */}
            <div className="mt-8">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-2">Parametre</h2>
              <div className="mt-3 overflow-hidden rounded-[14px] border border-line">
                {specs.map((s, i) => (
                  <div key={s.label} className={`flex items-baseline justify-between gap-5 px-4 py-3 ${i % 2 ? "bg-cream/50" : "bg-white"}`}>
                    <span className="text-[13.5px] text-muted-2">{s.label}</span>
                    <span className="text-right text-[14.5px] font-medium text-ink">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
              <span className="text-muted-2">Otázka k produktu?</span>
              <a href="tel:+421919216908" className="font-semibold text-brand transition hover:text-brand-2">0919 216 908</a>
              <span className="text-line">·</span>
              <a href="mailto:moonid@moonid.sk" className="font-medium text-muted transition hover:text-ink">moonid@moonid.sk</a>
            </div>
          </div>
        </div>

        {/* podobné produkty */}
        {related.length > 0 && (
          <section className="mt-[clamp(64px,8vw,110px)] border-t border-line pt-[clamp(40px,5vw,60px)]">
            <div className="mb-[clamp(24px,3vw,36px)] flex items-baseline justify-between gap-4">
              <h2 className="font-display font-semibold text-ink" style={{ fontSize: "clamp(22px,2.6vw,32px)", letterSpacing: "-0.02em" }}>Podobné produkty</h2>
              <Link href={`/produkty?cat=${encodeURIComponent(cat)}`} className="whitespace-nowrap text-[14px] font-semibold text-brand transition hover:text-brand-2">Celá kategória →</Link>
            </div>
            <div className="grid gap-[clamp(16px,2vw,24px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,190px),1fr))" }}>
              {related.map((r) => (
                <Link key={r.id} prefetch={false} href={`/produkt/${r.slug}`} className="group flex flex-col">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[16px] border border-line bg-[#f6f7f6] p-4 transition duration-200 group-hover:-translate-y-1 group-hover:border-brand/30 group-hover:shadow-[0_18px_40px_-26px_rgba(22,40,29,0.45)]">
                    <ProductImg src={r.media[0]?.storagePath} alt={r.nameDisplay || r.name} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px" iconSize={34} imgClassName="transition duration-500 group-hover:scale-105" />
                  </div>
                  <span className="mt-3 line-clamp-2 text-[14px] font-medium leading-snug text-ink transition group-hover:text-brand">{r.nameDisplay || r.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
      <CookieBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
    </>
  );
}
