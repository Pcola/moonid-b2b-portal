"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = { companyName: string; email: string; tierCode: string | null; cartCount: number; children: React.ReactNode };

const NAV = [
  { href: "/dashboard", label: "Prehľad", icon: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></> },
  { href: "/katalog", label: "Katalóg", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></> },
  { href: "/objednavky", label: "Objednávky", icon: <><path d="M9 4h6l1 3H8z" /><path d="M5 7h14l-1 13H6z" /><path d="M9 11v5M15 11v5" /></> },
  { href: "/faktury", label: "Faktúry", icon: <><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></> },
  { href: "/nastavenia", label: "Nastavenia", icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 13H4a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.1-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.1V2a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9z" /></> },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Prehľad", "/katalog": "Katalóg", "/kosik": "Košík",
  "/objednavky": "Objednávky", "/faktury": "Faktúry", "/nastavenia": "Nastavenia",
};

function Icon({ children }: { children: React.ReactNode }) {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

export function PortalShell({ companyName, email, tierCode, cartCount, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const title = pathname.startsWith("/objednavky/") ? "Objednávka" : (TITLES[pathname] ?? "Portál");
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const initials = (companyName || "M").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col gap-1.5 bg-brand-foot p-4 text-[#9fbab3]">
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="text-[24px] font-bold tracking-[-0.02em] text-white">moonid</Link>
        <span className="rounded border border-[#8fc3b9]/30 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mint">B2B</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-[11px] text-[14.5px] font-medium transition ${active ? "bg-white/10 text-white" : "text-[#9fbab3] hover:bg-white/5 hover:text-white"}`}>
              <Icon>{n.icon}</Icon>{n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {tierCode && (
          <div className="rounded-xl border border-[#8fc3b9]/20 bg-[#8fc3b9]/10 p-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-mint">Cenová úroveň</div>
            <div className="mt-1 text-[14px] font-semibold text-[#e7efec]">Úroveň {tierCode}</div>
            <div className="mt-0.5 text-[12px] leading-snug text-[#7fa199]">Vaše ceny sú už po zľave.</div>
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-white/10 px-1 pt-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mint text-[13px] font-bold text-brand-deep">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white">{companyName || "Moonid"}</div>
            <div className="truncate text-[11.5px] text-[#7fa199]">{email}</div>
          </div>
          <form action="/auth/logout" method="post">
            <button type="submit" title="Odhlásiť sa" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7fa199] transition hover:bg-white/10 hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[248px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {/* mobile drawer */}
      {open && <div className="fixed inset-0 z-40 bg-brand-deep/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[248px] transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-cream/85 px-4 py-3 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink lg:hidden" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
          <div className="ml-auto flex items-center gap-2.5">
            <form onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : "/katalog"); }} className="hidden items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2 sm:flex">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86827A" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať produkt…" className="w-[150px] bg-transparent text-[14px] text-ink outline-none lg:w-[220px]" />
            </form>
            <Link href="/kosik" className="relative inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand px-3.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H3" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
              <span className="hidden sm:inline">Košík</span>
              {cartCount > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-mint px-1.5 text-[11.5px] font-bold text-brand-deep">{cartCount}</span>}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
