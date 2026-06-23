"use client";

import { useMemo, useState } from "react";
import type { PricedLine } from "@/lib/pricing";

type Item = { id: string; slug: string; n: string; i: string; c: string; unit: string; stocked: boolean; price: PricedLine };
type Sort = "rec" | "asc" | "desc" | "az";

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
function plural(n: number) { return n === 1 ? "produkt" : n >= 2 && n <= 4 ? "produkty" : "produktov"; }
function priceVal(p: PricedLine) { return p.kind === "PRICE" ? p.net : Number.POSITIVE_INFINITY; }

export function PortalCatalog({ items, categories, tierCode }: { items: Item[]; categories: { name: string; count: number }[]; tierCode: string | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<Sort>("rec");
  const [limit, setLimit] = useState(24);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const total = items.length;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let r = items.filter((p) => (!cat || p.c === cat) && (!qq || p.n.toLowerCase().includes(qq)));
    if (sort === "az") r = [...r].sort((a, b) => a.n.localeCompare(b.n, "sk"));
    else if (sort === "asc") r = [...r].sort((a, b) => priceVal(a.price) - priceVal(b.price));
    else if (sort === "desc") r = [...r].sort((a, b) => priceVal(b.price) - priceVal(a.price));
    return r;
  }, [q, cat, sort, items]);

  const shown = filtered.slice(0, limit);

  const catRow = (name: string, count: number) => {
    const active = cat === name;
    return (
      <button key={name || "__all"} type="button" onClick={() => { setCat(name); setLimit(24); setFiltersOpen(false); }}
        className={`flex w-full items-center justify-between rounded-[10px] px-3 py-[9px] text-left text-[14px] transition ${active ? "bg-mintbg font-semibold text-brand" : "text-muted hover:bg-cream hover:text-ink"}`}>
        <span className="truncate pr-2">{name || "Všetko"}</span>
        <span className={`text-[12px] tabular-nums ${active ? "text-brand/60" : "text-muted-2"}`}>{count}</span>
      </button>
    );
  };

  const sidebar = (
    <div className="flex flex-col gap-7">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(24); }} placeholder="Hľadať v sortimente…"
          className="w-full rounded-[11px] border border-line bg-white py-2.5 pl-10 pr-3 text-[14.5px] text-ink outline-none transition focus:border-brand" />
      </div>
      <div>
        <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Kategórie</p>
        <div className="flex flex-col gap-0.5">{catRow("", total)}{categories.map((c) => catRow(c.name, c.count))}</div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1240px]">
      {/* banner: vaše ceny */}
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
              <p className="text-[14px] text-muted-2"><span className="font-semibold text-ink">{filtered.length}</span> {plural(filtered.length)}</p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-muted">
              <span className="hidden sm:inline">Zoradiť</span>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-2 pl-3.5 pr-9 text-[14px] font-medium text-ink outline-none transition hover:border-brand/40 focus:border-brand">
                  <option value="rec">Odporúčané</option>
                  <option value="asc">Najlacnejšie</option>
                  <option value="desc">Najdrahšie</option>
                  <option value="az">Názov A–Z</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {filtersOpen && <div className="mt-5 rounded-2xl border border-line p-4 lg:hidden">{sidebar}</div>}

          <div className="mt-7 grid gap-[clamp(14px,1.6vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(208px,1fr))" }}>
            {shown.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                <div className="relative flex aspect-square items-center justify-center bg-[#fafbfa] p-5">
                  <span className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.stocked ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fdf6e7] text-[#8a5a00]"}`}>{p.stocked ? "Skladom" : "Na objednávku"}</span>
                  {p.i ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.i} alt={p.n} loading="lazy" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2 opacity-40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-2 line-clamp-1">{p.c}</span>
                  <h3 className="line-clamp-2 text-[14px] font-medium leading-snug text-ink">{p.n}</h3>
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
                </div>
              </div>
            ))}
          </div>

          {shown.length === 0 && <p className="mt-14 text-center text-muted">Nič sa nenašlo.</p>}

          {filtered.length > limit && (
            <div className="mt-12 flex justify-center">
              <button type="button" onClick={() => setLimit((l) => l + 24)} className="rounded-[11px] border border-line bg-white px-8 py-3.5 text-[15px] font-semibold text-ink transition hover:border-brand/40">Načítať ďalšie produkty</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
