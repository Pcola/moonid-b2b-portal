"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { placeRepeatOrder, quickAddToRepeatDraft, removeRepeatDraftItem } from "../../kosik/actions";
import { lineTotal2, sumMoney2 } from "@/lib/money-client";

type Line = { name: string; qty: number; net: number | null; usable: boolean };
type ExtraLine = Line & { id: string };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
function sumNet(lines: { net: number | null; qty: number; usable: boolean }[]) {
  return sumMoney2(lines.filter((l) => l.usable).map((l) => lineTotal2(l.net ?? 0, l.qty)));
}

export function RepeatOrderConfirm({ sourceOrderId, idempotencyKey, items, extraLines, deliveryText, note }: {
  sourceOrderId: string; idempotencyKey: string; items: Line[]; extraLines: ExtraLine[]; deliveryText: string | null; note: string | null;
}) {
  const router = useRouter();
  const [skuInput, setSkuInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, startDraft] = useTransition();
  const [placing, startPlace] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const subtotal = sumMoney2([sumNet(items), sumNet(extraLines)]);
  const usableCount = items.filter((i) => i.usable).length + extraLines.filter((c) => c.usable).length;

  function addSku() {
    const q = skuInput.trim();
    if (!q || busy) return;
    setMsg(null);
    startDraft(async () => {
      const res = await quickAddToRepeatDraft(q);
      if (!res.ok) { setMsg(res.error ?? "Nepodarilo sa pridať."); return; }
      const notes: string[] = [];
      if (res.added.length) notes.push(`pridané: ${res.added.length}`);
      if (res.notFound.length) notes.push(`nenájdené: ${res.notFound.join(", ")}`);
      if (res.onRequest.length) notes.push(`na vyžiadanie: ${res.onRequest.join(", ")}`);
      setMsg(notes.length ? notes.join(" · ") : null);
      setSkuInput("");
      router.refresh();
    });
  }

  function removeExtra(id: string) {
    startDraft(async () => { await removeRepeatDraftItem(id); router.refresh(); });
  }

  function confirm() {
    setErr(null);
    if (!termsAccepted) {
      setErr("Pred odoslaním potvrďte súhlas s obchodnými podmienkami.");
      return;
    }
    startPlace(async () => {
      const res = await placeRepeatOrder(sourceOrderId, idempotencyKey, termsAccepted);
      if (!res.ok) { setErr(res.error ?? "Nepodarilo sa objednať."); return; }
      router.push(`/objednavky/${res.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-5 py-3.5 text-[13px] font-semibold uppercase tracking-wide text-muted-2">Z objednávky</div>
        {items.map((l, i) => (
          <div key={`s${i}`} className={`flex items-center justify-between gap-4 px-5 py-3 ${i ? "border-t border-line" : ""} ${l.usable ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] text-ink">{l.name}</div>
              {!l.usable && <div className="text-[12px] text-[#9a6b0e]">nedostupné / na vyžiadanie — vynechá sa</div>}
            </div>
            <div className="flex flex-none items-center gap-4 text-right">
              <span className="text-[13.5px] text-muted-2">{l.qty} ks</span>
              <span className="w-[90px] text-[14px] font-semibold tabular-nums text-ink">{l.usable ? eur(lineTotal2(l.net ?? 0, l.qty)) : "—"}</span>
            </div>
          </div>
        ))}

        {extraLines.length > 0 && (
          <div className="border-t border-line bg-mintbg/20 px-5 py-2 text-[12px] font-semibold uppercase tracking-wide text-brand-2">Doobjednané</div>
        )}
        {extraLines.map((l) => (
          <div key={l.id} className={`flex items-center justify-between gap-4 border-t border-line bg-mintbg/15 px-5 py-3 ${l.usable ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] text-ink">{l.name}</div>
              {!l.usable && <div className="text-[12px] text-[#9a6b0e]">na vyžiadanie — vynechá sa</div>}
            </div>
            <div className="flex flex-none items-center gap-4 text-right">
              <span className="text-[13.5px] text-muted-2">{l.qty} ks</span>
              <span className="w-[90px] text-[14px] font-semibold tabular-nums text-ink">{l.usable ? eur(lineTotal2(l.net ?? 0, l.qty)) : "—"}</span>
              <button onClick={() => removeExtra(l.id)} disabled={busy} aria-label="Odobrať" className="text-muted-2 transition hover:text-[#9a3025] disabled:opacity-40">✕</button>
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
        <Link href="/katalog?from=opakovat" className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[14px] font-semibold text-brand transition hover:border-mint-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
          Vybrať z katalógu
        </Link>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-2"><span className="h-px flex-1 bg-line" />alebo zadajte SKU<span className="h-px flex-1 bg-line" /></div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            aria-label="SKU a množstvo doobjednanej položky"
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSku(); } }}
            placeholder="SKU, množstvo (napr. MYDLO-5L, 2)"
            className="min-w-[220px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand"
          />
          <button onClick={addSku} disabled={busy || !skuInput.trim()} className="rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
            {busy ? "…" : "Pridať"}
          </button>
        </div>
        {msg && <p className="mt-1.5 text-[12.5px] text-[#9a6b0e]">{msg}</p>}
        <p className="mt-1.5 text-[12px] text-muted-2">Doobjednané položky sa pripočítajú k tejto objednávke (nie do bežného košíka).</p>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-2">Dodacia adresa</div>
        <div className="mt-1.5 text-[14.5px] text-ink">{deliveryText ?? <span className="text-muted">Bez uloženej adresy — rozvoz dohodneme telefonicky.</span>}</div>
        {note && <div className="mt-2 text-[13px] text-muted">Poznámka: {note}</div>}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <label className="flex max-w-2xl items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-3">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[#163f38]" />
          <span>Potvrdzujem, že som sa oboznámil s <Link href="/obchodne-podmienky" target="_blank" className="font-semibold text-brand underline underline-offset-2">obchodnými podmienkami</Link> a súhlasím s nimi. Opakovaná objednávka používa aktuálne ceny a aktuálnu verziu podmienok.</span>
        </label>
        <button onClick={confirm} disabled={placing || usableCount === 0} className="inline-flex w-fit items-center gap-2 rounded-[11px] bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          {placing ? "Objednávam…" : "Potvrdiť a objednať"}
        </button>
        {err && <span role="alert" className="text-[13px] text-[#9a3025]">{err}</span>}
        {usableCount === 0 && <span className="text-[13px] text-[#9a3025]">Žiadna položka nie je dostupná na objednanie.</span>}
        <p className="text-[12.5px] text-muted-2">Bez platby vopred — platíte faktúrou so splatnosťou. Termín rozvozu potvrdíme.</p>
      </div>
    </>
  );
}
