import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Účet sa pripravuje — Moonid", robots: { index: false } };

export default function CakajucePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-[460px] text-center">
        <Link href="/" className="text-[30px] font-bold tracking-[-0.02em] text-brand">moonid</Link>
        <div className="mt-7 rounded-2xl border border-line bg-white p-8 shadow-[0_20px_50px_-30px_rgba(16,42,38,0.3)]">
          <h1 className="text-[20px] font-semibold text-ink">Účet čaká na schválenie</h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
            Vaše konto zatiaľ nie je priradené k firme. Po overení vás kolegovia z Moonid sprístupnia do portálu — ozveme sa e-mailom.
          </p>
          <p className="mt-4 text-[13.5px] text-muted-2">Potrebujete pomôcť? <a href="mailto:moonid@moonid.sk" className="font-medium text-brand hover:text-brand-2">moonid@moonid.sk</a></p>
          <form action="/auth/logout" method="post" className="mt-6">
            <button type="submit" className="rounded-[10px] border border-line px-5 py-2.5 text-[14px] font-medium text-muted transition hover:border-brand/40 hover:text-ink">Odhlásiť sa</button>
          </form>
        </div>
      </div>
    </main>
  );
}
