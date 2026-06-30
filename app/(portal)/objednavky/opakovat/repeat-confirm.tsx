"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeRepeatOrder } from "../../kosik/actions";

export function RepeatConfirm({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function confirm() {
    setErr(null);
    start(async () => {
      const r = await placeRepeatOrder(orderId);
      if (!r.ok) { setErr(r.error ?? "Nepodarilo sa objednať."); return; }
      router.push(`/objednavky/${r.id}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={confirm}
        disabled={pending || disabled}
        className="inline-flex w-fit items-center gap-2 rounded-[11px] bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        {pending ? "Objednávam…" : "Potvrdiť a objednať"}
      </button>
      {err && <span className="text-[13px] text-[#9a3025]">{err}</span>}
    </div>
  );
}
