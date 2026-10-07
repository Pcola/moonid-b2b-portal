"use client";

import { useState, useTransition } from "react";
import { setProductPrices } from "../actions";
import { discountedNet2, grossUnit2 } from "@/lib/money-client";
import { LiveMessage } from "@/components/ui/live-region";

type Tier = { code: string; name: string; discountPct: number };

const inp = "w-[130px] rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",") + " €";
}

/** Zmluvné ceny per produkt × cenová úroveň. Prázdne pole = platí štandardná zľava úrovne;
 *  vyplnené = pevná netto cena len pre tento produkt (override). Preview netto→brutto naživo. */
export function TierPricesEditor({
  productId,
  basePriceNet,
  vatRate,
  isSubsidized,
  tiers,
  initial,
  canEditPricing,
}: {
  productId: string;
  basePriceNet: number | null;
  vatRate: number;
  isSubsidized: boolean;
  tiers: Tier[];
  initial: Record<string, number>;
  canEditPricing: boolean;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(tiers.map((t) => [t.code, initial[t.code] != null ? String(initial[t.code]) : ""])),
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [badCode, setBadCode] = useState<string | null>(null);

  // zhodné so serverom (resolveUnitPrice/round2) — centová aritmetika, polovica nahor
  const defaultNet = (disc: number): number | null =>
    basePriceNet != null ? discountedNet2(basePriceNet, disc) : null;

  function parse(raw: string): number | null {
    const s = raw.trim().replace(",", ".");
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }

  function save() {
    setMsg(null);
    setBadCode(null); // nové uloženie → zahoď predchádzajúcu chybu poľa
    const entries: { code: string; price: number | null }[] = [];
    for (const t of tiers) {
      const p = parse(vals[t.code] ?? "");
      if (typeof p === "number" && Number.isNaN(p)) {
        setBadCode(t.code);
        setMsg({ ok: false, text: `Neplatná cena pri úrovni ${t.code}. Zadajte kladné číslo alebo nechajte prázdne.` });
        return;
      }
      entries.push({ code: t.code, price: p });
    }
    start(async () => {
      const res = await setProductPrices(productId, entries);
      setMsg(res.ok ? { ok: true, text: "Ceny uložené." } : { ok: false, text: res.error ?? "Nepodarilo sa uložiť." });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[22px]">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">Zmluvné ceny podľa úrovne</h3>
        <p className="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted-2">
          Pevná netto cena len pre tento produkt a danú úroveň. <strong>Prázdne pole</strong> = použije sa štandardná zľava úrovne
          (<code className="font-mono text-[12px]">základná cena × (1 − zľava)</code>). Prepíše sa iba tento produkt, ostatné zostávajú na percentuálnej zľave.
        </p>
      </div>

      {isSubsidized && (
        <div className="rounded-[10px] border border-[#f0e2c4] bg-[#fdf7e9] px-3.5 py-2.5 text-[12.5px] text-[#7a5a12]">
          Produkt má zapnuté <strong>„Cena na vyžiadanie"</strong> — zmluvné ceny sa neuplatnia, kým je tento prepínač aktívny.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
          {/* popis tabuľky pre čítačky */}
          <caption className="sr-only">Zmluvné ceny podľa cenovej úrovne — štandardná cena zo zľavy, zmluvná netto cena a výsledná brutto cena s DPH</caption>
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <th scope="col" className="py-2 pr-3 font-semibold">Úroveň</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Štandardná (zo zľavy)</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Zmluvná netto</th>
              <th scope="col" className="py-2 font-semibold">Brutto s DPH</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => {
              const def = defaultNet(t.discountPct);
              const override = parse(vals[t.code] ?? "");
              const effective = typeof override === "number" && !Number.isNaN(override) ? override : def;
              const gross = effective != null ? grossUnit2(effective, vatRate) : null;
              return (
                <tr key={t.code} className="border-b border-line/60">
                  <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                    <span className="font-medium text-ink">{t.name}</span>
                    <span className="ml-2 rounded bg-cream px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted-2">{t.code}</span>
                    <span className="ml-2 text-[12px] text-muted-2">−{t.discountPct.toFixed(0)} %</span>
                  </th>
                  <td className="py-2.5 pr-3 text-muted-2">{def != null ? fmt(def) : "—"}</td>
                  <td className="py-2.5 pr-3">
                    <input
                      value={vals[t.code] ?? ""}
                      onChange={(e) => setVals({ ...vals, [t.code]: e.target.value })}
                      inputMode="decimal"
                      placeholder={def != null ? def.toFixed(2).replace(".", ",") : "—"}
                      aria-label={`Zmluvná netto cena pre úroveň ${t.name}`}
                      disabled={!canEditPricing}
                      aria-invalid={badCode === t.code || undefined}
                      aria-describedby={!canEditPricing ? "tier-prices-locked" : badCode === t.code ? "tier-prices-error" : undefined}
                      className={`${inp} disabled:cursor-not-allowed disabled:bg-cream/60 disabled:text-muted`}
                    />
                  </td>
                  <td className="py-2.5 font-medium text-ink">{gross != null ? fmt(gross) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending || !canEditPricing} className="self-start rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Ukladám…" : "Uložiť ceny"}
        </button>
        {!canEditPricing && <span id="tier-prices-locked" className="text-[13px] text-muted-3">Zmluvné ceny nastavuje administrátor.</span>}
        <LiveMessage message={pending ? "Ukladám ceny…" : msg?.ok ? msg.text : null} />
        <LiveMessage message={msg && !msg.ok ? msg.text : null} tone="error" />
        {msg && <span id="tier-prices-error" className={`text-[13px] ${msg.ok ? "text-brand-2" : "text-danger-ink"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
