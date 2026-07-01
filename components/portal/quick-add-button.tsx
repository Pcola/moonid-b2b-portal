"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/app/(portal)/kosik/actions";
import { useToast } from "@/components/portal/toast";

export function QuickAddButton({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const toast = useToast();
  return (
    <button
      onClick={() => start(async () => { const r = await addToCart(productId, 1); if (r.ok) { setAdded(true); toast("Pridané do košíka"); setTimeout(() => setAdded(false), 1400); } })}
      disabled={pending}
      title="Pridať do košíka"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-brand bg-brand text-white transition hover:bg-brand-2 disabled:opacity-60"
    >
      {added ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      )}
    </button>
  );
}
