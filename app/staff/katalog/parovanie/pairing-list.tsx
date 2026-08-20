"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { searchPohodaProducts, manualPair, rejectMatch } from "../actions";
import { ProductImg } from "@/components/product-img";

type Item = {
  id: string;
  externalSku: string | null;
  title: string | null;
  imageUrl: string | null;
  brand: string | null;
  productId: string | null;
  matchStatus: string;
  product: { sku: string; name: string; nameDisplay: string | null } | null;
};
type Hit = { id: string; sku: string; name: string };

function PairingRow({ item }: { item: Item }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [searching, setSearching] = useState(false);
  const [done, setDone] = useState<null | "paired" | "rejected">(null);

  useEffect(() => {
    if (selected || q.trim().length < 2) return;
    let alive = true;
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await searchPohodaProducts(q);
      if (alive) { setResults(r); setSearching(false); }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q, selected]);

  function pair() {
    if (!selected) return;
    start(async () => {
      const res = await manualPair(item.id, selected.id);
      if (res.ok) { setDone("paired"); router.refresh(); }
    });
  }
  function reject() {
    start(async () => { await rejectMatch(item.id); setDone("rejected"); router.refresh(); });
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-cream/50 px-4 py-3 text-[13.5px]">
        <span className={done === "paired" ? "text-brand-2" : "text-muted-2"}>
          {done === "paired" ? `✓ Napárované na ${selected?.sku}` : "✗ Odmietnuté"}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-white p-4 md:grid-cols-[1fr_1.3fr]">
      {/* HUMED feed položka */}
      <div className="flex gap-3">
        <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-cream">
          {item.imageUrl ? <ProductImg src={`/api/img?id=${item.id}`} alt={item.title ?? "Feed produkt"} sizes="64px" iconSize={24} /> : <span className="text-[10px] text-muted-2">bez obr.</span>}
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">Feed · {item.externalSku ?? "—"}{item.brand ? ` · ${item.brand}` : ""}</div>
          <div className="text-[14px] text-ink">{item.title ?? "—"}</div>
          {item.product && <div className="mt-0.5 text-[12px] text-brand-2">teraz: {item.product.nameDisplay || item.product.name} ({item.product.sku})</div>}
        </div>
      </div>

      {/* Výber Pohoda produktu */}
      <div className="flex flex-col gap-2">
        {selected ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-brand/30 bg-mintbg/40 px-3 py-2">
            <span className="min-w-0 truncate text-[13.5px] text-ink"><b className="font-mono text-[12px]">{selected.sku}</b> · {selected.name}</span>
            <button onClick={() => { setSelected(null); setQ(""); }} className="flex-none text-[12px] font-semibold text-muted hover:text-ink">zmeniť</button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Hľadať Pohoda produkt (názov/SKU)…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand"
            />
            {q.trim().length >= 2 && (searching || results.length > 0) && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-white shadow-lg">
                {searching && <div className="px-3 py-2 text-[13px] text-muted-2">Hľadám…</div>}
                {!searching && results.length === 0 && <div className="px-3 py-2 text-[13px] text-muted-2">Žiadne výsledky.</div>}
                {results.map((r) => (
                  <button key={r.id} onClick={() => { setSelected(r); setResults([]); }} className="block w-full px-3 py-2 text-left text-[13.5px] text-ink transition hover:bg-cream">
                    <span className="font-mono text-[12px] text-muted-2">{r.sku}</span> · {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={pair} disabled={!selected || pending} className="rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-40">
            {pending ? "…" : "Napárovať a potvrdiť"}
          </button>
          <button onClick={reject} disabled={pending} className="rounded-lg border border-line px-4 py-2 text-[13.5px] font-medium text-muted transition hover:border-brand/40 hover:text-ink disabled:opacity-50">
            Nemá ekvivalent
          </button>
        </div>
      </div>
    </div>
  );
}

export function PairingList({ items, total, unmatchedCount, page, pageSize, filter, q }: {
  items: Item[]; total: number; unmatchedCount: number; page: number; pageSize: number; filter: "unmatched" | "all"; q: string;
}) {
  const [search, setSearch] = useState(q);
  const router = useRouter();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function go(params: Record<string, string>) {
    const sp = new URLSearchParams();
    sp.set("filter", params.filter ?? filter);
    if (params.q ?? q) sp.set("q", params.q ?? q);
    if (params.page) sp.set("page", params.page);
    router.push(`/staff/katalog/parovanie?${sp.toString()}`);
  }

  return (
    <div className="max-w-[1100px]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/staff/katalog" className="text-[14px] font-semibold text-brand transition hover:text-brand-2">← Katalóg</Link>
        <h1 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Manuálne párovanie feedu</h1>
      </div>
      <p className="text-[14.5px] text-muted-3">Pre každú feed položku vyhľadaj a vyber zodpovedajúci Pohoda produkt. Po napárovaní sa skopíruje obrázok (do tvojho úložiska) a popis.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-line bg-white p-0.5 text-[13px] font-semibold">
          <button onClick={() => go({ filter: "unmatched", page: "1" })} className={`rounded-md px-3 py-1.5 ${filter === "unmatched" ? "bg-brand text-white" : "text-muted"}`}>Nenapárované ({unmatchedCount})</button>
          <button onClick={() => go({ filter: "all", page: "1" })} className={`rounded-md px-3 py-1.5 ${filter === "all" ? "bg-brand text-white" : "text-muted"}`}>Všetky</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); go({ q: search, page: "1" }); }} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hľadať vo feede…" className="w-[200px] bg-transparent text-[14px] text-ink outline-none" />
          <button type="submit" className="text-[13px] font-semibold text-brand">Hľadať</button>
        </form>
        <span className="text-[13px] text-muted-2">{total} položiek</span>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-line bg-cream p-10 text-center text-muted">Žiadne položky. 🎉</div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((it) => <PairingRow key={it.id} item={it} />)}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-[13.5px]">
          <button disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink disabled:opacity-40">← Späť</button>
          <span className="text-muted-2">strana {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => go({ page: String(page + 1) })} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink disabled:opacity-40">Ďalej →</button>
        </div>
      )}
    </div>
  );
}
