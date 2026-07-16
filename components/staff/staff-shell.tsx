"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  name: string;
  email: string;
  role: string;
  newOrders: number;
  newRequests: number;
  newInquiries: number;
  children: React.ReactNode;
};

type StaffBadge = null | "orders" | "requests" | "inquiries";
type StaffItem = { href: string; exact: boolean; label: string; badge: StaffBadge; icon: React.ReactNode };
const NAV_GROUPS: { label: string | null; items: StaffItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/staff", exact: true, label: "Prehľad", badge: null, icon: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></> },
    ],
  },
  {
    label: "Prevádzka",
    items: [
      { href: "/staff/objednavky", exact: false, label: "Objednávky", badge: "orders", icon: <><path d="M9 4h6l1 3H8z" /><path d="M5 7h14l-1 13H6z" /><path d="M9 11v5M15 11v5" /></> },
      { href: "/staff/ziadosti", exact: false, label: "Žiadosti", badge: "requests", icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></> },
      { href: "/staff/dopyty", exact: false, label: "Dopyty", badge: "inquiries", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
      { href: "/staff/zakaznici", exact: false, label: "Zákazníci", badge: null, icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6M22 20a6 6 0 0 0-5-5.9" /></> },
    ],
  },
  {
    label: "Katalóg",
    items: [
      { href: "/staff/produkty", exact: false, label: "Produkty", badge: null, icon: <><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></> },
      { href: "/staff/kategorie", exact: false, label: "Kategórie", badge: null, icon: <><path d="M3 5h7l2 2h9v11a1 1 0 0 1-1 1H3z" /><path d="M3 5v14" /></> },
      { href: "/staff/katalog", exact: false, label: "Párovanie", badge: null, icon: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 9 15M15 20h5v-5" /></> },
    ],
  },
  {
    label: "Obchod",
    items: [
      { href: "/staff/cenniky", exact: false, label: "Cenníky", badge: null, icon: <><path d="M20 12l-8 8-9-9V4h7z" /><circle cx="7.5" cy="7.5" r="1.3" /></> },
      { href: "/staff/doprava-platba", exact: false, label: "Doprava a platba", badge: null, icon: <><rect x="1" y="4" width="14" height="12" rx="1.5" /><path d="M15 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="1.7" /><circle cx="18" cy="18.5" r="1.7" /></> },
      { href: "/staff/faktury", exact: false, label: "Faktúry", badge: null, icon: <><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></> },
    ],
  },
  {
    label: "Systém",
    items: [
      { href: "/staff/audit", exact: false, label: "Audit log", badge: null, icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></> },
      { href: "/staff/bezpecnost", exact: false, label: "Bezpečnosť", badge: null, icon: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></> },
    ],
  },
];

const PAGES: { test: (p: string) => boolean; crumb: string; title: string }[] = [
  { test: (p) => p === "/staff", crumb: "Dashboard", title: "Prehľad prevádzky" },
  { test: (p) => /^\/staff\/objednavky\/[^/]+$/.test(p), crumb: "Objednávky", title: "Detail objednávky" },
  { test: (p) => p.startsWith("/staff/objednavky"), crumb: "Spracovanie", title: "Objednávky" },
  { test: (p) => p.startsWith("/staff/ziadosti"), crumb: "Onboarding", title: "Žiadosti o prístup" },
  { test: (p) => p.startsWith("/staff/dopyty"), crumb: "Onboarding", title: "Kontaktné dopyty" },
  { test: (p) => p.startsWith("/staff/zakaznici"), crumb: "CRM", title: "Zákazníci" },
  { test: (p) => /^\/staff\/produkty\/[^/]+$/.test(p), crumb: "Produkty", title: "Úprava produktu" },
  { test: (p) => p.startsWith("/staff/produkty"), crumb: "Katalóg", title: "Produkty" },
  { test: (p) => p.startsWith("/staff/kategorie"), crumb: "Katalóg", title: "Kategórie" },
  { test: (p) => p.startsWith("/staff/katalog"), crumb: "Katalóg", title: "Párovanie zdrojov" },
  { test: (p) => p.startsWith("/staff/cenniky"), crumb: "Nastavenia", title: "Cenníky a úrovne" },
  { test: (p) => p.startsWith("/staff/doprava-platba"), crumb: "Nastavenia", title: "Doprava a platba" },
  { test: (p) => p.startsWith("/staff/faktury"), crumb: "Účtovníctvo", title: "Faktúry" },
  { test: (p) => p.startsWith("/staff/audit"), crumb: "Bezpečnosť", title: "Audit log" },
  { test: (p) => p.startsWith("/staff/bezpecnost"), crumb: "Bezpečnosť", title: "Bezpečnosť konta" },
];

function Icon({ children }: { children: React.ReactNode }) {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function StaffShell({ name, role, newOrders, newRequests, newInquiries, children }: Props) {
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

  const page = PAGES.find((x) => x.test(pathname)) ?? { crumb: "Admin", title: "Administrácia" };
  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const initials = (name || "M").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = role === "ADMIN" ? "Administrátor" : "Moonid tím";
  const badgeFor = (b: "orders" | "requests" | "inquiries" | null) => (b === "orders" ? newOrders : b === "requests" ? newRequests : b === "inquiries" ? newInquiries : 0);

  const sidebar = (
    <div className="flex h-full flex-col gap-1.5 bg-brand-foot p-4 text-[#9fbab3]">
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <Link href="/staff" onClick={() => setOpen(false)} prefetch={false} className="font-display text-[24px] font-semibold tracking-[-0.03em] text-white">moonid<span className="text-mint">.</span></Link>
        <span className="rounded border border-[#8fc3b9]/30 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mint">{role === "ADMIN" ? "Admin" : "Staff"}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:thin]">
        {NAV_GROUPS.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {g.label && <span className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fb3ab]">{g.label}</span>}
            {g.items.map((n) => {
              const active = isActive(n.href, n.exact);
              const count = badgeFor(n.badge);
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} prefetch={false} aria-current={active ? "page" : undefined}
                  className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[9px] text-[14.5px] font-medium transition-colors duration-150 ${active ? "bg-white/10 text-white" : "text-[#9fbab3] hover:bg-white/5 hover:text-white"}`}>
                  <Icon>{n.icon}</Icon>
                  <span className="flex-1">{n.label}</span>
                  {count > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#9a6410] px-1.5 text-[11px] font-bold text-white">{count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-1 pt-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mint text-[13px] font-bold text-brand-deep">{initials}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-white">{name || "Moonid"}</div>
          <div className="truncate text-[11.5px] text-[#7fa199]">{roleLabel}</div>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" aria-label="Odhlásiť sa" title="Odhlásiť sa" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7fa199] transition hover:bg-white/10 hover:text-white">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#obsah" className="skip-link">Preskočiť na obsah</a>
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {open && <div className="fixed inset-0 z-40 bg-brand-deep/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside id="staff-drawer" role="dialog" aria-modal="true" aria-label="Navigácia" inert={!open}
        className={`fixed inset-y-0 left-0 z-50 w-[248px] transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-cream/85 px-4 py-2.5 backdrop-blur sm:px-6">
          <button ref={menuBtnRef} onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink lg:hidden" aria-label="Otvoriť menu" aria-expanded={open} aria-controls="staff-drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex min-w-0 flex-col">
            <span className="text-[12px] text-muted-2">{page.crumb}</span>
            <h1 className="font-display truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">{page.title}</h1>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2 sm:flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86827A" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <form onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/staff/objednavky?q=${encodeURIComponent(q.trim())}` : "/staff/objednavky"); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Hľadať objednávku alebo firmu" placeholder="Hľadať objednávku, firmu…" className="w-[160px] bg-transparent text-[14px] text-ink outline-none lg:w-[230px]" />
            </form>
          </div>
        </header>

        <main id="obsah" className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
