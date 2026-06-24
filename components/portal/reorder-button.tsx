"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderFromOrder } from "@/app/(portal)/kosik/actions";

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onClick() {
    setMsg(null);
    start(async () => {
      const r = await reorderFromOrder(orderId);
      if (!r.ok) { setMsg(r.error ?? "Nepodarilo sa pridať do košíka."); return; }
      if (r.added === 0) { setMsg("Žiadna položka už nie je dostupná na objednanie."); return; }
      router.push("/kosik");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3.5 8a9 9 0 1 0 2.3-3.3L3 8" /></svg>
        {pending ? "Pridávam…" : "Objednať znova"}
      </button>
      {msg && <span className="text-[12px] text-muted-2">{msg}</span>}
    </div>
  );
}
