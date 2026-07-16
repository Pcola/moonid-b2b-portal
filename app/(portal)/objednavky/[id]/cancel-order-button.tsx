"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOwnOrder } from "@/app/(portal)/objednavky/actions";

/** Zrušenie vlastnej objednávky zákazníkom (len kým je PRIJATA). Inline potvrdenie
 *  namiesto window.confirm — konzistentné so zvyškom portálu, prístupnejšie. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function doCancel() {
    setErr(null);
    start(async () => {
      const res = await cancelOwnOrder(orderId);
      if (!res.ok) { setErr(res.error ?? "Zrušenie zlyhalo."); setConfirming(false); return; }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-line px-4 py-2.5 text-[14px] font-semibold text-[#9a3025] transition-colors hover:border-[#e0b0a8] hover:bg-[#fdf2f0]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        Zrušiť objednávku
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-[13px] text-muted-3">Naozaj zrušiť objednávku?</span>
        <button type="button" onClick={doCancel} disabled={pending} className="cursor-pointer rounded-[10px] bg-[#9a3025] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#832619] disabled:opacity-60">
          {pending ? "Rušim…" : "Áno, zrušiť"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="cursor-pointer rounded-[10px] border border-line px-4 py-2.5 text-[14px] font-semibold text-muted transition-colors hover:text-ink">
          Späť
        </button>
      </div>
      {err && <p role="alert" className="text-[13px] text-[#9a3025]">{err}</p>}
    </div>
  );
}
