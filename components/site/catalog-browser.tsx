"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type P = { id: string; n: string; i: string; c: string; slug: string };
type Active = { q: string; cat: string; brand: string; sort: string };

function plural(n: number) {
  return n === 1 ? "produkt" : n >= 2 && n <= 4 ? "produkty" : "produktov";
}

export function CatalogBrowser({ products, categories, brands, total, page, pageSize, active }: {
  products: P[];
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  total: number; page: number; pageSize: number; active: Active;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(active.q);
  const [brandQ, setBrandQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const brandsShown = brands.filter((b) => b.name.toLowerCase().includes(brandQ.trim().toLowerCase()));

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const anyFilter = !!(active.cat || active.brand || active.q);

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

  const facetRow = (label: string, count: number, on: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[10px] px-3 py-[9px] text-left text-[14px] transition ${on ? "bg-mintbg font-semibold text-brand" : "text-muted hover:bg-cream hover:text-ink"}`}>
      <span className="truncate pr-2">{label}</span>
      <span className={`text-[12px] tabular-nums ${on ? "text-brand/60" : "text-muted-2"}`}>{count}</span>
    </button>
  );

  const sidebar = (
    <div className="flex flex-col gap-7">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go({ q }); }}
          placeholder="Hľadať v sortimente…"
          className="w-full rounded-[11px] border border-line bg-white py-2.5 pl-10 pr-3 text-[14.5px] text-ink outline-none transition focus:border-brand"
        />
      </div>

      {anyFilter && (
        <button type="button" onClick={() => { setQ(""); router.push(pathname); }} className="self-start text-[13px] font-semibold text-brand transition hover:text-brand-2">✕ Zrušiť filtre</button>
      )}

      <div>
        <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Kategórie</p>
        <div className="flex flex-col gap-0.5">
          {facetRow("Všetko", total, !active.cat && !active.brand, () => router.push(pathname))}
          {categories.map((c) => facetRow(c.name, c.count, active.cat === c.name, () => go({ cat: active.cat === c.name ? "" : c.name })))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Značka</p>
          {brands.length > 5 && (
            <div className="relative mb-2">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={brandQ} onChange={(e) => setBrandQ(e.target.value)} placeholder="Hľadať značku…" className="w-full rounded-[9px] border border-line bg-white py-2 pl-9 pr-3 text-[13px] text-ink outline-none transition focus:border-brand" />
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
        {/* sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-[104px] max-h-[calc(100vh-124px)] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">{sidebar}</div>
        </aside>

        <div className="min-w-0">
          {/* top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 py-2 text-[14px] font-medium text-ink transition hover:border-brand/40 lg:hidden"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                Filtre
              </button>
              <p className="text-[14px] text-muted-2"><span className="font-semibold text-ink">{total}</span> {plural(total)}</p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-muted">
              <span className="hidden sm:inline">Zoradiť</span>
              <div className="relative">
                <select
                  value={active.sort}
                  onChange={(e) => go({ sort: e.target.value })}
                  className="cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-2 pl-3.5 pr-9 text-[14px] font-medium text-ink outline-none transition hover:border-brand/40 focus:border-brand"
                >
                  <option value="rec">Odporúčané</option>
                  <option value="az">Názov A–Z</option>
                  <option value="za">Názov Z–A</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {/* mobile filters */}
          {filtersOpen && <div className="mt-5 rounded-2xl border border-line p-4 lg:hidden">{sidebar}</div>}

          {/* grid */}
          <div className="mt-7 grid gap-[clamp(14px,1.6vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(208px,1fr))" }}>
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/produkt/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_14px_34px_-16px_rgba(16,42,38,0.22)]"
              >
                <div className="flex aspect-square items-center justify-center bg-[#fafbfa] p-5">
                  {p.i ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.i} alt={p.n} loading="lazy" className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.04]" />
                  ) : (
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2 opacity-40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-2 line-clamp-1">{p.c}</span>
                  <h3 className="line-clamp-2 text-[14.5px] font-medium leading-snug text-ink">{p.n}</h3>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                    <span className="text-[13px] font-semibold text-brand-2">Cena na vyžiadanie</span>
                    <svg className="text-muted-2 transition group-hover:translate-x-0.5 group-hover:text-brand" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {products.length === 0 && (
            <p className="mt-14 text-center text-muted">Nič sa nenašlo. <button type="button" onClick={() => { setQ(""); router.push(pathname); }} className="font-semibold text-brand">Zrušiť filtre</button> alebo nás kontaktujte.</p>
          )}

          {pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => go({ page: page - 1 })} className="rounded-[11px] border border-line bg-white px-5 py-3 text-[14.5px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">‹ Späť</button>
              <span className="text-[14px] text-muted">Strana <span className="font-semibold text-ink">{page}</span> z {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => go({ page: page + 1 })} className="rounded-[11px] border border-line bg-white px-5 py-3 text-[14.5px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">Ďalej ›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
