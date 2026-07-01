import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startRepeat, startRepeatOrder } from "../kosik/actions";
import { ApprovalQueue } from "./approval-queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Objednávky — Moonid portál", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  CAKA_SCHVALENIE: { label: "Čaká na schválenie", cls: "bg-[#fdf6e7] text-[#8a5a00]" },
  PRIJATA: { label: "Prijatá", cls: "bg-[#fdf6e7] text-[#8a5a00]" },
  POTVRDENA: { label: "Potvrdená", cls: "bg-[#eef2ff] text-[#3730a3]" },
  PRIPRAVUJE: { label: "Pripravuje sa", cls: "bg-[#eef2ff] text-[#3730a3]" },
  NA_CESTE: { label: "Na ceste", cls: "bg-[#eef2ff] text-[#3730a3]" },
  DORUCENA: { label: "Doručená", cls: "bg-[#ecfdf3] text-[#14633f]" },
  STORNO: { label: "Stornovaná", cls: "bg-[#f3f0ee] text-[#86827a]" },
};
function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export default async function ObjednavkyPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Objednávky sú dostupné pre firemné kontá.</div>;
  }
  const orders = await prisma.order.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, status: true, total: true, hasBackorder: true, createdAt: true, _count: { select: { items: true } } },
  });
  // objednávky čakajúce na MOJE schválenie (som určený schvaľovateľ ich tvorcu; správca firmy vidí všetky)
  const isAdmin = user.role === "CUSTOMER_ADMIN";
  const queueRows = await prisma.order.findMany({
    where: { companyId: user.companyId, status: "CAKA_SCHVALENIE", ...(isAdmin ? {} : { createdBy: { approverId: user.id } }) },
    orderBy: { createdAt: "asc" },
    select: { id: true, number: true, total: true, createdAt: true, _count: { select: { items: true } }, createdBy: { select: { name: true, email: true } } },
  });
  const queue = queueRows.map((o) => ({ id: o.id, number: o.number, total: Number(o.total), date: o.createdAt.toISOString(), itemCount: o._count.items, createdByName: o.createdBy.name ?? o.createdBy.email }));

  return (
    <div className="max-w-[980px]">
      <ApprovalQueue orders={queue} />
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">
          Zatiaľ žiadne objednávky. <Link href="/katalog" className="font-semibold text-brand hover:text-brand-2">Prejsť do katalógu</Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] text-muted">Vaše objednávky</span>
            <form action={startRepeat}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3.5 8a9 9 0 1 0 2.3-3.3L3 8" /></svg>
                Opakovať poslednú objednávku
              </button>
            </form>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {orders.map((o, i) => {
            const s = STATUS[o.status] ?? { label: o.status, cls: "bg-cream text-muted" };
            return (
              <div key={o.id} className={`flex items-center ${i ? "border-t border-line" : ""}`}>
                <Link href={`/objednavky/${o.id}`} className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 transition hover:bg-cream">
                  <span className="font-mono text-[14px] font-semibold text-ink">{o.number}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${s.cls}`}>{s.label}</span>
                  {o.hasBackorder && <span className="rounded-full bg-[#fdf6e7] px-2.5 py-0.5 text-[11px] font-medium text-[#8a5a00]">čiastočne na objednávku</span>}
                  <span className="text-[13px] text-muted-2">{new Date(o.createdAt).toLocaleDateString("sk")} · {o._count.items} pol.</span>
                  <span className="ml-auto text-[14.5px] font-semibold tabular-nums text-ink">{eur(Number(o.total))}</span>
                </Link>
                <form action={startRepeatOrder.bind(null, o.id)} className="flex-none py-2 pl-1 pr-3.5">
                  <button type="submit" title="Zopakovať túto objednávku" className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-white px-3 py-2 text-[13px] font-semibold text-brand transition hover:border-mint-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 2v6h6" /><path d="M3.5 8a9 9 0 1 0 2.3-3.3L3 8" /></svg>
                    <span className="hidden sm:inline">Opakovať</span>
                  </button>
                </form>
              </div>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}
