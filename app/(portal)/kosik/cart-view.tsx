"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CartDetail } from "@/lib/cart";
import { setQty, removeItem, createOrder } from "./actions";
import { ProductImg } from "@/components/product-img";
import { sumMoney2, vatOf2 } from "@/lib/money-client";

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

/** Množstvo v košíku: −/+ stepper + zapisovateľné pole (50 ks netreba naklikať).
 *  Commit na blur/Enter; rodič ho po serverovej revalidácii remountne cez qty v key. */
function CartQty({ qty, disabled, onCommit }: { qty: number; disabled: boolean; onCommit: (n: number) => void }) {
  const [val, setVal] = useState(String(qty));
  const commit = (n: number) => {
    const c = Math.max(1, Math.min(9999, Math.floor(n) || 1));
    setVal(String(c));
    if (c !== qty) onCommit(c);
  };
  return (
    <div className="flex items-center rounded-[9px] border border-line">
      <button aria-label="Znížiť množstvo" onClick={() => commit(qty - 1)} disabled={disabled} className="px-2.5 py-1.5 text-[15px] text-muted hover:text-ink disabled:opacity-50">−</button>
      <input
        aria-label="Množstvo"
        inputMode="numeric"
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => commit(Number(val))}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        disabled={disabled}
        className="w-11 border-x border-line bg-transparent py-1.5 text-center text-[14px] tabular-nums text-ink outline-none focus:bg-mintbg/30 disabled:opacity-50"
      />
      <button aria-label="Zvýšiť množstvo" onClick={() => commit(qty + 1)} disabled={disabled} className="px-2.5 py-1.5 text-[15px] text-muted hover:text-ink disabled:opacity-50">+</button>
    </div>
  );
}

type Loc = { id: string; label: string; street: string | null; city: string | null; zip: string | null };
type Billing = { name: string; ico: string; address: string | null; city: string | null };
type DeliveryOpt = { code: string; label: string; description: string | null; requiresAddress: boolean; flatFee: number; freeThreshold: number | null };
type PaymentOpt = { code: string; label: string; description: string | null; surcharge: number };

const inp = "rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";
const sectionH = "mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-2";

function shippingFor(d: DeliveryOpt, itemsNet: number) {
  return d.freeThreshold != null && itemsNet >= d.freeThreshold ? 0 : d.flatFee;
}

