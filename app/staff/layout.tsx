import Link from "next/link";
import { requireStaff } from "@/lib/auth";

const NAV = [
  { href: "/staff/ziadosti", label: "Žiadosti" },
  { href: "/staff/katalog", label: "Katalóg / párovanie" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-brand-deep text-white">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
          <div className="flex items-center gap-7">
            <Link href="/staff/katalog" className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em] text-white">
              moonid <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-mint">STAFF</span>
            </Link>
            <nav className="hidden items-center gap-5 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-[14px] font-medium text-[#bcd3cc] transition hover:text-white">{n.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[12.5px] text-[#9fbab3] sm:inline">{user.email} · {user.role}</span>
            <form action="/auth/logout" method="post">
              <button type="submit" className="rounded-[9px] border border-white/25 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-white/10">Odhlásiť</button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
