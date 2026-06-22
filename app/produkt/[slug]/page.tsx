import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";

export const dynamic = "force-dynamic";

// Verejný výber — ZÁMERNE bez cien/nákladov.
const detailSelect = {
  id: true, slug: true, sku: true, name: true, nameDisplay: true,
  brand: true, ean: true, unit: true, isStocked: true, descriptionLong: true,
  categoryId: true,
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

function ImgBox({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border border-line bg-[#f6f7f6]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain p-[clamp(28px,4vw,56px)]" />
      ) : (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2 opacity-40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
      )}
    </div>
  );
}

export default async function ProduktDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const name = p.nameDisplay || p.name;
  const img = p.media[0]?.storagePath ?? "";
  const cat = p.category?.name ?? "Sortiment";

  const relatedRaw = p.categoryId
    ? await prisma.product.findMany({
        where: { isPublished: true, categoryId: p.categoryId, id: { not: p.id } },
        select: { id: true, slug: true, name: true, nameDisplay: true, media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } } },
        take: 14,
      })
    : [];
  const related = relatedRaw.sort((a, b) => (b.media.length ? 1 : 0) - (a.media.length ? 1 : 0)).slice(0, 5);

  const specs: { label: string; value: string }[] = [{ label: "Kód produktu", value: p.sku }];
  if (p.brand) specs.push({ label: "Značka", value: p.brand });
  if (p.ean) specs.push({ label: "EAN", value: p.ean });
  if (p.unit) specs.push({ label: "Merná jednotka", value: p.unit });
  specs.push({ label: "Dostupnosť", value: p.isStocked ? "Skladom" : "Na objednávku" });

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    category: cat,
    sku: p.sku,
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.ean ? { gtin13: p.ean } : {}),
    ...(img ? { image: img } : {}),
    ...(p.descriptionLong ? { description: p.descriptionLong.replace(/\s+/g, " ").trim().slice(0, 400) } : {}),
    offers: { "@type": "Offer", availability: p.isStocked ? "https://schema.org/InStock" : "https://schema.org/BackOrder", priceCurrency: "EUR", seller: { "@type": "Organization", name: "Moonid s.r.o." } },
  };

  return (
    <>
      <SiteHeader />
      <main id="top" className="mx-auto max-w-[1240px] px-5 sm:px-8" style={{ paddingTop: "clamp(126px,14vw,150px)", paddingBottom: "clamp(72px,9vw,120px)" }}>
        {/* breadcrumb */}
        <nav aria-label="Omrvinková navigácia" className="mb-[clamp(24px,3vw,40px)] flex flex-wrap items-center gap-2.5 text-[13.5px] text-muted-2">
          <Link href="/produkty" className="text-muted transition hover:text-brand">Produkty</Link>
          <span>/</span>
          <span className="text-brand-2">{cat}</span>
        </nav>

        <div className="grid items-start gap-[clamp(32px,4.5vw,72px)] lg:grid-cols-[1.05fr_1fr]">
          {/* obrázok (sticky) */}
          <div className="lg:sticky lg:top-[104px]">
            <ImgBox src={img} alt={name} />
          </div>

          {/* info */}
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-2">{cat}</span>
            <h1 className="mt-3 text-ink" style={{ fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.1, letterSpacing: "-0.015em", textWrap: "balance" }}>{name}</h1>

            {/* dostupnosť */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium"
              style={p.isStocked ? { borderColor: "#bbe7d3", background: "#ecfdf3", color: "#14633f" } : { borderColor: "#f0dcb0", background: "#fdf6e7", color: "#8a5a00" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.isStocked ? "#1aa15f" : "#c98a14" }} />
              {p.isStocked ? "Skladom" : "Na objednávku"}
            </div>

            {/* cena + CTA */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-cream px-[clamp(18px,2.4vw,24px)] py-[clamp(16px,2vw,20px)]">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-2">Cena</span>
                <span className="text-[22px] text-ink">Na vyžiadanie</span>
              </div>
              <Link href="/kontakt#form" className="cta-primary whitespace-nowrap rounded-[11px] bg-brand px-[26px] py-[14px] text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-2">
                Vyžiadať cenovú ponuku
              </Link>
            </div>

            {p.descriptionLong && (
              <p className="mt-7 text-[15.5px] leading-relaxed text-muted-3" style={{ textWrap: "pretty" }}>{p.descriptionLong}</p>
            )}

            {/* parametre */}
            <div className="mt-8 border-t border-line">
              {specs.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-5 border-b border-line py-3">
                  <span className="text-[13.5px] text-muted-2">{s.label}</span>
                  <span className="text-right text-[14.5px] font-medium text-ink">{s.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href="/kontakt#form" className="border-b-[1.5px] border-brand py-2 text-[14.5px] font-semibold text-brand transition hover:text-brand-2">Prejsť na kontaktný formulár</Link>
              <span className="text-line">·</span>
              <a href="tel:+421919216908" className="text-[14.5px] font-medium text-muted transition hover:text-ink">0919 216 908</a>
              <span className="text-line">·</span>
              <Link href="/produkty" className="text-[14.5px] font-medium text-muted transition hover:text-ink">Späť na produkty</Link>
            </div>

            <p className="mt-6 text-[12.5px] leading-relaxed text-muted-2">Cena a dostupnosť závisia od objemu a aktuálnych skladových zásob. Najpredávanejšie produkty držíme skladom, zvyšok dodáme na objednávku pravidelným rozvozom.</p>
          </div>
        </div>

        {/* podobné produkty */}
        {related.length > 0 && (
          <section className="mt-[clamp(64px,8vw,110px)] border-t border-line pt-[clamp(40px,5vw,60px)]">
            <div className="mb-[clamp(24px,3vw,36px)] flex items-baseline justify-between gap-4">
              <h2 className="text-ink" style={{ fontSize: "clamp(22px,2.6vw,32px)", letterSpacing: "-0.01em" }}>Podobné produkty</h2>
              <Link href="/produkty" className="whitespace-nowrap text-[14px] font-semibold text-brand transition hover:text-brand-2">Celý katalóg →</Link>
            </div>
            <div className="grid gap-[clamp(16px,2vw,24px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,190px),1fr))" }}>
              {related.map((r) => (
                <Link key={r.id} href={`/produkt/${r.slug}`} className="group flex flex-col">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[14px] border border-line bg-[#f6f7f6] transition group-hover:border-brand/30 group-hover:shadow-[0_16px_36px_-24px_rgba(22,40,29,0.4)]">
                    {r.media[0]?.storagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.media[0].storagePath} alt={r.nameDisplay || r.name} loading="lazy" className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105" />
                    ) : (
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-muted-2 opacity-40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
                    )}
                  </div>
                  <span className="mt-3 line-clamp-2 text-[14px] font-medium leading-snug text-ink">{r.nameDisplay || r.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
      <CookieBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </>
  );
}
