"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CartDetail } from "@/lib/cart";
import { setQty, removeItem, createOrder } from "./actions";

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

type Loc = { id: string; label: string; street: string | null; city: string | null; zip: string | null };
type Billing = { name: string; ico: string; address: string | null; city: string | null };

const inp = "rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";

export function CartView({ cart, locations = [], billing = null }: { cart: CartDetail; locations?: Loc[]; billing?: Billing | null }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const hasLocations = locations.length > 0;
  const [addrMode, setAddrMode] = useState<"saved" | "new">(hasLocations ? "saved" : "new");
  const [deliveryLocationId, setDeliveryLocationId] = useState<string>(locations[0]?.id ?? "");
  const [na, setNa] = useState({ label: "", street: "", city: "", zip: "" });
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function removeOnRequest() {
    start(async () => {
      for (const it of cart.items) if (it.price.kind !== "PRICE") await removeItem(it.id);
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mintbg text-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 className="text-[20px] font-semibold text-ink">Objednávka {done} prijatá</h2>
        <p className="mt-2 text-[14.5px] text-muted">Ozveme sa s potvrdením. Stav nájdete v sekcii Objednávky.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/objednavky" className="rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">Moje objednávky</Link>
          <Link href="/katalog" className="rounded-[10px] border border-line px-5 py-2.5 text-[14px] font-medium text-ink transition hover:border-brand/40">Pokračovať v nákupe</Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">
        Košík je prázdny. <Link href="/katalog" className="font-semibold text-brand hover:text-brand-2">Prejsť do katalógu</Link>
      </div>
    );
  }

  function order() {
    setErr(null);
    if (addrMode === "new" && (!na.street.trim() || !na.city.trim() || !na.zip.trim())) {
      setErr("Vyplňte dodaciu adresu — ulica, mesto a PSČ.");
      return;
    }
    start(async () => {
      const delivery = addrMode === "new"
        ? { newAddress: { label: na.label.trim() || undefined, street: na.street.trim(), city: na.city.trim(), zip: na.zip.trim() } }
        : { deliveryLocationId: deliveryLocationId || null };
      const res = await createOrder({ note, ...delivery });
      if (!res.ok) { setErr(res.error ?? "Objednávku sa nepodarilo odoslať."); return; }
      setDone(res.number ?? "");
    });
  }

  return (
    <>
    <Link href="/katalog" className="mb-4 inline-flex items-center gap-2 text-[13.5px] font-medium text-muted transition hover:text-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
      Pokračovať v nákupe
    </Link>
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-3">
        {cart.items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 rounded-xl border border-line bg-white p-3.5">
            <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-[#fafbfa]">
              {it.i ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.i} alt="" className="max-h-full max-w-full object-contain p-1.5" />
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-muted-2 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-medium text-ink">{it.n}</div>
              <div className="text-[12.5px] text-muted-2">{it.price.kind === "PRICE" ? `${eur(it.price.net)} / ${it.unit} bez DPH` : "Cena na vyžiadanie"}</div>
            </div>
            <div className="flex items-center rounded-[9px] border border-line">
              <button aria-label="Znížiť množstvo" onClick={() => start(async () => { await setQty(it.id, it.qty - 1); })} disabled={pending} className="px-2.5 py-1.5 text-[15px] text-muted hover:text-ink disabled:opacity-50">−</button>
              <span className="min-w-[34px] text-center text-[14px] tabular-nums text-ink">{it.qty}</span>
              <button aria-label="Zvýšiť množstvo" onClick={() => start(async () => { await setQty(it.id, it.qty + 1); })} disabled={pending} className="px-2.5 py-1.5 text-[15px] text-muted hover:text-ink disabled:opacity-50">+</button>
            </div>
            <div className="w-[92px] text-right text-[14.5px] font-semibold text-ink">{it.lineNet != null ? eur(it.lineNet) : "—"}</div>
            <button aria-label="Odobrať položku" onClick={() => start(async () => { await removeItem(it.id); })} disabled={pending} title="Odobrať" className="text-muted-2 transition hover:text-[#9a3025] disabled:opacity-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex h-fit flex-col gap-4 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-[88px]">
        <div className="flex flex-col gap-2 text-[14px]">
          <div className="flex justify-between text-muted"><span>Medzisúčet (bez DPH)</span><span className="tabular-nums text-ink">{eur(cart.subtotalNet)}</span></div>
          <div className="flex justify-between text-muted"><span>DPH</span><span className="tabular-nums text-ink">{eur(cart.vat)}</span></div>
          <div className="mt-1 flex justify-between border-t border-line pt-2.5 text-[16px] font-semibold text-ink"><span>Spolu s DPH</span><span className="tabular-nums">{eur(cart.totalGross)}</span></div>
        </div>

        {/* Fakturačné údaje — z firemného profilu, read-only */}
        {billing && (
          <div className="rounded-lg border border-line bg-[#fafbfa] px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Fakturácia</div>
            <div className="mt-0.5 font-medium text-ink">{billing.name}</div>
            <div>IČO {billing.ico}{[billing.address, billing.city].filter(Boolean).length ? ` · ${[billing.address, billing.city].filter(Boolean).join(", ")}` : ""}</div>
            <div className="mt-1 text-muted-2">Fakturuje sa na firemné údaje. Zmena? Kontaktujte nás.</div>
          </div>
        )}

        {/* Dodacia adresa */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-muted-3">Dodacia adresa</span>
            {hasLocations && (
              <button type="button" onClick={() => setAddrMode(addrMode === "saved" ? "new" : "saved")} className="text-[12px] font-semibold text-brand transition hover:text-brand-2">
                {addrMode === "saved" ? "+ Nová adresa" : "Použiť uloženú"}
              </button>
            )}
          </div>
          {addrMode === "saved" && hasLocations ? (
            <select value={deliveryLocationId} onChange={(e) => setDeliveryLocationId(e.target.value)} className={inp}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}{[l.street, l.city].filter(Boolean).length ? ` — ${[l.street, l.city].filter(Boolean).join(", ")}` : ""}</option>)}
            </select>
          ) : (
            <div className="flex flex-col gap-2">
              <input value={na.street} onChange={(e) => setNa({ ...na, street: e.target.value })} placeholder="Ulica a číslo *" className={inp} />
              <div className="flex gap-2">
                <input value={na.city} onChange={(e) => setNa({ ...na, city: e.target.value })} placeholder="Mesto *" className={`${inp} flex-1`} />
                <input value={na.zip} onChange={(e) => setNa({ ...na, zip: e.target.value })} placeholder="PSČ *" className={`${inp} w-24`} />
              </div>
              <input value={na.label} onChange={(e) => setNa({ ...na, label: e.target.value })} placeholder="Označenie (napr. Prevádzka centrum) — nepovinné" className={inp} />
            </div>
          )}
          <p className="text-[11.5px] text-muted-2">Termín doručíme podľa nášho rozvozového plánu — potvrdíme ho.</p>
        </div>

        {cart.hasOnRequest && (
          <div className="rounded-lg bg-[#fdf6e7] px-3 py-2.5 text-[12.5px] text-[#8a5a00]">
            Niektoré položky sú na vyžiadanie a nedajú sa objednať online.
            <button onClick={removeOnRequest} disabled={pending} className="mt-1.5 block font-semibold underline disabled:opacity-50">Odobrať položky na vyžiadanie</button>
          </div>
        )}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Poznámka k objednávke (nepovinné)…" className={inp} />
        {err && <p className="text-[13px] text-[#9a3025]">{err}</p>}
        <button onClick={order} disabled={pending || cart.hasOnRequest} className="rounded-[11px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          {pending ? "Odosielam…" : "Odoslať objednávku"}
        </button>
        <p className="text-center text-[11.5px] text-muted-2">Objednávku potvrdíme — nie je to okamžitý nákup.</p>
      </div>
    </div>
    </>
  );
}
