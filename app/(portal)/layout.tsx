import Link from "next/link";
import { requireUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Prehľad" },
  { href: "/katalog", label: "Katalóg" },
  // Objednávky / Faktúry pribudnú v ďalších fázach
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-[24px] font-bold tracking-[-0.02em] text-brand">moonid</Link>
            <nav className="hidden items-center gap-6 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-[14.5px] font-medium text-muted transition hover:text-ink">{n.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-[13px] font-medium leading-tight text-ink">{user.company?.name ?? "Moonid"}</div>
              <div className="text-[11.5px] leading-tight text-muted-2">{user.email}</div>
            </div>
            <form action="/auth/logout" method="post">
              <button type="submit" className="rounded-[9px] border border-line px-3.5 py-2 text-[13.5px] font-medium text-muted transition hover:border-brand/40 hover:text-ink">Odhlásiť</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
