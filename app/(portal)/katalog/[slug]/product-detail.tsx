"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart } from "../../kosik/actions";
import { requestQuote } from "../actions";
import { useToast } from "@/components/portal/toast";
import { ProductImg } from "@/components/product-img";

type V = { id: string; label: string; img: string; unit: string; net: number | null; gross: number | null; stocked: boolean };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export function ProductDetail({ title, category, brand, description, specs, variants, defaultId, axisLabel, tierCode }: {
  title: string; category: string; brand: string | null; description: string;
  specs: { k: string; v: string }[]; variants: V[]; defaultId: string; axisLabel: string; tierCode: string | null;
}) {
  const [sel, setSel] = useState(defaultId);
  const [qty, setQty] = useState(1);
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [quotePending, startQuote] = useTransition();
  const [quoted, setQuoted] = useState(false);
  const toast = useToast();

  const v = variants.find((x) => x.id === sel) ?? variants[0];
  const multi = variants.length > 1;
  const canBuy = v.net != null;

  const add = () => start(async () => {
    const r = await addToCart(v.id, qty);
    if (r.ok) { setAdded(true); toast("Pridané do košíka"); setTimeout(() => setAdded(false), 1600); }
  });

  const askQuote = () => startQuote(async () => {
    const r = await requestQuote(v.id);
    if (r.ok) { setQuoted(true); toast("Dopyt odoslaný — ozveme sa s cenovou ponukou"); }
    else toast(r.error ?? "Dopyt sa nepodarilo odoslať");
  });

  return (
    <div className="mx-auto max-w-[1080px]">
      <Link href="/katalog" className="inline-flex w-fit items-center gap-2 text-[14px] font-medium text-muted transition hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Späť do katalógu
      </Link>

      <div className="mt-5 grid gap-[clamp(20px,3vw,44px)] lg:grid-cols-[1fr_1fr] lg:items-start">
        {/* obrázok */}
        <div className="lg:sticky lg:top-[88px]">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-line bg-[#fafbfa] p-8">
            <ProductImg src={v.img} alt={title} sizes="(max-width: 1024px) 92vw, 480px" priority iconSize={64} />
          </div>
        </div>

        {/* info */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            {category && <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-2">{category}</span>}
            <h1 className="font-display text-[clamp(22px,2.6vw,30px)] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
            {brand && <span className="text-[13.5px] text-muted">Značka: <span className="font-medium text-ink">{brand}</span></span>}
          </div>

          {/* cena */}
          <div className="rounded-2xl border border-line bg-white p-5">
            {canBuy ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-semibold text-brand">{eur(v.net!)}</span>
                  <span className="text-[13px] text-muted-2">/ {v.unit} bez DPH</span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-2">s DPH {eur(v.gross!)}{tierCode ? ` · vaša úroveň ${tierCode}` : ""}</div>
              </>
            ) : (
              <div className="text-[18px] font-semibold text-brand-2">Cena na vyžiadanie</div>
            )}
            <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${v.stocked ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fdf6e7] text-[#8a5a00]"}`}>{v.stocked ? "Skladom" : "Na objednávku"}</span>
          </div>

          {/* varianty */}
          {multi && (
            <div className="flex flex-col gap-2.5">
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted-2">{axisLabel}</span>
              <div className="flex flex-wrap gap-2">
                {variants.map((x) => (
                  <button key={x.id} type="button" onClick={() => setSel(x.id)}
                    className={`rounded-[10px] border px-3.5 py-2 text-[14px] font-semibold transition ${x.id === sel ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-mint-2"}`}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* množstvo + do košíka */}
          {canBuy ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-[10px] border border-line bg-white">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center text-[18px] text-muted transition hover:text-ink">−</button>
                <span className="w-10 text-center text-[15px] font-semibold tabular-nums text-ink">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(9999, q + 1))} className="flex h-11 w-11 items-center justify-center text-[18px] text-muted transition hover:text-ink">+</button>
              </div>
              <button type="button" onClick={add} disabled={pending} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-brand px-6 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
                {added ? "Pridané do košíka ✓" : pending ? "…" : "Do košíka"}
              </button>
            </div>
          ) : (
            <button type="button" onClick={askQuote} disabled={quotePending || quoted} className="inline-flex h-11 w-fit items-center justify-center rounded-[10px] border border-line bg-white px-6 text-[15px] font-semibold text-brand transition hover:border-mint-2 disabled:opacity-60">
              {quoted ? "Dopyt odoslaný ✓" : quotePending ? "Odosielam…" : "Vyžiadať cenu"}
            </button>
          )}

          {description && <p className="text-[14.5px] leading-relaxed text-muted-3">{description}</p>}

          {specs.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line">
              {specs.map((s, i) => (
                <div key={i} className={`flex items-center gap-4 px-4 py-2.5 text-[14px] ${i ? "border-t border-line" : ""}`}>
                  <span className="w-[140px] flex-none text-muted-2">{s.k}</span>
                  <span className="text-ink">{s.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
