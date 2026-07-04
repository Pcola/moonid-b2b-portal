"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrder } from "../actions";
import { lineTotal2, sumMoney2, grossUnit2, vatOf2 } from "@/lib/money-client";

type Item = { id: string; name: string; sku: string; unit: string; unitPriceSnapshot: number; vatRate: number; qty: number };
type Loc = { id: string; label: string | null; street: string | null; city: string | null; zip: string | null };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export function OrderEditor({ orderId, editable, items, locations, note, deliveryLocationId, shippingFee, paymentSurcharge, vatRate }: {
  orderId: string; editable: boolean; items: Item[]; locations: Loc[]; note: string | null; deliveryLocationId: string | null;
  shippingFee: number; paymentSurcharge: number; vatRate: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, i.qty])));
  const [loc, setLoc] = useState(deliveryLocationId ?? "");
  const [noteVal, setNoteVal] = useState(note ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!editable) return null;

  const set = (id: string, v: number) => setQty((p) => ({ ...p, [id]: Math.max(0, Math.min(9999, Math.floor(v || 0))) }));
  const usable = items.filter((i) => (qty[i.id] ?? 0) > 0);
  // náhľad počíta rovnako ako server (lib/money): centová aritmetika, polovica nahor
  const subtotal = sumMoney2(usable.map((i) => lineTotal2(i.unitPriceSnapshot, qty[i.id])));
  const itemsVat = sumMoney2(usable.map((i) => lineTotal2(grossUnit2(i.unitPriceSnapshot, i.vatRate) - i.unitPriceSnapshot, qty[i.id])));
  const vat = sumMoney2([itemsVat, vatOf2(sumMoney2([shippingFee, paymentSurcharge]), vatRate)]);
  const total = sumMoney2([subtotal, shippingFee, paymentSurcharge, vat]); // doprava/príplatok ostávajú

  function reset() {
    setQty(Object.fromEntries(items.map((i) => [i.id, i.qty])));
    setLoc(deliveryLocationId ?? ""); setNoteVal(note ?? ""); setErr(null);
  }

  function save() {
    setErr(null);
    if (usable.length === 0) { setErr("Objednávka musí mať aspoň jednu položku."); return; }
    start(async () => {
      const res = await updateOrder(orderId, {
        items: items.map((i) => ({ itemId: i.id, qty: qty[i.id] ?? 0 })),
        note: noteVal, deliveryLocationId: loc || null,
      });
      if (!res.ok) { setErr(res.error ?? "Nepodarilo sa uložiť."); return; }
      setOpen(false); router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => { reset(); setOpen(true); }} className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink transition hover:border-brand/40">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
        Upraviť objednávku
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand/30 bg-white p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Úprava objednávky</h3>
        <span className="text-[12px] text-muted-2">ceny ostávajú z objednávky · mení sa množstvo/adresa</span>
      </div>

      <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
        {items.map((it) => {
          const q = qty[it.id] ?? 0;
          const removed = q <= 0;
          return (
            <div key={it.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${removed ? "opacity-45" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{it.name}</div>
                <div className="text-[11.5px] text-muted-2">{it.sku} · {eur(it.unitPriceSnapshot)}/{it.unit}</div>
              </div>
              <div className="flex flex-none items-center gap-1">
                <button onClick={() => set(it.id, q - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:border-brand/40">−</button>
                <input value={q} onChange={(e) => set(it.id, Number(e.target.value))} inputMode="numeric"
                  className="w-[52px] rounded-lg border border-line bg-white px-1 py-1 text-center text-[13.5px] text-ink outline-none focus:border-brand tabular-nums" />
                <button onClick={() => set(it.id, q + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted hover:border-brand/40">+</button>
              </div>
              <span className="w-[74px] flex-none text-right text-[13.5px] font-semibold tabular-nums text-ink">{removed ? "—" : eur(lineTotal2(it.unitPriceSnapshot, q))}</span>
              <button onClick={() => set(it.id, removed ? it.qty || 1 : 0)} title={removed ? "Vrátiť" : "Odobrať"} className="flex-none text-muted-2 transition hover:text-[#9a3025]">
                {removed
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.5 2.8L3 8" /><path d="M3 3v5h5" /></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Dodacia adresa
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-brand">
            <option value="">Fakturačná adresa firmy</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.label ? l.label + " · " : ""}{[l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Poznámka
          <input value={noteVal} onChange={(e) => setNoteVal(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13.5px] text-ink outline-none focus:border-brand" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
        <div className="text-[13.5px] text-muted">Nový súčet: <span className="font-semibold text-ink">{eur(subtotal)}</span> bez DPH · <span className="font-semibold text-brand">{eur(total)}</span> s DPH</div>
        <div className="flex items-center gap-2.5">
          {err && <span className="text-[12.5px] text-[#9a3025]">{err}</span>}
          <button onClick={() => { setOpen(false); reset(); }} className="rounded-lg border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</button>
          <button onClick={save} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">{pending ? "Ukladám…" : "Uložiť zmeny"}</button>
        </div>
      </div>
    </div>
  );
}
