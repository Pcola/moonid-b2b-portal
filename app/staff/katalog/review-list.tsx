"use client";

import { useTransition, useState } from "react";
import { confirmMatch, rejectMatch, togglePublish } from "./actions";

type Item = {
  id: string;
  externalSku: string | null;
  title: string | null;
  imageUrl: string | null;
  matchScore: number | null;
  matchMethod: "CODE" | "NAME" | "MANUAL" | null;
  brand: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
    nameDisplay: string | null;
    isPublished: boolean;
    descriptionLong: string | null;
    category: { name: string } | null;
    media: { storagePath: string }[];
  } | null;
};

type Stats = { pendingTotal: number; code: number; name: number; confirmed: number; published: number; unmatched: number };

function Chip({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "brand" | "warn" }) {
  const c = tone === "brand" ? "#163f38" : tone === "warn" ? "#a15c00" : "#54514a";
  return (
    <div className="flex items-baseline gap-2 rounded-lg border border-line bg-white px-3.5 py-2">
      <span className="text-[19px] font-semibold tabular-nums" style={{ color: c }}>{value}</span>
      <span className="text-[12.5px] text-muted-2">{label}</span>
    </div>
  );
}

export function ReviewList({ items, stats }: { items: Item[]; stats: Stats }) {
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (id: string, fn: (id: string) => Promise<void>) => {
    setBusyId(id);
    start(async () => { await fn(id); setBusyId(null); });
  };

  const runPublish = (rowId: string, productId: string, value: boolean) => {
    setBusyId(rowId);
    start(async () => { await togglePublish(productId, value); setBusyId(null); });
  };

  return (
    <div className="max-w-[1100px]">
      <p className="text-[15px] text-muted-3">Potvrď alebo odmietni navrhnuté zhody humed → Pohoda. Pri potvrdení sa obrázok a popis priradia k produktu.</p>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <Chip label="čaká spolu" value={stats.pendingTotal} tone="warn" />
        <Chip label="z toho CODE" value={stats.code} />
        <Chip label="z toho NAME" value={stats.name} />
        <Chip label="potvrdené" value={stats.confirmed} tone="brand" />
        <Chip label="publikované" value={stats.published} tone="brand" />
        <Chip label="bez zhody" value={stats.unmatched} />
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-xl border border-line bg-cream p-10 text-center text-muted">
          Žiadne návrhy na potvrdenie. 🎉
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-3">
          {items.map((it) => {
            if (!it.product) return null;
            const p = it.product;
            const score = it.matchScore != null ? Math.round(it.matchScore * 100) : null;
            const isCode = it.matchMethod === "CODE";
            const cur = it.product.media[0]?.storagePath;
            const busy = busyId === it.id && pending;
            return (
              <div key={it.id} className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-white p-4 md:grid-cols-[1fr_auto_1fr_auto]">
                {/* POHODA */}
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-cream">
                    {cur ? <img src={cur} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-muted-2">bez obr.</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">Pohoda · {it.product.sku}</div>
                    <div className="truncate text-[14.5px] font-medium text-ink">{it.product.nameDisplay || it.product.name}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">{it.product.category?.name ?? "— bez kategórie —"}</div>
                    <button
                      onClick={() => runPublish(it.id, p.id, !p.isPublished)}
                      disabled={busy}
                      title={p.isPublished ? "Skryť z katalógu zákazníkov" : "Zverejniť v katalógu zákazníkov"}
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition disabled:opacity-50"
                      style={p.isPublished ? { background: "#dcfce7", color: "#14532d" } : { background: "#f3f0ee", color: "#86827a" }}
                    >
                      {p.isPublished ? "● Publikovaný" : "○ Nepublikovaný"}
                    </button>
                  </div>
                </div>

                {/* match badge */}
                <div className="flex items-center justify-center">
                  <span
                    className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={isCode ? { background: "#dcfce7", color: "#14532d" } : { background: "#eef2ff", color: "#3730a3" }}
                  >
                    {it.matchMethod}{score != null ? ` · ${score}%` : ""}
                  </span>
                </div>

                {/* HUMED */}
                <div className="flex gap-3">
                  <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-cream">
                    {it.imageUrl ? <img src={`/api/img?id=${it.id}`} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-muted-2">bez obr.</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">Humed · {it.externalSku ?? "—"}</div>
                    <div className="line-clamp-2 text-[14px] text-ink">{it.title ?? "—"}</div>
                  </div>
                </div>

                {/* akcie */}
                <div className="flex items-center gap-2 md:flex-col md:justify-center">
                  <button
                    onClick={() => run(it.id, confirmMatch)}
                    disabled={busy}
                    className="flex-1 whitespace-nowrap rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50 md:w-[110px] md:flex-none"
                  >
                    {busy ? "…" : "✓ Potvrdiť"}
                  </button>
                  <button
                    onClick={() => run(it.id, rejectMatch)}
                    disabled={busy}
                    className="flex-1 whitespace-nowrap rounded-lg border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:border-brand/40 hover:text-ink disabled:opacity-50 md:w-[110px] md:flex-none"
                  >
                    ✗ Odmietnuť
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {items.length > 0 && stats.pendingTotal > items.length && (
        <p className="mt-6 text-center text-[13px] text-muted-2">
          Zobrazených {items.length} z {stats.pendingTotal}. Po spracovaní sa načítajú ďalšie (CODE majú prioritu).
        </p>
      )}
    </div>
  );
}
