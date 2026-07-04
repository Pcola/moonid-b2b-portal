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

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // WCAG 2.1.1: Escape zavrie mobilné menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // solid = stránka bez tmavého hero (napr. detail produktu) → hlavička biela hneď od načítania
  const solidUI = solid || scrolled;
  const navColor = solidUI ? "#3c3a33" : "#e6efec";
  const logoColor = solidUI ? "#163f38" : "#ffffff";

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <a href="#top" className="skip-link">Preskočiť na obsah</a>
      {/* util bar */}
      <div className="overflow-hidden text-[13px] transition-all duration-500" style={{ height: scrolled ? 0 : 40, opacity: scrolled ? 0 : 1, background: "#122f2a", color: "#a9c2bb" }}>
        <div className="mx-auto flex h-10 max-w-[1240px] items-center justify-between gap-5 px-5 sm:px-8">
          <span className="hidden tracking-wide sm:inline">B2B dodávateľ hygieny, čistenia a vybavenia · Slovensko</span>
          <div className="flex items-center gap-5">
            <a href="tel:+421919216908" className="font-semibold text-[#d7e4e0]">0919 216 908</a>
            <a href="mailto:moonid@moonid.sk" className="hidden text-[#a9c2bb] hover:text-white md:inline">moonid@moonid.sk</a>
            <span className="hidden text-[#7fa199] lg:inline">Po–Štv 8:00–17:00 · Pia 8:00–14:00</span>
          </div>
        </div>
      </div>

      {/* header */}
      <header className="transition-all duration-300" style={{ background: solidUI ? "rgba(255,255,255,0.92)" : "transparent", backdropFilter: solidUI ? "saturate(180%) blur(16px)" : "none", WebkitBackdropFilter: solidUI ? "saturate(180%) blur(16px)" : "none", borderBottom: `1px solid ${solidUI ? "#e7ebe9" : "transparent"}` }}>
        <div className="mx-auto flex h-[74px] max-w-[1240px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" className="text-[30px] font-bold leading-none tracking-[-0.02em] transition-colors" style={{ color: logoColor }}>moonid</Link>

          <nav className="hidden items-center gap-[34px] lg:flex" aria-label="Hlavná navigácia">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="navlink text-[14.5px] font-medium transition-colors" style={{ color: navColor }}>{n.label}</Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/login" className="navlink inline-flex items-center gap-2 whitespace-nowrap text-[14.5px] font-semibold transition-colors" style={{ color: navColor }}>
              <LoginIcon /> Prihlásiť sa
            </Link>
            <Link href="/kontakt" className="whitespace-nowrap rounded-[9px] px-5 py-[11px] text-[14.5px] font-semibold transition-colors" style={{ background: solidUI ? "#163f38" : "#ffffff", color: solidUI ? "#ffffff" : "#163f38" }}>
              Vyžiadať ponuku
            </Link>
          </div>

          <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Zavrieť menu" : "Otvoriť menu"} aria-expanded={open} aria-controls="mobile-menu" className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[9px] lg:hidden" style={{ border: `1px solid ${solidUI ? "#d6dedb" : "rgba(255,255,255,0.5)"}`, background: solidUI ? "#fff" : "rgba(255,255,255,0.12)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={solidUI ? "#163f38" : "#fff"} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
        </div>

        {open && (
          <div id="mobile-menu" className="flex flex-col gap-0.5 border-t border-line bg-white px-5 pb-5 pt-2 lg:hidden sm:px-8">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-[#edf0ef] px-1 py-3 text-base font-medium text-[#3c3a33]">{n.label}</Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="mt-3 inline-flex items-center justify-center gap-2 rounded-[9px] border border-[#c9d8d2] py-[13px] text-base font-semibold text-brand">
              <LoginIcon size={17} /> Prihlásiť sa do portálu
            </Link>
            <Link href="/kontakt" onClick={() => setOpen(false)} className="mt-2 rounded-[9px] bg-brand py-[14px] text-center text-base font-semibold text-white">Vyžiadať ponuku</Link>
          </div>
        )}
      </header>
    </div>
  );
}
