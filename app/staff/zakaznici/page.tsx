import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Zákazníci", robots: { index: false, follow: false } };

function eur(n: number) { return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €"; }
const AV = ["#163F38", "#EAF1EE"];
// Ohraničenie dotazu (viditeľné, nie tiché orezanie) — server-side stránkovanie až pri reálnom raste.
const CAP = 500;

export default async function StaffCustomers() {
  await requireStaff();
  const year = new Date().getFullYear();
  const [companies, revRows, tiersCount] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      take: CAP,
      select: { id: true, name: true, city: true, active: true, priceTier: { select: { code: true, discountPct: true } }, users: { take: 1, orderBy: { createdAt: "asc" }, select: { email: true } }, _count: { select: { orders: true } } },
    }),
    prisma.order.groupBy({ by: ["companyId"], where: { status: { not: "STORNO" }, createdAt: { gte: new Date(year, 0, 1) } }, _sum: { total: true } }),
    prisma.priceTier.count(),
  ]);
  const rev = new Map(revRows.map((r) => [r.companyId, Number(r._sum.total ?? 0)]));

  return (
    <div className="flex max-w-[1240px] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-muted">{companies.length}{companies.length >= CAP ? "+" : ""} zákazníkov · {tiersCount} cenové úrovne · klikni pre detail a úpravu</p>
        <Link href="/staff/zakaznici/novy" className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Nový zákazník
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr] gap-4 border-b border-line bg-cream/60 px-[22px] py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
          <span>Firma</span><span>Mesto</span><span>Úroveň</span><span>Obj.</span><span className="text-right">Tržby {year}</span>
        </div>
        {companies.length === 0 ? (
          <div className="px-[22px] py-14 text-center text-[14px] text-muted">Zatiaľ žiadni zákazníci.</div>
        ) : companies.map((c, i) => {
          const initials = c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const disc = c.priceTier ? Number(c.priceTier.discountPct) : 0;
          return (
            <Link key={c.id} href={`/staff/zakaznici/${c.id}`} prefetch={false} className={`grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr] items-center gap-4 border-b border-line px-[22px] py-4 transition last:border-0 hover:bg-cream/50 ${c.active ? "" : "opacity-60"}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-[13px] font-bold" style={{ background: i % 2 ? AV[1] : AV[0], color: i % 2 ? "#163F38" : "#fff" }}>{initials}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="truncate text-[14px] font-medium text-ink">{c.name}</span>{!c.active && <span className="flex-none rounded bg-[#fdecea] px-1.5 py-0.5 text-[10px] font-semibold text-[#9a3025]">neaktívna</span>}</div>
                  <div className="truncate text-[12px] text-muted-2">{c.users[0]?.email ?? "—"}</div>
                </div>
              </div>
              <span className="text-[14px] text-muted">{c.city ?? "—"}</span>
              <span className="w-fit rounded-md bg-mintbg px-2.5 py-1 text-[12.5px] font-semibold text-brand-2">{c.priceTier ? `${c.priceTier.code} · −${disc.toFixed(0)} %` : "—"}</span>
              <span className="text-[14px] text-muted">{c._count.orders}</span>
              <span className="text-right text-[15px] font-semibold tabular-nums text-ink">{eur(rev.get(c.id) ?? 0)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
