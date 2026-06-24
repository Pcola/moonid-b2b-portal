import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";

/** Spoločný layout pre právne stránky (GDPR, cookies, obchodné podmienky). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="top" className="mx-auto max-w-[820px] px-5 py-[clamp(40px,6vw,80px)] sm:px-8">
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">Moonid s.r.o.</span>
        <h1 className="mt-3 text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-2 text-[13px] text-muted-3">Aktualizované: {updated}</p>
        <div className="mt-8 flex flex-col gap-4 text-[15.5px] leading-relaxed text-muted">{children}</div>
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return <h2 id={id} className="mt-6 scroll-mt-24 text-[20px] font-bold tracking-[-0.01em] text-ink">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}
