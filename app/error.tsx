"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); Sentry.captureException(error); }, [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 py-20 text-center">
      <div className="flex max-w-md flex-col items-center gap-5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">Moonid s.r.o.</span>
        <h1 className="text-[40px] font-bold leading-tight text-ink">Niečo sa pokazilo</h1>
        <p className="text-[16px] text-muted">Vyskytla sa neočakávaná chyba. Skúste to prosím znova, prípadne nás kontaktujte na moonid@moonid.sk.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2">Skúsiť znova</button>
          <Link href="/" className="rounded-[10px] border border-line px-5 py-3 text-[15px] font-semibold text-ink transition hover:border-brand">Domov</Link>
        </div>
      </div>
    </main>
  );
}
