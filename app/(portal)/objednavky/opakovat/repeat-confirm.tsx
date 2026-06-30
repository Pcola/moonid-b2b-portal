"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeRepeatOrder, priceBySku } from "../../kosik/actions";

type SourceLine = { name: string; qty: number; net: number | null; usable: boolean };
type Extra = { sku: string; name: string; qty: number; net: number };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
function r2(n: number) { return Math.round(n * 100) / 100; }

export function RepeatOrderConfirm({ sourceOrderId, items, deliveryText, note }: {
  sourceOrderId: string; items: SourceLine[]; deliveryText: string | null; note: string | null;
}) {
  const router = useRouter();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [skuInput, setSkuInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const usableSource = items.filter((i) => i.usable);
  const sourceNet = usableSource.reduce((s, i) => s + r2((i.net ?? 0) * i.qty), 0);
  const extrasNet = extras.reduce((s, e) => s + r2(e.net * e.qty), 0);
  const subtotal = r2(sourceNet + extrasNet);
  const canOrder = usableSource.length + extras.length > 0;

  async function addExtra() {
    const q = skuInput.trim();
    if (!q || adding) return;
    setAdding(true); setAddMsg(null);
    const res = await priceBySku(q);
    setAdding(false);
    if (!res.ok || res.lines.length === 0) {
      setAddMsg(res.notFound?.length ? `Nenájdené SKU: ${res.notFound.join(", ")}` : "Nič sa nepridalo (skontrolujte SKU).");
      return;
    }
    setExtras((prev) => {
      const map = new Map(prev.map((e) => [e.sku, { ...e }]));
      for (const l of res.lines) {
        const ex = map.get(l.sku);
        if (ex) ex.qty += l.qty; else map.set(l.sku, { sku: l.sku, name: l.name, qty: l.qty, net: l.net });
      }
      return [...map.values()];
    });
    setSkuInput("");
    const notes: string[] = [];
    if (res.notFound.length) notes.push(`nenájdené: ${res.notFound.join(", ")}`);
    if (res.onRequest.length) notes.push(`na vyžiadanie: ${res.onRequest.join(", ")}`);
    setAddMsg(notes.length ? notes.join(" · ") : null);
  }

  function confirm() {
    setErr(null);
    start(async () => {
      const res = await placeRepeatOrder(sourceOrderId, extras.map((e) => ({ sku: e.sku, qty: e.qty })));
      if (!res.ok) { setErr(res.error ?? "Nepodarilo sa objednať."); return; }
      router.push(`/objednavky/${res.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-5 py-3.5 text-[13px] font-semibold uppercase tracking-wide text-muted-2">Položky</div>
        {items.map((l, i) => (
          <div key={`s${i}`} className={`flex items-center justify-between gap-4 px-5 py-3 ${i ? "border-t border-line" : ""} ${l.usable ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] text-ink">{l.name}</div>
              {!l.usable && <div className="text-[12px] text-[#9a6b0e]">nedostupné / na vyžiadanie — vynechá sa</div>}
            </div>
            <div className="flex flex-none items-center gap-4 text-right">
              <span className="text-[13.5px] text-muted-2">{l.qty} ks</span>
              <span className="w-[90px] text-[14px] font-semibold tabular-nums text-ink">{l.usable ? eur(r2((l.net ?? 0) * l.qty)) : "—"}</span>
            </div>
          </div>
        ))}
        {extras.map((e) => (
          <div key={`e${e.sku}`} className="flex items-center justify-between gap-4 border-t border-line bg-mintbg/20 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-[14.5px] text-ink">{e.name}</div>
              <div className="text-[12px] text-brand-2">doobjednané · <span className="font-mono text-muted-2">{e.sku}</span></div>
            </div>
            <div className="flex flex-none items-center gap-4 text-right">
              <span className="text-[13.5px] text-muted-2">{e.qty} ks</span>
              <span className="w-[90px] text-[14px] font-semibold tabular-nums text-ink">{eur(r2(e.net * e.qty))}</span>
              <button onClick={() => setExtras((prev) => prev.filter((x) => x.sku !== e.sku))} aria-label="Odobrať" className="text-muted-2 transition hover:text-[#9a3025]">✕</button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line bg-cream/50 px-5 py-3.5">
          <span className="text-[14px] font-semibold text-ink">Medzisúčet (bez DPH)</span>
          <span className="text-[16px] font-semibold tabular-nums text-ink">{eur(subtotal)}</span>
        </div>
      </div>

      {/* doobjednať ďalší tovar */}
      <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-4">
        <div className="text-[13.5px] font-semibold text-ink">Doobjednať ďalší tovar</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }}
            placeholder="SKU, množstvo (napr. MYDLO-5L, 2)"
            className="min-w-[220px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand"
          />
          <button onClick={addExtra} disabled={adding || !skuInput.trim()} className="rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
            {adding ? "…" : "Pridať"}
          </button>
        </div>
        {addMsg && <p className="mt-1.5 text-[12.5px] text-[#9a6b0e]">{addMsg}</p>}
        <p className="mt-1.5 text-[12px] text-muted-2">SKU nájdete pri produkte v katalógu.</p>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-2">Dodacia adresa</div>
        <div className="mt-1.5 text-[14.5px] text-ink">{deliveryText ?? <span className="text-muted">Bez uloženej adresy — rozvoz dohodneme telefonicky.</span>}</div>
        {note && <div className="mt-2 text-[13px] text-muted">Poznámka: {note}</div>}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button onClick={confirm} disabled={pending || !canOrder} className="inline-flex w-fit items-center gap-2 rounded-[11px] bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          {pending ? "Objednávam…" : "Potvrdiť a objednať"}
        </button>
        {err && <span className="text-[13px] text-[#9a3025]">{err}</span>}
        {!canOrder && <span className="text-[13px] text-[#9a3025]">Žiadna položka nie je dostupná na objednanie.</span>}
        <p className="text-[12.5px] text-muted-2">Bez platby vopred — platíte faktúrou so splatnosťou. Termín rozvozu potvrdíme.</p>
      </div>
    </>
  );
}
