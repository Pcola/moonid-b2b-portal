import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice, type PricedLine } from "@/lib/pricing";
import { QuickAddButton } from "@/components/portal/quick-add-button";
import { ProductImg } from "@/components/product-img";
import { startRepeat } from "../kosik/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prehľad — Moonid B2B portál", robots: { index: false, follow: false } };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
const STATUS: Record<string, { label: string; cls: string }> = {
  CAKA_SCHVALENIE: { label: "Čaká na schválenie", cls: "bg-[#fdf6e7] text-[#8a5a00]" },
  PRIJATA: { label: "Prijatá", cls: "bg-[#fdf6e7] text-[#8a5a00]" },
  POTVRDENA: { label: "Potvrdená", cls: "bg-[#eef2ff] text-[#3730a3]" },
  PRIPRAVUJE: { label: "Pripravuje sa", cls: "bg-[#eef2ff] text-[#3730a3]" },
  NA_CESTE: { label: "Na ceste", cls: "bg-[#eef2ff] text-[#3730a3]" },
  DORUCENA: { label: "Doručená", cls: "bg-[#ecfdf3] text-[#14633f]" },
  STORNO: { label: "Stornovaná", cls: "bg-[#f3f0ee] text-muted-2" },
};

function StatCard({ icon, badge, badgeCls, value, label }: { icon: React.ReactNode; badge?: string; badgeCls?: string; value: string; label: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[22px] transition-shadow duration-200 hover:shadow-[0_14px_34px_-22px_rgba(13,33,27,0.35)]">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-mintbg text-mint-ink">{icon}</span>
        {badge && <span className={`rounded-md px-2 py-1 text-[12px] font-semibold ${badgeCls ?? "bg-mintbg text-mint-ink"}`}>{badge}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span className="text-[13.5px] text-muted">{label}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const companyId = user.companyId;
  const isAdmin = user.role === "CUSTOMER_ADMIN";
  const tierCode = user.company?.priceTier?.code ?? null;
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString("sk", { weekday: "long", day: "numeric", month: "long" });

  let ordersYear = 0, active = 0, pendingApproval = 0, unpaid = 0;
  let recent: { id: string; number: string; status: string; total: unknown; createdAt: Date; _count: { items: number } }[] = [];
  let reorder: { id: string; n: string; i: string; unit: string; price: PricedLine }[] = [];

  if (companyId) {
    // správca vidí štatistiky celej firmy; bežný člen len svoje objednávky. Financie (neuhradené) sú len pre správcu.
    const oScope = isAdmin ? { companyId } : { companyId, createdById: user.id };
    const [oy, ac, pa, rec, unpaidAgg] = await Promise.all([
      prisma.order.count({ where: { ...oScope, createdAt: { gte: new Date(year, 0, 1) } } }),
      prisma.order.count({ where: { ...oScope, status: { in: ["PRIJATA", "POTVRDENA", "PRIPRAVUJE", "NA_CESTE"] } } }),
      prisma.order.count({ where: { ...oScope, status: "CAKA_SCHVALENIE" } }),
      prisma.order.findMany({ where: oScope, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, number: true, status: true, total: true, createdAt: true, _count: { select: { items: true } } } }),
      isAdmin
        ? prisma.invoice.aggregate({ where: { companyId, status: { in: ["PENDING", "OVERDUE"] } }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: null } as { total: number | null } }),
    ]);
    ordersYear = oy; active = ac; pendingApproval = pa; recent = rec; unpaid = Number(unpaidAgg._sum.total ?? 0);

    const recentItems = await prisma.orderItem.findMany({ where: { order: oScope }, orderBy: { id: "desc" }, take: 40, select: { productId: true } });
    const ids = [...new Set(recentItems.map((i) => i.productId).filter((x): x is string => !!x))].slice(0, 6);
    if (ids.length) {
      const discountPct = tierCode ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0) : 0;
      const prods = await prisma.product.findMany({
        where: { id: { in: ids }, isPublished: true },
        select: { id: true, name: true, nameDisplay: true, unit: true, basePrice: true, vatRate: true, isSubsidized: true, media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } }, prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } },
      });
      const order = new Map(ids.map((id, idx) => [id, idx]));
      reorder = prods
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
        .map((p) => ({
          id: p.id, n: p.nameDisplay || p.name, i: p.media[0]?.storagePath ?? "", unit: p.unit,
          price: resolveUnitPrice({ basePriceNet: p.basePrice != null ? Number(p.basePrice) : null, vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized, tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null, discountPct }),
        }));
    }
  }

  return (
    <div className="flex max-w-[1180px] flex-col gap-8">
      {/* hlavička */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-brand-2">{today}</span>
          <h1 className="font-display text-[clamp(26px,3.4vw,38px)] font-semibold tracking-[-0.025em] text-ink">Dobrý deň, {user.name?.trim().split(/\s+/)[0] || user.company?.name || "vitajte"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {recent.length > 0 && (
            <form action={startRepeat}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-[18px] py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3.5 8a9 9 0 1 0 2.3-3.3L3 8" /></svg>
                Opakovať poslednú objednávku
              </button>
            </form>
          )}
          <Link href="/katalog" className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-[18px] py-3 text-[15px] font-semibold text-brand transition hover:border-mint-2">
            Nová objednávka
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </Link>
        </div>
      </div>

      {/* štatistiky */}
      <div className="grid gap-[clamp(14px,1.6vw,20px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l1 3H8z" /><path d="M5 7h14l-1 13H6z" /></svg>} badge={year.toString()} value={String(ordersYear)} label={`Objednávok v ${year}`} />
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h11v9H3z" /><path d="M14 9h3.5l3 3v3H14z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></svg>} badge={active > 0 ? "prebieha" : undefined} badgeCls="bg-[#eef2ff] text-[#3730a3]" value={String(active)} label="Aktívne objednávky" />
        {pendingApproval > 0 && <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>} badge={isAdmin ? "na schválenie" : "čaká"} badgeCls="bg-[#fdf6e7] text-[#8a5a00]" value={String(pendingApproval)} label="Čaká na schválenie" />}
        {isAdmin && <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 9h6M9 13h4" /></svg>} value={eur(unpaid)} badge={unpaid > 0 ? "neuhradené" : undefined} badgeCls="bg-[#fdf6e7] text-[#8a5a00]" label="Čaká na úhradu" />}
        {isAdmin && <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V7H4v10h9" /><path d="M16 3v4M8 3v4" /></svg>} badge={tierCode ? `úroveň ${tierCode}` : undefined} value={tierCode ? tierCode : "—"} label="Vaša cenová úroveň" />}
      </div>

      {/* rýchle doobjednanie */}
      {reorder.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Rýchle doobjednanie</h2>
              <p className="text-[15px] text-muted">Vaše naposledy objednávané položky.</p>
            </div>
            <Link href="/katalog" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand transition hover:text-brand-2">Celý katalóg<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
            {reorder.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-[#fafbfa] p-2">
                  <ProductImg src={p.i} alt={p.n} sizes="(max-width: 640px) 45vw, 180px" iconSize={28} />
                </div>
                <p className="line-clamp-2 min-h-[38px] text-[14px] font-medium leading-snug text-ink">{p.n}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[17px] font-semibold text-brand">{p.price.kind === "PRICE" ? eur(p.price.net) : "—"}</span>
                  {p.price.kind === "PRICE" && <QuickAddButton productId={p.id} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* posledné objednávky + info */}
      <div className="grid gap-[clamp(16px,2vw,24px)] lg:grid-cols-[1.7fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-[22px] py-5">
            <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em] text-ink">Posledné objednávky</h2>
            <Link href="/objednavky" className="text-[14px] font-semibold text-brand transition hover:text-brand-2">Všetky</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-[22px] py-12 text-center text-[15px] text-muted">Zatiaľ žiadne objednávky. <Link href="/katalog" className="font-semibold text-brand">Začnite v katalógu</Link>.</div>
          ) : (
            recent.map((o) => {
              const s = STATUS[o.status] ?? { label: o.status, cls: "bg-cream text-muted" };
              return (
                <Link key={o.id} href={`/objednavky/${o.id}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-line px-[22px] py-4 transition last:border-0 hover:bg-cream/60">
                  <span className="font-mono text-[14.5px] font-semibold text-ink">{o.number}</span>
                  <span className="text-[13.5px] text-muted-2">{new Date(o.createdAt).toLocaleDateString("sk")} · {o._count.items} pol.</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${s.cls}`}>{s.label}</span>
                  <span className="text-right text-[15.5px] font-semibold tabular-nums text-ink">{eur(Number(o.total))}</span>
                </Link>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-[radial-gradient(120%_120%_at_90%_-10%,#21564C_0%,#163F38_60%)] p-6 text-[#eaf1ee]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-mint-2/15 text-mint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg></span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mint-2">Ako to funguje</span>
          </div>
          <div className="flex flex-col gap-3 text-[15px] text-[#d7e4e0]">
            {["Objednáte z katalógu so svojimi cenami", "Potvrdíme dostupnosť a termín rozvozu", "Doručíme — bez platby vopred", "Faktúru uhradíte v dohodnutej splatnosti"].map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-mint-2/20 text-[11px] font-bold text-mint">{i + 1}</span>{t}
              </div>
            ))}
          </div>
          <Link href="/katalog" className="mt-auto inline-flex items-center justify-center gap-2 rounded-[10px] bg-white px-4 py-3 text-[14.5px] font-semibold text-brand transition hover:bg-white/90">
            Prejsť do katalógu<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
