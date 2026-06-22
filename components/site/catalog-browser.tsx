"use client";

import { useMemo, useState } from "react";

type P = { id: string; n: string; i: string; c: string };

export function CatalogBrowser({ products, categories }: { products: P[]; categories: { name: string; count: number }[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [limit, setLimit] = useState(24);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.c === cat) && (!qq || p.n.toLowerCase().includes(qq)));
  }, [q, cat, products]);

  const shown = filtered.slice(0, limit);

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${active ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:border-brand/40"}`;

  return (
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
      {/* filter bar */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-[460px]">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(24); }}
            placeholder="Hľadať v sortimente…"
            className="w-full rounded-[10px] border border-line bg-white py-2.5 pl-10 pr-3 text-[15px] text-ink outline-none transition focus:border-brand"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setCat(""); setLimit(24); }} className={chip(cat === "")}>Všetko</button>
          {categories.map((c) => (
            <button key={c.name} type="button" onClick={() => { setCat(c.name); setLimit(24); }} className={chip(cat === c.name)}>{c.name}</button>
          ))}
        </div>
        <p className="text-[14px] text-muted-2">{filtered.length} {filtered.length === 1 ? "produkt" : filtered.length < 5 ? "produkty" : "produktov"}</p>
      </div>

      {/* grid */}
      <div className="mt-7 grid gap-[clamp(12px,1.6vw,20px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
        {shown.map((p) => (
          <div key={p.id} className="card-hover flex flex-col overflow-hidden rounded-[14px] border border-line bg-white">
            <div className="flex aspect-square items-center justify-center bg-cream p-3">
              {p.i ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.i} alt={p.n} loading="lazy" className="max-h-full max-w-full object-contain" />
              ) : (
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2 opacity-40" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-2 line-clamp-1">{p.c}</span>
              <h3 className="line-clamp-2 text-[14px] font-medium leading-snug text-ink">{p.n}</h3>
              <span className="mt-auto pt-1.5 text-[13px] font-semibold text-brand-2">Cena na vyžiadanie</span>
            </div>
          </div>
        ))}
      </div>

      {shown.length === 0 && <p className="mt-10 text-center text-muted">Nič sa nenašlo. Skúste iné hľadanie alebo nás kontaktujte.</p>}

      {filtered.length > limit && (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setLimit((l) => l + 24)} className="rounded-[10px] border border-line bg-white px-7 py-3 text-[15px] font-semibold text-ink transition hover:border-brand/40">
            Načítať ďalšie produkty
          </button>
        </div>
      )}
    </div>
  );
}
