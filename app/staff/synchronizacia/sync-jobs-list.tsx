"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { retrySyncJob } from "./actions";
import { LiveMessage } from "@/components/ui/live-region";

export type SyncJobItem = {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
};

const STATUS_META: Record<string, { label: string; fg: string; bg: string }> = {
  QUEUED: { label: "Vo fronte", fg: "#8A5A00", bg: "#FBF1DC" },
  CLAIMED: { label: "Prevzatá agentom", fg: "#1E5249", bg: "#EAF1EE" },
  PUSHED: { label: "Odoslaná", fg: "#1E5249", bg: "#EAF1EE" },
  FAILED: { label: "Zlyhala", fg: "#A23B2A", bg: "#F7E4E0" },
};

const KIND_LABEL: Record<string, string> = {
  CREATE_OBJ: "Založiť objednávku v Pohode",
  PULL_FA: "Stiahnuť faktúru z Pohody",
  CANCEL_OBJ: "Stornovať objednávku v Pohode",
};

function dt(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("sk") + " " + d.toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit" });
}

function Row({ it, canRetry }: { it: SyncJobItem; canRetry: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const meta = STATUS_META[it.status] ?? { label: it.status, fg: "#86827A", bg: "#F1F3F2" };

  function retry() {
    setErr(null);
    setOkMsg(null);
    start(async () => {
      const r = await retrySyncJob(it.id);
      if (r.ok) { setOkMsg("Úloha je späť vo fronte."); router.refresh(); }
      else setErr(r.error ?? "Nepodarilo sa.");
    });
  }

  return (
    <div className="border-b border-line px-[22px] py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: meta.fg, background: meta.bg }}>{meta.label}</span>
            <span className="text-[14px] font-medium text-ink">{KIND_LABEL[it.kind] ?? it.kind}</span>
            <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-2">{it.kind}</span>
          </div>
          <div className="mt-1 text-[13px] text-muted">
            Objednávka <Link href={`/staff/objednavky/${it.orderId}`} prefetch={false} className="font-mono font-semibold text-brand hover:text-brand-2">{it.orderNumber}</Link>
            {" · "}stav objednávky {it.orderStatus}
            {" · "}pokusov {it.attempts}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-2">
            Vytvorená {dt(it.createdAt)} · posledná zmena {dt(it.updatedAt)}
            {it.nextAttemptAt && <> · ďalší pokus {dt(it.nextAttemptAt)}</>}
            {it.claimedBy && <> · agent {it.claimedBy}</>}
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          {it.status === "FAILED" && (canRetry ? (
            <button onClick={retry} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-brand transition hover:border-brand/40 disabled:opacity-50">
              {pending ? "Vraciam…" : "Skúsiť znova"}
            </button>
          ) : (
            <span className="text-[12.5px] text-muted-3">Opakovanie spúšťa administrátor.</span>
          ))}
        </div>
      </div>
      {it.lastError && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-[#fdf4f2] px-3.5 py-3 font-mono text-[12px] leading-relaxed text-[#872f24]">{it.lastError}</p>
      )}
      <LiveMessage message={pending ? "Vraciam úlohu do fronty…" : okMsg} />
      <LiveMessage message={err} tone="error" />
      {err && <p className="mt-2 text-[12.5px] text-danger-ink">{err}</p>}
      {okMsg && <p className="mt-2 text-[12.5px] text-brand-2">{okMsg}</p>}
    </div>
  );
}

export function SyncJobsList({ items, canRetry }: { items: SyncJobItem[]; canRetry: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-12 text-center">
        <p className="text-[15px] font-medium text-ink">Žiadne úlohy pre tento filter</p>
        <p className="mt-1 text-[13.5px] text-muted">Fronta je prázdna alebo všetko prešlo do Pohody.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((it) => <Row key={it.id} it={it} canRetry={canRetry} />)}
    </div>
  );
}
