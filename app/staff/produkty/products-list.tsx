"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setProductPublished } from "./actions";

type Item = {
  id: string; sku: string; name: string; unit: string; basePrice: number | null;
  isPublished: boolean; isSubsidized: boolean; category: string | null; image: string;
};
type Active = { q: string; status: string; cat: string };

function eur(n: number | null) { return n == null ? "—" : n.toFixed(2).replace(".", ",") + " €"; }

export function ProductsList({ items, total, page, pageSize, cats, counts, active }: {
  items: Item[]; total: number; page: number; pageSize: number;
  cats: { id: string; name: string }[]; counts: { pub: number; hid: number; req: number }; active: Active;
}) {
  const router = useRouter();
  const [q, setQ] = useState(active.q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function go(patch: Partial<Active & { page: number }>) {
    const merged: Record<string, string> = { q: active.q, status: active.status, cat: active.cat, page: "1", ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) { if (v && !(k === "page" && v === "1")) usp.set(k, v); }
    const qs = usp.toString();
    router.push(qs ? `/staff/produkty?${qs}` : "/staff/produkty");
  }

  const STATUS = [
    { key: "", label: "Všetky", n: null as number | null },
    { key: "pub", label: "Publikované", n: counts.pub },
    { key: "hid", label: "Skryté", n: counts.hid },
    { key: "req", label: "Na vyžiadanie", n: counts.req },
  ];

  return (
    <div className="flex max-w-[1240px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => {
            const on = active.status === s.key;
            return (
              <button key={s.key || "all"} type="button" onClick={() => go({ status: s.key })}
                className={`rounded-full border px-[15px] py-2 text-[13.5px] font-medium transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:border-mint-2"}`}>
                {s.label}{s.n != null && <span className={`ml-1.5 ${on ? "text-mint" : "text-muted-2"}`}>{s.n}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={active.cat} onChange={(e) => go({ cat: e.target.value })}
              className="cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-2 pl-3.5 pr-9 text-[14px] font-medium text-ink outline-none transition hover:border-brand/40">
              <option value="">Všetky kategórie</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>
          <div className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86827A" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <form onSubmit={(e) => { e.preventDefault(); go({ q }); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Názov alebo SKU…" className="w-[160px] bg-transparent text-[14px] text-ink outline-none" />
            </form>
          </div>
          <Link href="/staff/katalog/novy" className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Pridať
          </Link>
        </div>
      </div>

      <p className="text-[13.5px] text-muted-2"><span className="font-semibold text-ink">{total}</span> produktov{total > 0 ? ` · ${from}–${to}` : ""}</p>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-[44px_1.6fr_1fr_auto_auto_auto] items-center gap-4 border-b border-line bg-cream/60 px-[18px] py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
          <span></span><span>Produkt</span><span>Kategória</span><span className="text-right">Cena</span><span>Stav</span><span></span>
        </div>
        {items.length === 0 ? (
          <div className="px-[18px] py-14 text-center text-[14px] text-muted">Nič sa nenašlo.</div>
        ) : items.map((p) => (
          <div key={p.id} className="grid grid-cols-[44px_1.6fr_1fr_auto_auto_auto] items-center gap-4 border-b border-line px-[18px] py-3 last:border-0">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-line bg-[#fafbfa]">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-muted-2 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-ink">{p.name}</div>
              <div className="font-mono text-[12px] text-muted-2">{p.sku}{p.isSubsidized && <span className="ml-2 rounded bg-[#fdf6e7] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#8a5a00]">na vyžiadanie</span>}</div>
            </div>
            <span className="truncate text-[13.5px] text-muted">{p.category ?? "—"}</span>
            <span className="text-right text-[14px] font-semibold tabular-nums text-ink">{eur(p.basePrice)}<span className="ml-1 text-[11.5px] font-normal text-muted-2">/{p.unit}</span></span>
            <PublishToggle id={p.id} published={p.isPublished} />
            <Link href={`/staff/produkty/${p.id}`} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:border-brand/40">Upraviť</Link>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => go({ page: page - 1 })} className="rounded-[10px] border border-line bg-white px-4 py-2 text-[14px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">‹ Späť</button>
          <span className="text-[14px] text-muted">Strana <span className="font-semibold text-ink">{page}</span> z {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => go({ page: page + 1 })} className="rounded-[10px] border border-line bg-white px-4 py-2 text-[14px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40">Ďalej ›</button>
        </div>
      )}
    </div>
  );
}

function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function toggle() {
    start(async () => { await setProductPublished(id, !published); router.refresh(); });
  }
  return (
    <button type="button" onClick={toggle} disabled={pending} title={published ? "Skryť z katalógu" : "Publikovať"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition disabled:opacity-50 ${published ? "bg-[#ecfdf3] text-[#14633f] hover:bg-[#d6f5e4]" : "bg-[#f3f0ee] text-[#86827a] hover:bg-[#e9e5e1]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-[#14633f]" : "bg-[#86827a]"}`} />
      {pending ? "…" : published ? "Publikované" : "Skryté"}
    </button>
  );
}
