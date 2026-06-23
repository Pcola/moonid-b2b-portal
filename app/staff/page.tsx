import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_META, type OrderStatus } from "@/lib/orders/transition";

export const dynamic = "force-dynamic";

function eur(n: number) { return n.toLocaleString("sk-SK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €"; }
function eur2(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

function Kpi({ icon, iconBg, iconFg, badge, badgeFg, badgeBg, value, label }: { icon: React.ReactNode; iconBg: string; iconFg: string; badge?: string; badgeFg?: string; badgeBg?: string; value: string; label: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-[22px]">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px]" style={{ background: iconBg, color: iconFg }}>{icon}</span>
        {badge && <span className="rounded-md px-2 py-1 text-[12px] font-semibold" style={{ color: badgeFg, background: badgeBg }}>{badge}</span>}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[29px] font-normal leading-none text-ink">{value}</span>
        <span className="text-[13.5px] text-muted">{label}</span>
      </div>
    </div>
  );
}

export default async function StaffDashboard() {
  await requireStaff();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthName = now.toLocaleDateString("sk", { month: "long", year: "numeric" });
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const [monthAgg, newOrders, activeCustomers, lowStock, weekOrders, pending, topRows] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: monthStart }, status: { not: "STORNO" } } }),
    prisma.order.count({ where: { status: "PRIJATA" } }),
    prisma.company.count({ where: { active: true } }),
    prisma.product.count({ where: { isPublished: true, isStocked: true, stockCache: { lte: 10 } } }),
    prisma.order.findMany({ where: { createdAt: { gte: weekAgo }, status: { not: "STORNO" } }, select: { total: true, createdAt: true } }),
    prisma.order.findMany({
      where: { status: { notIn: ["DORUCENA", "STORNO"] } },
      orderBy: { createdAt: "desc" }, take: 6,
      select: { id: true, number: true, status: true, total: true, createdAt: true, company: { select: { name: true, priceTier: { select: { code: true } } } }, _count: { select: { items: true } } },
    }),
    prisma.orderItem.groupBy({ by: ["productId"], _sum: { qty: true, lineTotal: true }, orderBy: { _sum: { lineTotal: "desc" } }, take: 4 }),
  ]);

  const monthRevenue = Number(monthAgg._sum.total ?? 0);

  // 7-dňový graf
  const days: { label: string; value: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate() + i);
    days.push({ label: d.toLocaleDateString("sk", { weekday: "short" }), value: 0 });
  }
  for (const o of weekOrders) {
    const idx = Math.floor((new Date(o.createdAt.getFullYear(), o.createdAt.getMonth(), o.createdAt.getDate()).getTime() - new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate()).getTime()) / 86400000);
    if (idx >= 0 && idx < 7) days[idx].value += Number(o.total);
  }
  const maxDay = Math.max(1, ...days.map((d) => d.value));
  const weekTotal = days.reduce((s, d) => s + d.value, 0);

  // top produkty
  const topIds = topRows.map((r) => r.productId);
  const prods = topIds.length ? await prisma.product.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true, nameDisplay: true, media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } } } }) : [];
  const prodMap = new Map(prods.map((p) => [p.id, p]));
  const topProducts = topRows.map((r) => ({ id: r.productId, n: prodMap.get(r.productId)?.nameDisplay || prodMap.get(r.productId)?.name || "—", img: prodMap.get(r.productId)?.media[0]?.storagePath ?? "", qty: Math.round(Number(r._sum.qty ?? 0)), rev: Number(r._sum.lineTotal ?? 0) }));

  return (
    <div className="flex max-w-[1240px] flex-col gap-[clamp(20px,2.6vw,30px)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-brand-2">{now.toLocaleDateString("sk", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <h1 className="text-[clamp(26px,3.2vw,38px)] font-normal tracking-[-0.015em] text-ink">Prehľad prevádzky</h1>
        </div>
        <Link href="/staff/objednavky" className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-[18px] py-3 text-[14.5px] font-semibold text-white transition hover:bg-brand-2">
          Spracovať objednávky
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>

      {/* KPI */}
      <div className="grid gap-[clamp(14px,1.6vw,20px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <Kpi iconBg="#EAF1EE" iconFg="#163F38" value={eur(monthRevenue)} label={`Objednané — ${monthName}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7a7 7 0 1 0 0 10" /><path d="M4 10h9M4 14h9" /></svg>} />
        <Kpi iconBg="#FBF1DC" iconFg="#9A6B0E" badge={newOrders > 0 ? "akcia" : undefined} badgeFg="#9A6B0E" badgeBg="#FBF1DC" value={String(newOrders)} label="Nové objednávky na spracovanie"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l1 3H8z" /><path d="M5 7h14l-1 13H6z" /></svg>} />
        <Kpi iconBg="#EAF1EE" iconFg="#163F38" value={String(activeCustomers)} label="Aktívni zákazníci"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5a3 3 0 0 1 0 6" /></svg>} />
        <Kpi iconBg="#F7E4E0" iconFg="#A23B2A" badge={lowStock > 0 ? "sklad" : undefined} badgeFg="#A23B2A" badgeBg="#F7E4E0" value={String(lowStock)} label="Položky s nízkym skladom"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>} />
      </div>

      <div className="grid gap-[clamp(16px,2vw,24px)] lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* graf */}
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[20px] font-normal text-ink">Objednávky za 7 dní</h2>
              <span className="text-[13px] text-muted">Spolu {eur2(weekTotal)}</span>
            </div>
          </div>
          <div className="flex h-[180px] items-end gap-[clamp(8px,2vw,20px)] pt-2">
            {days.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[11px] text-muted-2">{d.value > 0 ? Math.round(d.value) : "—"}</span>
                <div className="w-full max-w-[44px] rounded-t-[7px]" style={{ height: `${Math.max(d.value > 0 ? 8 : 4, (d.value / maxDay) * 100)}%`, background: d.value > 0 ? "linear-gradient(180deg,#2A6A5E,#163F38)" : "#E7EBE9" }} />
                <span className="text-[12px] capitalize text-muted-2">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* top produkty */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-[22px] py-4"><h2 className="text-[19px] font-normal text-ink">Najpredávanejšie</h2></div>
          {topProducts.length === 0 ? (
            <div className="px-[22px] py-10 text-center text-[13.5px] text-muted">Zatiaľ žiadne predaje.</div>
          ) : topProducts.map((p) => (
            <div key={p.id} className="flex items-center gap-3.5 border-b border-line px-[22px] py-3.5 last:border-0">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[9px] border border-line bg-[#f7f9f8] p-1.5">
                {p.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.img} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                ) : <span className="text-[10px] text-muted-2">—</span>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{p.n}</div>
                <div className="text-[12px] text-muted-2">{p.qty} ks predaných</div>
              </div>
              <span className="text-[14.5px] font-semibold text-brand">{eur2(p.rev)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* objednávky čakajúce na akciu */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-[22px] py-4">
          <h2 className="text-[20px] font-normal text-ink">Objednávky čakajúce na akciu</h2>
          <Link href="/staff/objednavky" className="text-[14px] font-semibold text-brand transition hover:text-brand-2">Všetky objednávky</Link>
        </div>
        {pending.length === 0 ? (
          <div className="px-[22px] py-12 text-center text-[14px] text-muted">Žiadne objednávky nečakajú na spracovanie. 🎉</div>
        ) : pending.map((o) => {
          const meta = STATUS_META[o.status as OrderStatus];
          return (
            <div key={o.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 gap-y-1 border-b border-line px-[22px] py-4 last:border-0">
              <span className="font-mono text-[13.5px] font-semibold text-ink">{o.number}</span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-ink">{o.company.name}</div>
                <div className="text-[12.5px] text-muted-2">{o._count.items} pol. · {new Date(o.createdAt).toLocaleDateString("sk")}{o.company.priceTier ? ` · ${o.company.priceTier.code}` : ""}</div>
              </div>
              <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: meta.fg, background: meta.bg }}>{meta.label}</span>
              <span className="text-[14.5px] font-semibold tabular-nums text-ink">{eur2(Number(o.total))}</span>
              <Link href={`/staff/objednavky/${o.id}`} className="inline-flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-2">
                Spracovať<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
