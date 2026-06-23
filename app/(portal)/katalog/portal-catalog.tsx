"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { PricedLine } from "@/lib/pricing";
import { addToCart } from "../kosik/actions";

type Item = { id: string; slug: string; n: string; i: string; c: string; unit: string; stocked: boolean; price: PricedLine };
type Active = { q: string; cat: string; brand: string; stock: string; kind: string; sort: string };
type Facets = {
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  kinds: { value: string; label: string; count: number }[];
  stockCount: number;
};

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
function plural(n: number) { return n === 1 ? "produkt" : n >= 2 && n <= 4 ? "produkty" : "produktov"; }

function AddBtn({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  return (
    <button
      onClick={() => start(async () => { const r = await addToCart(productId, 1); if (r.ok) { setAdded(true); setTimeout(() => setAdded(false), 1500); } })}
      disabled={pending}
      className="mt-2.5 w-full rounded-[9px] border border-brand/30 bg-mintbg/40 px-3 py-2 text-[13px] font-semibold text-brand transition hover:bg-mintbg disabled:opacity-60"
    >
      {added ? "Pridané ✓" : pending ? "…" : "Do košíka"}
    </button>
  );
}

export function PortalCatalog({ items, tierCode, total, page, pageSize, facets, active }: {
  items: Item[]; tierCode: string | null; total: number; page: number; pageSize: number; facets: Facets; active: Active;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(active.q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // poskladá URL z aktívnych filtrov + patch; prázdne vyhodí; reset page (ak nie je v patchi)
  function go(patch: Partial<Active & { page: number }>) {
    const merged: Record<string, string> = { ...active, page: "1", ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (!v || v === "rec" || (k === "page" && v === "1")) continue;
      usp.set(k, v);
    }
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const anyFilter = !!(active.cat || active.brand || active.stock || active.kind || active.q);

  const facetRow = (label: string, count: number, on: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[10px] px-3 py-[8px] text-left text-[14px] transition ${on ? "bg-mintbg font-semibold text-brand" : "text-muted hover:bg-cream hover:text-ink"}`}>
      <span className="truncate pr-2">{label}</span>
      <span className={`text-[12px] tabular-nums ${on ? "text-brand/60" : "text-muted-2"}`}>{count}</span>
    </button>
  );

  const FacetGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );

  const sidebar = (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go({ q }); }}
          placeholder="Hľadať v sortimente…" className="w-full rounded-[11px] border border-line bg-white py-2.5 pl-10 pr-3 text-[14.5px] text-ink outline-none transition focus:border-brand" />
      </div>

      {anyFilter && (
        <button type="button" onClick={() => { setQ(""); router.push(pathname); }} className="self-start text-[13px] font-semibold text-brand transition hover:text-brand-2">✕ Zrušiť filtre</button>
      )}

      <FacetGroup title="Kategórie">
        {facetRow("Všetko", total, !active.cat && !active.brand && !active.stock && !active.kind, () => router.push(pathname))}
        {facets.categories.map((c) => facetRow(c.name, c.count, active.cat === c.name, () => go({ cat: active.cat === c.name ? "" : c.name })))}
      </FacetGroup>

      <FacetGroup title="Dostupnosť">
        {facetRow("Skladom", facets.stockCount, active.stock === "1", () => go({ stock: active.stock === "1" ? "" : "1" }))}
      </FacetGroup>

      {facets.kinds.length > 1 && (
        <FacetGroup title="Typ">
          {facets.kinds.map((k) => facetRow(k.label, k.count, active.kind === k.value, () => go({ kind: active.kind === k.value ? "" : k.value })))}
        </FacetGroup>
      )}

      {facets.brands.length > 0 && (
        <FacetGroup title="Značka">
          {facets.brands.map((b) => facetRow(b.name, b.count, active.brand === b.name, () => go({ brand: active.brand === b.name ? "" : b.name })))}
        </FacetGroup>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-mint/40 bg-mintbg/50 px-4 py-3 text-[13.5px] text-brand">
        <span className="font-semibold">Zobrazené ceny sú vaše firemné ceny{tierCode ? ` (úroveň ${tierCode})` : ""}.</span>
        <span className="text-muted-3">Ceny sú bez DPH (s DPH uvedené pod cenou).</span>
      </div>

      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[244px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-[88px]">{sidebar}</div></aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 py-2 text-[14px] font-medium text-ink transition hover:border-brand/40 lg:hidden">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filtre
              </button>
              <p className="text-[14px] text-muted-2"><span className="font-semibold text-ink">{total}</span> {plural(total)}{total > 0 ? ` · ${from}–${to}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-muted">
              <span className="hidden sm:inline">Zoradiť</span>
              <div className="relative">
                <select value={active.sort} onChange={(e) => go({ sort: e.target.value })} className="cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-2 pl-3.5 pr-9 text-[14px] font-medium text-ink outline-none transition hover:border-brand/40 focus:border-brand">
                  <option value="rec">Odporúčané</option>
                  <option value="az">Názov A–Z</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {filtersOpen && <div className="mt-5 rounded-2xl border border-line p-4 lg:hidden">{sidebar}</div>}

          <div className="mt-7 grid gap-[clamp(14px,1.6vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(208px,1fr))" }}>
            {items.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                <Link href={`/produkt/${p.slug}`} className="relative flex aspect-square items-center justify-center bg-[#fafbfa] p-5">
                  <span className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.stocked ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fdf6e7] text-[#8a5a00]"}`}>{p.stocked ? "Skladom" : "Na objednávku"}</span>
                  {p.i ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.i} alt={p.n} loading="lazy" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2 opacity-40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-2 line-clamp-1">{p.c}</span>
                  <Link href={`/produkt/${p.slug}`} className="line-clamp-2 text-[14px] font-medium leading-snug text-ink transition hover:text-brand">{p.n}</Link>
                  <div className="mt-auto pt-2">
                    {p.price.kind === "PRICE" ? (
                      <>
                        <div className="text-[17px] font-semibold text-ink">{eur(p.price.net)} <span className="text-[12px] font-normal text-muted-2">/ {p.unit}</span></div>
                        <div className="text-[11.5px] text-muted-2">bez DPH · s DPH {eur(p.price.gross)}</div>
                      </>
                    ) : (
                      <span className="text-[13.5px] font-semibold text-brand-2">Cena na vyžiadanie</span>
                    )}
                  </div>
                  {p.price.kind === "PRICE" && <AddBtn productId={p.id} />}
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && <p className="mt-14 text-center text-muted">Nič sa nenašlo. <button type="button" onClick={() => { setQ(""); router.push(pathname); }} className="font-semibold text-brand">Zrušiť filtre</button></p>}

          {pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => go({ page: page - 1 })} className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">‹ Späť</button>
              <span className="text-[14px] text-muted">Strana <span className="font-semibold text-ink">{page}</span> z {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => go({ page: page + 1 })} className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">Ďalej ›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
