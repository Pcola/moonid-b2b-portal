"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { PricedLine } from "@/lib/pricing";
import { addToCart, addToRepeatDraft } from "../kosik/actions";
import { FavoriteButton } from "@/components/portal/favorite-button";
import { ProductImg } from "@/components/product-img";
import { useToast } from "@/components/portal/toast";

type Item = { id: string; slug: string; n: string; i: string; c: string; unit: string; stocked: boolean; fav: boolean; price: PricedLine };
type Active = { q: string; cat: string; sub: string; brand: string; stock: string; sort: string; pmin: string; pmax: string };
type Facets = {
  categories: { name: string; count: number; children: { name: string; count: number }[] }[];
  brands: { name: string; count: number }[];
  stockCount: number;
};

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
function plural(n: number) { return n === 1 ? "produkt" : n >= 2 && n <= 4 ? "produkty" : "produktov"; }

function AddBtn({ productId, repeat }: { productId: string; repeat?: boolean }) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const toast = useToast();
  return (
    <button
      onClick={() => start(async () => { const r = repeat ? await addToRepeatDraft(productId, 1) : await addToCart(productId, 1); if (r.ok) { setAdded(true); toast(repeat ? "Pridané k doobjednaniu" : "Pridané do košíka"); setTimeout(() => setAdded(false), 1500); } })}
      disabled={pending}
      className="mt-2.5 w-full rounded-[9px] border border-brand/30 bg-mintbg/40 px-3 py-2 text-[13px] font-semibold text-brand transition hover:bg-mintbg disabled:opacity-60"
    >
      {added ? "Pridané ✓" : pending ? "…" : repeat ? "Doobjednať" : "Do košíka"}
    </button>
  );
}

