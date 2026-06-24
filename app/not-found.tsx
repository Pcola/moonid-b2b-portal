import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stránka sa nenašla — Moonid s.r.o.", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 py-20 text-center">
      <div className="flex max-w-md flex-col items-center gap-5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">Moonid s.r.o.</span>
        <h1 className="text-[64px] font-bold leading-none text-ink">404</h1>
        <p className="text-[17px] text-muted">Stránku sme nenašli — možno bola presunutá alebo už neexistuje.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2">Domov</Link>
          <Link href="/produkty" className="rounded-[10px] border border-line px-5 py-3 text-[15px] font-semibold text-ink transition hover:border-brand">Katalóg</Link>
        </div>
      </div>
    </main>
  );
}
