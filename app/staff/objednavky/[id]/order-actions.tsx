"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceOrder, cancelOrder } from "../actions";
import { advanceLabel, canCancel, nextStatus, type OrderStatus } from "@/lib/orders/transition";

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const advLabel = advanceLabel(status);
  const next = nextStatus(status);

  const doAdvance = () => start(async () => {
    setErr(""); const r = await advanceOrder(orderId);
    if (!r.ok) setErr(r.error ?? "Nepodarilo sa zmeniť stav."); else router.refresh();
  });
  const doCancel = () => {
    if (!confirm("Naozaj stornovať túto objednávku? Akcia je nevratná.")) return;
    start(async () => { setErr(""); const r = await cancelOrder(orderId); if (!r.ok) setErr(r.error ?? "Nepodarilo sa stornovať."); else router.refresh(); });
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2.5">
        {advLabel && next && (
          <button onClick={doAdvance} disabled={pending} className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-[18px] py-3 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
            {pending ? "Pracujem…" : advLabel}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        )}
        {status === "DORUCENA" && (
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-mintbg px-[18px] py-3 text-[14px] font-semibold text-brand-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Vybavená
          </span>
        )}
        {status === "STORNO" && (
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-[#F7E4E0] px-[18px] py-3 text-[14px] font-semibold text-[#A23B2A]">Stornovaná</span>
        )}
        {canCancel(status) && (
          <button onClick={doCancel} disabled={pending} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-4 py-3 text-[14px] font-semibold text-muted transition hover:border-[#d8b3ac] hover:text-[#A23B2A] disabled:opacity-60">
            Stornovať
          </button>
        )}
      </div>
      {err && <span className="text-[12.5px] font-medium text-[#A23B2A]">{err}</span>}
    </div>
  );
}
