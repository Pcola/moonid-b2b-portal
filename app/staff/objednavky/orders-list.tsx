"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATUS_META, type OrderStatus } from "@/lib/orders/transition";

type Item = { id: string; number: string; status: string; customer: string; tier: string; count: number; total: number; date: string };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

const FILTERS: { label: string; status: OrderStatus | null }[] = [
  { label: "Všetky", status: null },
  { label: "Nové", status: "PRIJATA" },
  { label: "Potvrdené", status: "POTVRDENA" },
  { label: "Pripravuje sa", status: "PRIPRAVUJE" },
  { label: "Na ceste", status: "NA_CESTE" },
  { label: "Doručené", status: "DORUCENA" },
  { label: "Storno", status: "STORNO" },
];

export function StaffOrders({ items, initialQ = "", capped = false, cap = 0 }: { items: Item[]; initialQ?: string; capped?: boolean; cap?: number }) {
  const [active, setActive] = useState<OrderStatus | null>(null);
  const [q, setQ] = useState(initialQ);

  const countFor = (s: OrderStatus | null) => (s === null ? items.length : items.filter((i) => i.status === s).length);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((i) =>
      (active === null || i.status === active) &&
      (!qq || i.number.toLowerCase().includes(qq) || i.customer.toLowerCase().includes(qq))
    );
  }, [items, active, q]);

  return (
    <div className="flex max-w-[1240px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = active === f.status;
            const c = countFor(f.status);
            return (
              <button key={f.label} type="button" onClick={() => setActive(f.status)}
                className={`rounded-full border px-[15px] py-2 text-[13.5px] font-medium transition ${on ? "border-brand bg-brand text-white" : "border-line bg-white text-muted hover:border-mint-2"}`}>
                {f.label}<span className={`ml-1.5 ${on ? "text-mint" : "text-muted-2"}`}>{c}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/staff/export?type=orders" download className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-white px-3.5 py-2 text-[13.5px] font-semibold text-muted transition hover:border-brand/40 hover:text-ink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" /></svg>Export CSV
          </a>
          <div className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86827A" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Číslo alebo firma…" className="w-[160px] bg-transparent text-[14px] text-ink outline-none" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-[auto_1.6fr_1fr_0.8fr_auto_auto] gap-4 border-b border-line bg-cream/60 px-[22px] py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
          <span>Číslo</span><span>Zákazník</span><span>Dátum</span><span>Úroveň</span><span>Stav</span><span className="text-right">Suma</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-[22px] py-14 text-center text-[14px] text-muted">Žiadne objednávky v tomto filtri.</div>
        ) : filtered.map((o) => {
          const meta = STATUS_META[o.status as OrderStatus];
          return (
            <Link key={o.id} href={`/staff/objednavky/${o.id}`} className="grid grid-cols-[auto_1.6fr_1fr_0.8fr_auto_auto] items-center gap-4 border-b border-line px-[22px] py-4 transition last:border-0 hover:bg-[#f7f9f8]">
              <span className="font-mono text-[13.5px] font-semibold text-ink">{o.number}</span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-ink">{o.customer}</div>
                <div className="text-[12.5px] text-muted-2">{o.count} položiek</div>
              </div>
              <span className="text-[13.5px] text-muted">{new Date(o.date).toLocaleDateString("sk")}</span>
              <span className="text-[13.5px] text-muted">{o.tier}</span>
              <span className="justify-self-start rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: meta.fg, background: meta.bg }}>{meta.label}</span>
              <span className="text-right text-[15px] font-semibold tabular-nums text-ink">{eur(o.total)}</span>
            </Link>
          );
        })}
      </div>

      {capped && (
        <p className="text-center text-[12.5px] text-muted-2">Zobrazených posledných {cap} objednávok. Staršie nájdete v detaile zákazníka.</p>
      )}
    </div>
  );
}
