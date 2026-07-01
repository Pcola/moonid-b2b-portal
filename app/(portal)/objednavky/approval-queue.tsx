"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveOrder, rejectOrder } from "./actions";

type QOrder = { id: string; number: string; total: number; date: string; itemCount: number; createdByName: string };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export function ApprovalQueue({ orders }: { orders: QOrder[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function act(id: string, fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    setErr(null); setBusyId(id);
    start(async () => {
      const r = await fn(id);
      setBusyId(null);
      if (r.ok) router.refresh(); else setErr(r.error ?? "Nepodarilo sa spracovať.");
    });
  }

  if (orders.length === 0) return null;
  return (
    <div className="mb-6 rounded-2xl border border-[#e8d9a8] bg-[#fdf9ee] p-5">
      <h2 className="text-[16px] font-semibold text-[#8a5a00]">Čaká na vaše schválenie ({orders.length})</h2>
      <p className="mt-0.5 text-[13px] text-muted-3">Objednávky vašich kolegov. Kým ich neschválite, neodošlú sa na spracovanie.</p>
      <div className="mt-3 flex flex-col gap-2">
        {orders.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white px-4 py-3">
            <Link href={`/objednavky/${o.id}`} className="min-w-0 flex-1 transition hover:opacity-80">
              <span className="font-mono text-[14px] font-semibold text-ink">{o.number}</span>
              <span className="ml-2 text-[13px] text-muted-2">{o.createdByName} · {new Date(o.date).toLocaleDateString("sk")} · {o.itemCount} pol. · {eur(o.total)}</span>
            </Link>
            <div className="flex flex-none items-center gap-2">
              <button onClick={() => act(o.id, rejectOrder)} disabled={pending} className="rounded-[9px] border border-line px-3 py-2 text-[13px] font-semibold text-[#9a3025] transition hover:border-[#e0b0a8] disabled:opacity-50">{busyId === o.id ? "…" : "Zamietnuť"}</button>
              <button onClick={() => act(o.id, approveOrder)} disabled={pending} className="rounded-[9px] bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">Schváliť</button>
            </div>
          </div>
        ))}
      </div>
      {err && <p className="mt-2 text-[13px] text-[#9a3025]">{err}</p>}
    </div>
  );
}
