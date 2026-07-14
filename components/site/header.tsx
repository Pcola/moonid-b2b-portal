"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { label: "Sortiment", href: "/produkty" },
  { label: "Dávkovače", href: "/#davkovace" },
  { label: "Portál", href: "/#portal" },
  { label: "O nás", href: "/o-nas" },
  { label: "Kontakt", href: "/kontakt" },
];

function LoginIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

/**
 * Plávajúca „pill" navigácia — glass kontajner odsadený od okrajov.
 * Na tmavom hero tmavé sklo, po scrolle / na svetlých stránkach biele sklo.
 * Mobil: fullscreen editoriálne menu s veľkými odkazmi.
 */
export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // WCAG 2.1.1: Escape zavrie mobilné menu; zamkni scroll pod menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const light = solid || scrolled; // biele sklo
  const text = light ? "#16201d" : "#eaf3f0";

  return (
    <>
      <a href="#top" className="skip-link">Preskočiť na obsah</a>

      <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <header
          className="mx-auto flex h-[62px] max-w-[1180px] items-center justify-between gap-4 rounded-2xl border pl-5 pr-2.5 transition-all duration-300 sm:pl-6"
          style={{
            background: light ? "rgba(255,255,255,0.86)" : "rgba(13,28,24,0.55)",
            borderColor: light ? "#e5eae8" : "rgba(255,255,255,0.14)",
            backdropFilter: "saturate(160%) blur(18px)",
            WebkitBackdropFilter: "saturate(160%) blur(18px)",
            boxShadow: light ? "0 12px 40px -18px rgba(13,33,27,0.25)" : "0 12px 40px -18px rgba(0,0,0,0.5)",
          }}
        >
          <Link href="/" className="font-display text-[26px] font-semibold leading-none tracking-[-0.03em] transition-colors" style={{ color: light ? "#163f38" : "#ffffff" }}>
            moonid<span style={{ color: light ? "#0f6b57" : "#8fe0cd" }}>.</span>
          </Link>

          <nav className="hidden items-center gap-[30px] lg:flex" aria-label="Hlavná navigácia">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="navlink text-[14px] font-medium transition-colors" style={{ color: text }}>{n.label}</Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/login" className="inline-flex h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 text-[14px] font-semibold transition-colors duration-200 hover:opacity-75" style={{ color: text }}>
              <LoginIcon size={15} /> Prihlásiť sa
            </Link>
            <Link
              href="/kontakt"
              className="inline-flex h-[44px] cursor-pointer items-center whitespace-nowrap rounded-xl px-5 text-[14px] font-semibold transition-colors duration-200"
              style={{ background: light ? "#163f38" : "#ffffff", color: light ? "#ffffff" : "#163f38" }}
            >
              Vyžiadať ponuku
            </Link>
          </div>

          <button
            onClick={() => setOpen(true)}
            aria-label="Otvoriť menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-xl transition-colors lg:hidden"
            style={{ border: `1px solid ${light ? "#d9e0dd" : "rgba(255,255,255,0.3)"}` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? "#163f38" : "#fff"} strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </header>
      </div>

      {/* fullscreen mobilné menu — editoriálne */}
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] flex flex-col bg-brand-deep lg:hidden">
          <div className="microgrid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative flex items-center justify-between px-6 pt-6">
            <span className="font-display text-[26px] font-semibold tracking-[-0.03em] text-white">moonid<span className="text-mint">.</span></span>
            <button onClick={() => setOpen(false)} aria-label="Zavrieť menu" className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-xl border border-white/25 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <nav className="relative flex flex-1 flex-col justify-center gap-1 px-6" aria-label="Mobilná navigácia">
            {NAV.map((n, i) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="group flex items-baseline gap-4 border-b border-white/10 py-4"
              >
                <span className="font-display text-[13px] tabular-nums text-mint/80">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[32px] font-semibold tracking-[-0.02em] text-white transition-colors group-hover:text-mint">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="relative flex flex-col gap-2.5 px-6 pb-8">
            <Link href="/login" onClick={() => setOpen(false)} className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-xl border border-white/30 text-[16px] font-semibold text-white">
              <LoginIcon size={17} /> Prihlásiť sa do portálu
            </Link>
            <Link href="/kontakt" onClick={() => setOpen(false)} className="inline-flex h-[52px] items-center justify-center rounded-xl bg-white text-[16px] font-semibold text-brand">
              Vyžiadať ponuku
            </Link>
            <a href="tel:+421919216908" className="mt-2 text-center text-[15px] font-semibold text-mint">0919 216 908</a>
          </div>
        </div>
      )}
    </>
  );
}
