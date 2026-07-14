"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = { companyName: string; userName: string | null; email: string; tierCode: string | null; cartCount: number; isAdmin: boolean; children: React.ReactNode };

// href-y viditeľné len pre správcu firmy (bežný člen ich v navigácii nemá)
const ADMIN_ONLY = new Set(["/faktury", "/pouzivatelia"]);

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string | null; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Prehľad", icon: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></> },
    ],
  },
  {
    label: "Nákup",
    items: [
      { href: "/katalog", label: "Katalóg", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></> },
      { href: "/rychla-objednavka", label: "Rýchla objednávka", icon: <><path d="M13 2 3 14h8l-1 8 10-12h-8z" /></> },
      { href: "/oblubene", label: "Obľúbené", icon: <><path d="m12 17.3-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03z" /></> },
    ],
  },
  {
    label: "Moja firma",
    items: [
      { href: "/objednavky", label: "Objednávky", icon: <><path d="M9 4h6l1 3H8z" /><path d="M5 7h14l-1 13H6z" /><path d="M9 11v5M15 11v5" /></> },
      { href: "/faktury", label: "Faktúry", icon: <><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></> },
      { href: "/pouzivatelia", label: "Používatelia", icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></> },
    ],
  },
  {
    label: "Účet",
    items: [
      { href: "/nastavenia", label: "Nastavenia", icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 13H4a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.1V2a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9z" /></> },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Prehľad", "/katalog": "Katalóg", "/kosik": "Košík", "/rychla-objednavka": "Rýchla objednávka", "/oblubene": "Obľúbené",
  "/objednavky": "Objednávky", "/faktury": "Faktúry", "/pouzivatelia": "Používatelia", "/nastavenia": "Nastavenia",
};

function Icon({ children }: { children: React.ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

/**
 * Svetlý SaaS shell portálu: biely sidebar so zoskupenou navigáciou, firemná karta,
 * blur topbar s vyhľadávaním a košíkom. Jednotný jazyk s verejným webom (mint/green,
 * Bricolage display, hairlines).
 */
export function PortalShell({ companyName, userName, email, tierCode, cartCount, isAdmin, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // WCAG 2.1.1/2.4.3: Escape zavrie drawer a vráti fokus na tlačidlo menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuBtnRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const title = pathname.startsWith("/objednavky/") ? "Objednávka" : (TITLES[pathname] ?? "Portál");
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const identity = userName?.trim() || companyName || "Moonid";
  const initials = identity.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => isAdmin || !ADMIN_ONLY.has(n.href)) })).filter((g) => g.items.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-white">
      {/* logo */}
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <Link href="/dashboard" onClick={() => setOpen(false)} prefetch={false} className="font-display text-[23px] font-semibold tracking-[-0.03em] text-brand">moonid<span className="text-mint-ink">.</span></Link>
        <span className="rounded-md border border-mint-ink/25 bg-mintbg px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-mint-ink">B2B</span>
      </div>

      {/* firemná karta */}
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-cream px-3.5 py-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand text-[12.5px] font-bold text-white">{(companyName || "M").slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{companyName || "Vaša firma"}</div>
          {tierCode && <div className="text-[11.5px] font-medium text-mint-ink">Cenová úroveň {tierCode}</div>}
        </div>
      </div>

      {/* zoskupená navigácia */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 [scrollbar-width:thin]" aria-label="Navigácia portálu">
        {groups.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {g.label && <span className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-2">{g.label}</span>}
            {g.items.map((n) => {
              const active = isActive(n.href);
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} prefetch={false} aria-current={active ? "page" : undefined} data-active={active}
                  className={`pnav-item flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[10px] text-[14px] transition-colors duration-150 ${active ? "bg-mintbg font-semibold text-brand" : "font-medium text-muted-3 hover:bg-cream hover:text-ink"}`}>
                  <span className={active ? "text-mint-ink" : "text-muted-2"}><Icon>{n.icon}</Icon></span>
                  {n.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* user row */}
      <div className="flex items-center gap-3 border-t border-line px-4 py-3.5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mintbg text-[12.5px] font-bold text-mint-ink">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{identity}</div>
          <div className="truncate text-[11.5px] text-muted-2">{userName?.trim() ? companyName : email}</div>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" aria-label="Odhlásiť sa" title="Odhlásiť sa" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-2 transition-colors hover:bg-cream hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[256px_1fr]">
      <a href="#obsah" className="skip-link">Preskočiť na obsah</a>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {/* mobile drawer */}
      {open && <div className="fixed inset-0 z-40 bg-brand-deep/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside id="portal-drawer" role="dialog" aria-modal="true" aria-label="Navigácia" inert={!open}
        className={`fixed inset-y-0 left-0 z-50 w-[276px] transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <button ref={menuBtnRef} onClick={() => setOpen(true)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-white text-ink lg:hidden" aria-label="Otvoriť menu" aria-expanded={open} aria-controls="portal-drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <h1 className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          <div className="ml-auto flex items-center gap-2.5">
            <form onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : "/katalog"); }} className="hidden items-center gap-2 rounded-xl bg-cream px-3.5 py-2.5 transition-colors focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_var(--color-brand)] sm:flex">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b675f" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hľadať produkt" placeholder="Hľadať produkt…" className="w-[150px] bg-transparent text-[14px] text-ink outline-none lg:w-[220px]" />
            </form>
            <Link href="/kosik" prefetch={false} aria-label="Košík" className="relative inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-200 hover:bg-brand-2">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H3" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
              <span className="hidden sm:inline">Košík</span>
              {cartCount > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-mint px-1.5 text-[11.5px] font-bold text-brand-deep">{cartCount}</span>}
            </Link>
          </div>
        </header>

        <main id="obsah" className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
