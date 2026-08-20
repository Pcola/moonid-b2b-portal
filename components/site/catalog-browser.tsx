"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ProductImg } from "@/components/product-img";
import { focusFirst, trapTabKey } from "@/lib/focus-trap";

type P = { id: string; n: string; i: string; c: string; slug: string };
type Active = { q: string; cat: string; sub: string; brand: string; sort: string };
type Facet = { name: string; count: number };

function plural(n: number) { return n === 1 ? "produkt" : n >= 2 && n <= 4 ? "produkty" : "produktov"; }

export function CatalogBrowser({ products, categories, subcategories, brands, total, page, pageSize, active }: {
  products: P[]; categories: Facet[]; subcategories: Facet[]; brands: Facet[];
  total: number; page: number; pageSize: number; active: Active;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(active.q);
  const [brandQ, setBrandQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const filtersDialogRef = useRef<HTMLDivElement>(null);
  const brandsShown = brands.filter((b) => b.name.toLowerCase().includes(brandQ.trim().toLowerCase()));

  // mobilný filter-drawer = modálny dialóg: Escape zatvára + zámok scrollu tela
  useEffect(() => {
    if (!filtersOpen) return;
    focusFirst(filtersDialogRef.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFiltersOpen(false);
        requestAnimationFrame(() => filtersButtonRef.current?.focus());
        return;
      }
      trapTabKey(e, filtersDialogRef.current);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [filtersOpen]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function go(patch: Partial<Active & { page: number }>) {
    const merged: Record<string, string> = { ...active, page: "1", ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (!v || v === "rec" || (k === "page" && v === "1")) continue;
      usp.set(k, v);
    }
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
  }
  const clearAll = () => { setQ(""); setBrandQ(""); router.push(pathname); };

  // URL pre stránku (rovnaká logika ako go(), ale ako href) — aby paginácia bola
  // skutočné <a href> a crawler sa dostal na stranu 2+ (SEO, nie len JS button).
  function hrefForPage(p: number) {
    const merged: Record<string, string> = { ...active, page: String(p) };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (!v || v === "rec" || (k === "page" && v === "1")) continue;
      usp.set(k, v);
    }
    const qs = usp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const chips: { key: string; label: string }[] = [];
  if (active.q) chips.push({ key: "q", label: `„${active.q}"` });
  if (active.cat) chips.push({ key: "cat", label: active.cat });
  if (active.sub) chips.push({ key: "sub", label: active.sub });
  if (active.brand) chips.push({ key: "brand", label: active.brand });
  const removeChip = (key: string) => {
    if (key === "q") setQ("");
    if (key === "cat") go({ cat: "", sub: "" });
    else go({ [key]: "" } as Partial<Active>);
  };

  const facetRow = (label: string, count: number, on: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[10px] px-3 py-[9px] text-left text-[15px] transition ${on ? "bg-mintbg font-semibold text-brand" : "text-muted hover:bg-cream hover:text-ink"}`}>
      <span className="truncate pr-2">{label}</span>
      <span className={`text-[12px] tabular-nums ${on ? "text-brand/60" : "text-muted-2"}`}>{count}</span>
    </button>
  );

  const sidebar = (
    <div className="flex flex-col gap-7">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input aria-label="Hľadať v sortimente" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go({ q }); }}
          placeholder="Hľadať v sortimente…" className="w-full rounded-[11px] border border-line bg-white py-2.5 pl-10 pr-3 text-[15.5px] text-ink outline-none transition focus:border-brand" />
      </div>

      <div>
        <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Kategórie</p>
        <div className="flex flex-col gap-0.5">
          {facetRow("Všetko", total, !active.cat && !active.brand, () => router.push(pathname))}
          {categories.map((c) => facetRow(c.name, c.count, active.cat === c.name, () => go({ cat: active.cat === c.name ? "" : c.name, sub: "" })))}
        </div>
      </div>

      {active.cat && subcategories.length > 0 && (
        <div>
          <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Podkategória</p>
          <div className="flex max-h-[230px] flex-col gap-0.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {subcategories.map((s) => facetRow(s.name, s.count, active.sub === s.name, () => go({ sub: active.sub === s.name ? "" : s.name })))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Značka</p>
          {brands.length > 5 && (
            <div className="relative mb-2">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input aria-label="Hľadať značku" value={brandQ} onChange={(e) => setBrandQ(e.target.value)} placeholder="Hľadať značku…" className="w-full rounded-[9px] border border-line bg-white py-2 pl-9 pr-3 text-[13px] text-ink outline-none transition focus:border-brand" />
            </div>
          )}
          <div className="flex max-h-[210px] flex-col gap-0.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
            {brandsShown.map((b) => facetRow(b.name, b.count, active.brand === b.name, () => go({ brand: active.brand === b.name ? "" : b.name })))}
            {brandsShown.length === 0 && <p className="px-3 py-1.5 text-[13px] text-muted-2">Žiadna značka.</p>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[244px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[104px] max-h-[calc(100vh-124px)] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">{sidebar}</div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div className="flex items-center gap-3">
              <button ref={filtersButtonRef} type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 py-2 text-[14px] font-medium text-ink transition hover:border-brand/40 lg:hidden" aria-expanded={filtersOpen} aria-controls="public-catalog-filters">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filtre{chips.length > 0 && <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{chips.length}</span>}
              </button>
              <p className="text-[14px] text-muted-2"><span className="font-semibold text-ink">{total}</span> {plural(total)}</p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-muted">
              <span className="hidden sm:inline">Zoradiť</span>
              <div className="relative">
                <select aria-label="Zoradiť produkty" value={active.sort} onChange={(e) => go({ sort: e.target.value })} className="cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-2 pl-3.5 pr-9 text-[14px] font-medium text-ink outline-none transition hover:border-brand/40 focus:border-brand">
                  <option value="rec">Odporúčané</option>
                  <option value="az">Názov A–Z</option>
                  <option value="za">Názov Z–A</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={() => removeChip(c.key)} className="inline-flex items-center gap-1.5 rounded-full border border-mint/50 bg-mintbg/60 py-1 pl-3 pr-2 text-[13px] font-medium text-brand transition hover:bg-mintbg">
                  {c.label}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              ))}
              <button type="button" onClick={clearAll} className="text-[13px] font-semibold text-muted transition hover:text-ink">Vymazať všetko</button>
            </div>
          )}

          <div className="mt-7 grid gap-[clamp(14px,1.6vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(208px,1fr))" }}>
            {products.map((p) => (
              <Link
                key={p.id}
                prefetch={false}
                href={`/produkt/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_14px_34px_-16px_rgba(16,42,38,0.22)]"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#fafbfa] p-5">
                  <ProductImg src={p.i} alt={p.n} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px" iconSize={38} imgClassName="transition duration-300 group-hover:scale-[1.04]" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-2 line-clamp-1">{p.c}</span>
                  <h3 className="line-clamp-2 text-[15.5px] font-medium leading-snug text-ink">{p.n}</h3>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                    <span className="text-[14px] font-semibold text-mint-ink">Cena na vyžiadanie</span>
                    <svg className="text-muted-2 transition group-hover:translate-x-0.5 group-hover:text-brand" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {products.length === 0 && (
            <p className="mt-14 text-center text-muted">Nič sa nenašlo. <button type="button" onClick={clearAll} className="font-semibold text-brand">Zrušiť filtre</button> alebo nás kontaktujte.</p>
          )}

          {pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              {page > 1
                ? <Link href={hrefForPage(page - 1)} rel="prev" className="rounded-[11px] border border-line bg-white px-5 py-3 text-[14.5px] font-semibold text-ink transition hover:border-brand/40">‹ Späť</Link>
                : <span aria-disabled="true" className="cursor-default rounded-[11px] border border-line bg-white px-5 py-3 text-[14.5px] font-semibold text-ink opacity-40">‹ Späť</span>}
              <span className="text-[14px] text-muted">Strana <span className="font-semibold text-ink">{page}</span> z {pages}</span>
              {page < pages
                ? <Link href={hrefForPage(page + 1)} rel="next" className="rounded-[11px] border border-line bg-white px-5 py-3 text-[14.5px] font-semibold text-ink transition hover:border-brand/40">Ďalej ›</Link>
                : <span aria-disabled="true" className="cursor-default rounded-[11px] border border-line bg-white px-5 py-3 text-[14.5px] font-semibold text-ink opacity-40">Ďalej ›</span>}
            </div>
          )}
        </div>
      </div>

      {/* mobilný drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-brand-deep/40" onClick={() => setFiltersOpen(false)} />
          <div ref={filtersDialogRef} id="public-catalog-filters" role="dialog" aria-modal="true" aria-label="Filtre" tabIndex={-1} className="absolute inset-y-0 right-0 flex w-[88%] max-w-[360px] flex-col bg-cream">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <span className="text-[16px] font-semibold text-ink">Filtre</span>
              <button type="button" onClick={() => { setFiltersOpen(false); requestAnimationFrame(() => filtersButtonRef.current?.focus()); }} aria-label="Zavrieť filtre" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebar}</div>
            <div className="flex gap-2 border-t border-line p-3">
              {chips.length > 0 && <button type="button" onClick={clearAll} className="rounded-[10px] border border-line px-4 py-3 text-[14px] font-semibold text-muted">Vymazať</button>}
              <button type="button" onClick={() => setFiltersOpen(false)} className="flex-1 rounded-[10px] bg-brand py-3 text-[15px] font-semibold text-white">Zobraziť {total} {plural(total)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