export function CartView({ cart, locations = [], billing = null, delivery, payment, splatDays, vatRate }: {
  cart: CartDetail; locations?: Loc[]; billing?: Billing | null;
  delivery: DeliveryOpt[]; payment: PaymentOpt[]; splatDays: number; vatRate: number;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const hasLocations = locations.length > 0;
  const [addrMode, setAddrMode] = useState<"saved" | "new">(hasLocations ? "saved" : "new");
  const [otherAddr, setOtherAddr] = useState(false); // false = doručiť na fakturačnú adresu
  const [deliveryLocationId, setDeliveryLocationId] = useState<string>(locations[0]?.id ?? "");
  const [na, setNa] = useState({ label: "", street: "", city: "", zip: "" });
  const [selDel, setSelDel] = useState<string>(delivery[0]?.code ?? "");
  const [selPay, setSelPay] = useState<string>(payment[0]?.code ?? "");
  const [done, setDone] = useState<string | null>(null);
  const [donePending, setDonePending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const selDelObj = delivery.find((d) => d.code === selDel);
  const selPayObj = payment.find((p) => p.code === selPay);
  const needsAddress = selDelObj?.requiresAddress ?? true;
  const shipping = selDelObj ? shippingFor(selDelObj, cart.subtotalNet) : 0;
  const surcharge = selPayObj?.surcharge ?? 0;
  // náhľad počíta zhodne so serverom (resolveOrderCharges): centová aritmetika, polovica nahor
  const extrasVat = vatOf2(sumMoney2([shipping, surcharge]), vatRate);
  const grandVat = sumMoney2([cart.vat, extrasVat]);
  const grandTotal = sumMoney2([cart.subtotalNet, shipping, surcharge, grandVat]);

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
        <h2 className="text-[20px] font-semibold text-ink">{donePending ? `Objednávka ${done} odoslaná na schválenie` : `Objednávka ${done} prijatá`}</h2>
        <p className="mt-2 text-[14.5px] text-muted">{donePending ? "Objednávku musí schváliť poverený kolega. Po schválení ju spracujeme." : "Ozveme sa s potvrdením. Stav nájdete v sekcii Objednávky."}</p>
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
    if (!termsAccepted) {
      setErr("Pred odoslaním potvrďte súhlas s obchodnými podmienkami.");
      return;
    }
    if (needsAddress && otherAddr && addrMode === "new" && (!na.street.trim() || !na.city.trim() || !na.zip.trim())) {
      setErr("Vyplňte dodaciu adresu — ulica, mesto a PSČ.");
      return;
    }
    start(async () => {
      // odber → bez adresy; fakturačná (otherAddr=false) → deliveryLocationId null; inak saved/new
      const addr = !needsAddress || !otherAddr
        ? {}
        : (addrMode === "new"
            ? { newAddress: { label: na.label.trim() || undefined, street: na.street.trim(), city: na.city.trim(), zip: na.zip.trim() } }
            : { deliveryLocationId: deliveryLocationId || null });
      const res = await createOrder({ note, poNumber, deliveryCode: selDel, paymentCode: selPay, termsAccepted, ...addr });
      if (!res.ok) { setErr(res.error ?? "Objednávku sa nepodarilo odoslať."); return; }
      setDonePending(!!res.pendingApproval);
      setDone(res.number ?? "");
    });
  }

  return (
    <>
      <Link href="/katalog" className="mb-4 inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink transition hover:border-brand/40 hover:text-brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        Späť do obchodu
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Položky */}
        <div className="flex flex-col gap-3">
          {cart.items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line bg-white p-3.5 sm:flex-nowrap">
              <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-[#fafbfa] p-1.5">
                <ProductImg src={it.i} alt={it.n} sizes="64px" iconSize={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium leading-snug text-ink">{it.n}</div>
                <div className="text-[12.5px] text-muted-2">{it.price.kind === "PRICE" ? `${eur(it.price.net)} / ${it.unit} bez DPH` : "Cena na vyžiadanie"}</div>
              </div>
              <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                <CartQty key={`${it.id}:${it.qty}`} qty={it.qty} disabled={pending} onCommit={(n) => start(async () => { await setQty(it.id, n); })} />
                <div className="text-right text-[14.5px] font-semibold text-ink sm:w-[92px]">{it.lineNet != null ? eur(it.lineNet) : "—"}</div>
                <button aria-label="Odobrať položku" onClick={() => start(async () => { await removeItem(it.id); })} disabled={pending} title="Odobrať" className="flex-none text-muted-2 transition hover:text-[#9a3025] disabled:opacity-50">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout — sekcie */}
        <div className="flex flex-col gap-4">
          {/* Doprava */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h3 className={sectionH}>Doprava</h3>
            <div className="flex flex-col gap-2">
              {delivery.map((d) => {
                const fee = shippingFor(d, cart.subtotalNet);
                const active = selDel === d.code;
                return (
                  <label key={d.code} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${active ? "border-brand bg-mintbg/30" : "border-line hover:border-mint-2"}`}>
                    <input type="radio" name="delivery" checked={active} onChange={() => setSelDel(d.code)} className="mt-0.5 h-4 w-4 flex-none accent-[#163f38]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14.5px] font-medium text-ink">{d.label}</span>
                        <span className="flex-none text-[13.5px] font-semibold text-brand">{fee === 0 ? "Zdarma" : `+ ${eur(fee)}`}</span>
                      </div>
                      {d.description && <div className="mt-0.5 text-[12.5px] leading-snug text-muted-2">{d.description}</div>}
                      {d.freeThreshold != null && fee > 0 && <div className="mt-0.5 text-[12px] font-medium text-brand-2">Zdarma nad {eur(d.freeThreshold)} bez DPH</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Dodanie — fakturačná / iná dodacia adresa alebo odberné miesto */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h3 className={sectionH}>{needsAddress ? "Dodanie" : "Odberné miesto"}</h3>
            {!needsAddress ? (
              <p className="text-[14px] leading-relaxed text-muted-3">{selDelObj?.description || "Tovar si vyzdvihnete u nás. Detaily potvrdíme."}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-2.5 text-[14px] text-ink">
                  <input type="checkbox" checked={otherAddr} onChange={(e) => setOtherAddr(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[#163f38]" />
                  <span>Doručiť na inú adresu <span className="text-muted-2">(nie fakturačnú)</span></span>
                </label>
                {!otherAddr ? (
                  <div className="rounded-lg border border-line bg-[#fafbfa] px-3 py-2.5 text-[13.5px] text-muted-3">
                    Doručíme na fakturačnú adresu: <span className="font-medium text-ink">{billing ? ([billing.address, billing.city].filter(Boolean).join(", ") || "—") : "—"}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {hasLocations && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-muted-3">{addrMode === "saved" ? "Uložená adresa" : "Nová adresa"}</span>
                        <button type="button" onClick={() => setAddrMode(addrMode === "saved" ? "new" : "saved")} className="text-[12px] font-semibold text-brand transition hover:text-brand-2">
                          {addrMode === "saved" ? "+ Zadať novú" : "Použiť uloženú"}
                        </button>
                      </div>
                    )}
                    {addrMode === "saved" && hasLocations ? (
                      <select aria-label="Uložená dodacia adresa" value={deliveryLocationId} onChange={(e) => setDeliveryLocationId(e.target.value)} className={`${inp} w-full`}>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.label}{[l.street, l.city].filter(Boolean).length ? ` — ${[l.street, l.city].filter(Boolean).join(", ")}` : ""}</option>)}
                      </select>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input aria-label="Ulica a číslo" value={na.street} onChange={(e) => setNa({ ...na, street: e.target.value })} placeholder="Ulica a číslo *" className={inp} />
                        <div className="flex gap-2">
                          <input aria-label="Mesto" value={na.city} onChange={(e) => setNa({ ...na, city: e.target.value })} placeholder="Mesto *" className={`${inp} flex-1`} />
                          <input aria-label="PSČ" value={na.zip} onChange={(e) => setNa({ ...na, zip: e.target.value })} placeholder="PSČ *" className={`${inp} w-24`} />
                        </div>
                        <input aria-label="Označenie adresy (nepovinné)" value={na.label} onChange={(e) => setNa({ ...na, label: e.target.value })} placeholder="Označenie (napr. Prevádzka centrum) — nepovinné" className={inp} />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[11.5px] text-muted-2">Termín doručíme podľa nášho rozvozového plánu — potvrdíme ho.</p>
              </div>
            )}
          </section>

          {/* Platba */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h3 className={sectionH}>Platba</h3>
            <div className="flex flex-col gap-2">
              {payment.map((p) => {
                const active = selPay === p.code;
                return (
                  <label key={p.code} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${active ? "border-brand bg-mintbg/30" : "border-line hover:border-mint-2"}`}>
                    <input type="radio" name="payment" checked={active} onChange={() => setSelPay(p.code)} className="mt-0.5 h-4 w-4 flex-none accent-[#163f38]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14.5px] font-medium text-ink">{p.label}</span>
                        {p.surcharge > 0 && <span className="flex-none text-[13.5px] font-semibold text-brand">+ {eur(p.surcharge)}</span>}
                      </div>
                      {p.description && <div className="mt-0.5 text-[12.5px] leading-snug text-muted-2">{p.description}</div>}
                      {p.code === "faktura" && <div className="mt-0.5 text-[12px] font-medium text-brand-2">Splatnosť {splatDays} dní</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Súhrn */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h3 className={sectionH}>Súhrn</h3>
            <div className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between text-muted"><span>Medzisúčet (tovar, bez DPH)</span><span className="tabular-nums text-ink">{eur(cart.subtotalNet)}</span></div>
              <div className="flex justify-between text-muted"><span>Doprava{selDelObj ? ` · ${selDelObj.label}` : ""}</span><span className="tabular-nums text-ink">{shipping === 0 ? "Zdarma" : eur(shipping)}</span></div>
              {surcharge > 0 && <div className="flex justify-between text-muted"><span>{selPayObj?.label}</span><span className="tabular-nums text-ink">{eur(surcharge)}</span></div>}
              <div className="flex justify-between text-muted"><span>DPH</span><span className="tabular-nums text-ink">{eur(grandVat)}</span></div>
              <div className="mt-1 flex justify-between border-t border-line pt-2.5 text-[16px] font-semibold text-ink"><span>Spolu s DPH</span><span className="tabular-nums">{eur(grandTotal)}</span></div>
            </div>

            {billing && (
              <div className="mt-4 rounded-lg border border-line bg-[#fafbfa] px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Fakturácia</div>
                <div className="mt-0.5 font-medium text-ink">{billing.name}</div>
                <div>IČO {billing.ico}{[billing.address, billing.city].filter(Boolean).length ? ` · ${[billing.address, billing.city].filter(Boolean).join(", ")}` : ""}</div>
              </div>
            )}

            {cart.hasOnRequest && (
              <div className="mt-3 rounded-lg bg-[#fdf6e7] px-3 py-2.5 text-[12.5px] text-[#8a5a00]">
                Niektoré položky sú na vyžiadanie a nedajú sa objednať online.
                <button onClick={removeOnRequest} disabled={pending} className="mt-1.5 block font-semibold underline disabled:opacity-50">Odobrať položky na vyžiadanie</button>
              </div>
            )}
            <input aria-label="Objednávkové číslo alebo referencia (nepovinné)" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} maxLength={60} placeholder="Objednávkové číslo / referencia (nepovinné)" className={`${inp} mt-3 w-full`} />
            <textarea aria-label="Poznámka k objednávke (nepovinné)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Poznámka k objednávke (nepovinné)…" className={`${inp} mt-2 w-full`} />
            <label className="mt-3 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-3">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[#163f38]" />
              <span>Potvrdzujem, že som sa oboznámil s <Link href="/obchodne-podmienky" target="_blank" className="font-semibold text-brand underline underline-offset-2">obchodnými podmienkami</Link> a súhlasím s nimi. Odoslanie je záväzný návrh; zmluva vznikne až samostatným potvrdením Moonid.</span>
            </label>
            {err && <p role="alert" className="mt-2 text-[13px] text-[#9a3025]">{err}</p>}
            <button onClick={order} disabled={pending || cart.hasOnRequest} className="mt-3 w-full rounded-[11px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
              {pending ? "Odosielam…" : "Odoslať objednávku"}
            </button>
            <p className="mt-2 text-center text-[11.5px] text-muted-2">Po odoslaní dostanete potvrdenie prijatia; akceptáciu objednávky pošleme samostatne.</p>
          </section>
        </div>
      </div>
    </>
  );
}
