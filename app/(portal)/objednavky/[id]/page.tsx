import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startRepeatOrder } from "@/app/(portal)/kosik/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Objednávka — Moonid portál", robots: { index: false, follow: false } };

const STATUS: Record<string, string> = {
  CAKA_SCHVALENIE: "Čaká na schválenie", PRIJATA: "Prijatá", POTVRDENA: "Potvrdená", PRIPRAVUJE: "Pripravuje sa", NA_CESTE: "Na ceste", DORUCENA: "Doručená", STORNO: "Stornovaná",
};
function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // IDOR ochrana: objednávka MUSÍ patriť firme usera, inak 404. ZÁMERNE bez costSnapshot.
  const order = await prisma.order.findFirst({
    where: { id, companyId: user.companyId ?? "__none__" },
    select: {
      number: true, status: true, subtotal: true, vat: true, total: true, note: true, hasBackorder: true, createdAt: true,
      deliveryMethodLabel: true, shippingFee: true, paymentMethodLabel: true, paymentSurcharge: true,
      items: { select: { id: true, skuSnapshot: true, nameSnapshot: true, unitPriceSnapshot: true, qty: true, lineTotal: true, fulfillment: true } },
      events: { where: { source: "PORTAL" }, orderBy: { occurredAt: "asc" }, select: { status: true, occurredAt: true } },
    },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-[820px]">
      <Link href="/objednavky" className="text-[13.5px] font-medium text-muted transition hover:text-ink">← Objednávky</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-[24px] font-semibold text-ink">{order.number}</h1>
          <span className="rounded-full bg-cream px-2.5 py-1 text-[12.5px] font-semibold text-brand">{STATUS[order.status] ?? order.status}</span>
          <span className="text-[13px] text-muted-2">{new Date(order.createdAt).toLocaleString("sk")}</span>
        </div>
        <form action={startRepeatOrder.bind(null, id)}>
          <button type="submit" className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 2v6h6" /><path d="M3.5 8a9 9 0 1 0 2.3-3.3L3 8" /></svg>
            Opakovať objednávku
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-line bg-cream/60 px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
          <span>Položka</span><span className="text-right">Ks</span><span className="text-right">Cena/ks</span><span className="text-right">Spolu</span>
        </div>
        {order.items.map((it) => (
          <div key={it.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-line px-5 py-3 last:border-0">
            <div className="min-w-0">
              <div className="truncate text-[14px] text-ink">{it.nameSnapshot}</div>
              <div className="text-[12px] text-muted-2">{it.skuSnapshot} · {it.fulfillment === "SKLADOM" ? "Skladom" : "Na objednávku"}</div>
            </div>
            <span className="text-right text-[14px] tabular-nums text-muted">{Math.round(Number(it.qty))}</span>
            <span className="text-right text-[14px] tabular-nums text-muted">{eur(Number(it.unitPriceSnapshot))}</span>
            <span className="text-right text-[14px] font-semibold tabular-nums text-ink">{eur(Number(it.lineTotal))}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-end gap-1 text-[14px]">
        <div className="flex w-[260px] justify-between text-muted"><span>Medzisúčet (tovar, bez DPH)</span><span className="tabular-nums text-ink">{eur(Number(order.subtotal))}</span></div>
        {order.deliveryMethodLabel && <div className="flex w-[260px] justify-between text-muted"><span>Doprava</span><span className="tabular-nums text-ink">{Number(order.shippingFee) === 0 ? "Zdarma" : eur(Number(order.shippingFee))}</span></div>}
        {Number(order.paymentSurcharge) > 0 && <div className="flex w-[260px] justify-between text-muted"><span>{order.paymentMethodLabel ?? "Príplatok platby"}</span><span className="tabular-nums text-ink">{eur(Number(order.paymentSurcharge))}</span></div>}
        <div className="flex w-[260px] justify-between text-muted"><span>DPH</span><span className="tabular-nums text-ink">{eur(Number(order.vat))}</span></div>
        <div className="flex w-[260px] justify-between border-t border-line pt-2 text-[16px] font-semibold text-ink"><span>Spolu s DPH</span><span className="tabular-nums">{eur(Number(order.total))}</span></div>
      </div>

      {(order.deliveryMethodLabel || order.paymentMethodLabel) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {order.deliveryMethodLabel && <div className="rounded-xl border border-line bg-white p-4"><div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Doprava</div><p className="mt-1 text-[14px] text-ink">{order.deliveryMethodLabel}</p></div>}
          {order.paymentMethodLabel && <div className="rounded-xl border border-line bg-white p-4"><div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Platba</div><p className="mt-1 text-[14px] text-ink">{order.paymentMethodLabel}</p></div>}
        </div>
      )}

      {order.note && <div className="mt-6 rounded-xl border border-line bg-white p-4"><div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Poznámka</div><p className="mt-1 text-[14px] text-muted-3">{order.note}</p></div>}

      {order.events.length > 0 && (
        <div className="mt-6 rounded-xl border border-line bg-white p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Priebeh objednávky</div>
          <ol className="mt-3 flex flex-col gap-3">
            {order.events.map((e, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${i === order.events.length - 1 ? "bg-brand" : "bg-line"}`} />
                <span className="text-[14px] font-medium text-ink">{STATUS[e.status] ?? e.status}</span>
                <span className="text-[12.5px] text-muted-2">{new Date(e.occurredAt).toLocaleString("sk")}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-6 text-[13px] text-muted-2">Objednávku spracujeme a potvrdíme. O zmenách stavu vás budeme informovať.</p>
    </div>
  );
}