export function PortalCatalog({ items, tierCode, total, page, pageSize, facets, active, repeatMode }: {
  items: Item[]; tierCode: string | null; total: number; page: number; pageSize: number; facets: Facets; active: Active; repeatMode?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(active.q);
  const [brandQ, setBrandQ] = useState("");
  const [pmin, setPmin] = useState(active.pmin);
  const [pmax, setPmax] = useState(active.pmax);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleCat = (name: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n; });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  // WCAG 2.1.1 (klávesnica) + 2.4.3 (focus): Escape zavrie drawer, focus ide na tlačidlo zavrieť
  useEffect(() => {
    if (!filtersOpen) return;
    drawerCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFiltersOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtersOpen]);
  const brandsShown = facets.brands.filter((b) => b.name.toLowerCase().includes(brandQ.trim().toLowerCase()));

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

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
  const clearAll = () => { setQ(""); setBrandQ(""); setPmin(""); setPmax(""); router.push(pathname); };

  // aktívne filtre ako chips
  const chips: { key: string; label: string }[] = [];
  if (active.q) chips.push({ key: "q", label: `„${active.q}"` });
  if (active.cat) chips.push({ key: "cat", label: active.cat });
  if (active.sub) chips.push({ key: "sub", label: active.sub });
  if (active.brand) chips.push({ key: "brand", label: active.brand });
  if (active.stock === "1") chips.push({ key: "stock", label: "Skladom" });
  if (active.pmin || active.pmax) chips.push({ key: "price", label: `${active.pmin || "0"}–${active.pmax || "∞"} €` });
  const removeChip = (key: string) => {
    if (key === "q") { setQ(""); go({ q: "" }); return; }
    if (key === "cat") { go({ cat: "", sub: "" }); return; }
    if (key === "price") { setPmin(""); setPmax(""); go({ pmin: "", pmax: "" }); return; }
    go({ [key]: "" } as Partial<Active>);
  };

  const facetRow = (label: string, count: number, on: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[10px] px-3 py-[8px] text-left text-[14px] transition ${on ? "bg-mintbg font-semibold text-brand" : "text-muted hover:bg-cream hover:text-ink"}`}>
      <span className="truncate pr-2">{label}</span>
      <span className={`text-[12px] tabular-nums ${on ? "text-brand/60" : "text-muted-2"}`}>{count}</span>
    </button>
  );

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
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

      <Group title="Kategórie">
        {facetRow("Všetko", total, !active.cat && !active.brand && !active.stock, () => router.push(pathname))}
        {facets.categories.map((c) => {
          const hasKids = c.children.length > 0;
          const catActive = active.cat === c.name;
          const open = hasKids && (expanded.has(c.name) || catActive);
          return (
            <div key={c.name}>
              <div className={`flex items-center rounded-[10px] ${catActive ? "bg-mintbg" : "hover:bg-cream"}`}>
                <button type="button" onClick={() => go({ cat: catActive ? "" : c.name, sub: "" })}
                  className={`flex flex-1 items-center justify-between rounded-[10px] px-3 py-[8px] text-left text-[14px] transition ${catActive ? "font-semibold text-brand" : "text-muted hover:text-ink"}`}>
                  <span className="truncate pr-2">{c.name}</span>
                  <span className={`text-[12px] tabular-nums ${catActive ? "text-brand/60" : "text-muted-2"}`}>{c.count}</span>
                </button>
                {hasKids && (
                  <button type="button" onClick={() => toggleCat(c.name)} aria-expanded={open} aria-label={open ? `Zbaliť ${c.name}` : `Rozbaliť ${c.name}`}
                    className="mr-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg text-muted-2 transition hover:bg-white hover:text-ink">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                )}
              </div>
              {open && (
                <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-line pl-2">
                  {c.children.map((s) => facetRow(s.name, s.count, active.sub === s.name, () => go({ cat: c.name, sub: active.sub === s.name ? "" : s.name })))}
                </div>
              )}
            </div>
          );
        })}
      </Group>

      <Group title="Dostupnosť">
        {facetRow("Skladom", facets.stockCount, active.stock === "1", () => go({ stock: active.stock === "1" ? "" : "1" }))}
      </Group>

      <Group title="Cena (€)">
        <div className="flex items-center gap-2 px-1">
          <input value={pmin} onChange={(e) => setPmin(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go({ pmin, pmax }); }} inputMode="decimal" placeholder="od" aria-label="Cena od"
            className="w-full rounded-[9px] border border-line bg-white px-2.5 py-1.5 text-[13.5px] text-ink outline-none transition focus:border-brand" />
          <span className="flex-none text-muted-2">–</span>
          <input value={pmax} onChange={(e) => setPmax(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go({ pmin, pmax }); }} inputMode="decimal" placeholder="do" aria-label="Cena do"
            className="w-full rounded-[9px] border border-line bg-white px-2.5 py-1.5 text-[13.5px] text-ink outline-none transition focus:border-brand" />
        </div>
        {(pmin !== active.pmin || pmax !== active.pmax) && (
          <button type="button" onClick={() => go({ pmin, pmax })} className="mt-2 w-full rounded-[9px] bg-brand/10 py-1.5 text-[12.5px] font-semibold text-brand transition hover:bg-brand/15">Použiť cenu</button>
        )}
      </Group>

      {facets.brands.length > 0 && (
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">Značka</p>
          {facets.brands.length > 5 && (
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
    <div className="mx-auto max-w-[1240px]">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[244px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[72px] max-h-[calc(100vh-92px)] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">{sidebar}</div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-mint/40 bg-mintbg/50 px-4 py-3 text-[13.5px] text-brand">
            <span className="font-semibold">Zobrazené ceny sú vaše firemné ceny{tierCode ? ` (úroveň ${tierCode})` : ""}.</span>
            <span className="text-muted-3">Ceny sú bez DPH (s DPH uvedené pod cenou).</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 py-2 text-[14px] font-medium text-ink transition hover:border-brand/40 lg:hidden">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filtre{chips.length > 0 && <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{chips.length}</span>}
              </button>
              <p className="text-[14px] text-muted-2"><span className="font-semibold text-ink">{total}</span> {plural(total)}{total > 0 ? ` · ${from}–${to}` : ""}</p>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-muted">
              <span className="hidden sm:inline">Zoradiť</span>
              <div className="relative">
                <select value={active.sort} onChange={(e) => go({ sort: e.target.value })} className="cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-2 pl-3.5 pr-9 text-[14px] font-medium text-ink outline-none transition hover:border-brand/40 focus:border-brand">
                  <option value="rec">Odporúčané</option>
                  <option value="az">Názov A–Z</option>
                  <option value="price-asc">Cena od najnižšej</option>
                  <option value="price-desc">Cena od najvyššej</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {/* aktívne filtre — chips */}
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
            {items.map((p) => (
              <div key={p.id} className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                <FavoriteButton productId={p.id} initial={p.fav} className="absolute right-2 top-2 z-10 bg-white/80 backdrop-blur-sm" />
                <Link prefetch={false} href={`/katalog/${p.slug}`} className="relative flex aspect-square items-center justify-center bg-[#fafbfa] p-5">
                  <span className={`absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.stocked ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fdf6e7] text-[#8a5a00]"}`}>{p.stocked ? "Skladom" : "Na objednávku"}</span>
                  <ProductImg src={p.i} alt={p.n} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 208px" iconSize={36} />
                </Link>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-2 line-clamp-1">{p.c}</span>
                  <Link prefetch={false} href={`/katalog/${p.slug}`} className="line-clamp-2 text-[14px] font-medium leading-snug text-ink transition hover:text-brand">{p.n}</Link>
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
                  {p.price.kind === "PRICE" && <AddBtn productId={p.id} repeat={repeatMode} />}
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && <p className="mt-14 text-center text-muted">Nič sa nenašlo. <button type="button" onClick={clearAll} className="font-semibold text-brand">Zrušiť filtre</button></p>}

          {pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => go({ page: page - 1 })} className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">‹ Späť</button>
              <span className="text-[14px] text-muted">Strana <span className="font-semibold text-ink">{page}</span> z {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => go({ page: page + 1 })} className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">Ďalej ›</button>
            </div>
          )}
        </div>
      </div>

      {/* mobilný drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-deep/40" onClick={() => setFiltersOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Filtre" className="absolute inset-y-0 right-0 flex w-[88%] max-w-[360px] flex-col bg-cream">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <span className="text-[16px] font-semibold text-ink">Filtre</span>
              <button ref={drawerCloseRef} type="button" onClick={() => setFiltersOpen(false)} aria-label="Zavrieť" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white">
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
