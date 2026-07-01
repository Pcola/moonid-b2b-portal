import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_META, STEP_TITLES, stepIndex, type OrderStatus } from "@/lib/orders/transition";
import { OrderActions } from "./order-actions";
import { OrderEditor } from "./order-editor";
import { SHIPPING_VAT_RATE } from "@/lib/store-config";

export const dynamic = "force-dynamic";

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export default async function StaffOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true, number: true, status: true, subtotal: true, vat: true, total: true, note: true, hasBackorder: true,
      createdAt: true, confirmedAt: true, priceTierCode: true, pohodaSync: true, companyId: true, deliveryLocationId: true,
      deliveryMethodLabel: true, shippingFee: true, paymentMethodCode: true, paymentMethodLabel: true, paymentSurcharge: true,
      company: { select: { name: true, address: true, city: true, ico: true, splatDays: true, priceTier: { select: { code: true, name: true } }, locations: { orderBy: [{ isDefault: "desc" }, { label: "asc" }], select: { id: true, label: true, street: true, city: true, zip: true } } } },
      deliveryLocation: { select: { label: true, street: true, city: true, zip: true } },
      createdBy: { select: { name: true, email: true } },
      items: { select: { id: true, skuSnapshot: true, nameSnapshot: true, unitPriceSnapshot: true, costSnapshot: true, qty: true, lineTotal: true, fulfillment: true, product: { select: { unit: true, vatRate: true, media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } } } } } },
      events: { orderBy: { occurredAt: "asc" }, select: { id: true, status: true, occurredAt: true, note: true, source: true, changedBy: { select: { name: true, email: true } } } },
    },
  });
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const meta = STATUS_META[status];
  const curIdx = stepIndex(status);
  const cancelled = status === "STORNO";
  const editable = status === "PRIJATA" || status === "POTVRDENA";
  const editorItems = order.items.map((it) => ({
    id: it.id, name: it.nameSnapshot, sku: it.skuSnapshot, unit: it.product?.unit ?? "ks",
    unitPriceSnapshot: Number(it.unitPriceSnapshot), vatRate: Number(it.product?.vatRate ?? 23), qty: Math.round(Number(it.qty)),
  }));

  // staff-only marža
  const costTotal = order.items.reduce((s, it) => s + (it.costSnapshot != null ? Number(it.costSnapshot) * Number(it.qty) : 0), 0);
  const margin = Number(order.subtotal) - costTotal;
  const marginPct = Number(order.subtotal) > 0 ? (margin / Number(order.subtotal)) * 100 : 0;

  return (
    <div className="flex max-w-[1120px] flex-col gap-6">
      <Link href="/staff/objednavky" className="inline-flex w-fit items-center gap-2 text-[14px] font-medium text-muted transition hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Späť na objednávky
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-[clamp(24px,3vw,32px)] font-semibold text-ink">{order.number}</h1>
            <span className="rounded-full px-3 py-1 text-[12px] font-semibold" style={{ color: meta.fg, background: meta.bg }}>{meta.label}</span>
            {order.hasBackorder && <span className="rounded-full bg-[#FBF1DC] px-2.5 py-1 text-[11.5px] font-medium text-[#9A6B0E]">čiastočne na objednávku</span>}
          </div>
          <span className="text-[14.5px] text-muted">{order.company.name} · {new Date(order.createdAt).toLocaleString("sk")} · {order.items.length} položiek</span>
        </div>
        <OrderActions orderId={order.id} status={status} />
      </div>

      {/* stepper alebo storno banner */}
      {cancelled ? (
        <div className="rounded-2xl border border-[#f0d7d2] bg-[#fdf4f2] px-6 py-5 text-[14px] text-[#A23B2A]">
          Objednávka bola <strong>stornovaná</strong>. Ďalšie spracovanie nie je možné.
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white px-[clamp(20px,3vw,36px)] py-7">
          <div className="grid grid-cols-5 gap-2">
            {STEP_TITLES.map((title, i) => {
              const done = i < curIdx, active = i === curIdx;
              return (
                <div key={title} className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <span className="z-[2] flex h-8 w-8 flex-none items-center justify-center rounded-full border-2"
                      style={{ background: done ? "#163F38" : "#fff", color: done ? "#fff" : active ? "#163F38" : "#C7D2CD", borderColor: done || active ? "#163F38" : "#E2E7E4" }}>
                      {done ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      ) : <span className="h-2 w-2 rounded-full bg-current" />}
                    </span>
                    {i < 4 && <span className="h-[2px] flex-1" style={{ background: i < curIdx ? "#163F38" : "#E2E7E4" }} />}
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: done || active ? "#16201D" : "#9DB0AA" }}>{title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-[clamp(16px,2vw,24px)] lg:grid-cols-[1.7fr_1fr] lg:items-start">
        {/* položky */}
        <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-[22px] py-4"><h2 className="text-[19px] font-normal text-ink">Položky</h2></div>
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 border-b border-line px-[22px] py-4 last:border-0">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[10px] border border-line bg-[#f7f9f8] p-1.5">
                {it.product?.media[0]?.storagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.product.media[0].storagePath} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                ) : <span className="text-[10px] text-muted-2">—</span>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium leading-snug text-ink">{it.nameSnapshot}</div>
                <div className="text-[12.5px] text-muted-2">{it.skuSnapshot} · {eur(Number(it.unitPriceSnapshot))} / {it.product?.unit ?? "ks"} · {it.fulfillment === "SKLADOM" ? "skladom" : "na objednávku"}</div>
              </div>
              <span className="whitespace-nowrap text-[14px] text-muted">{Math.round(Number(it.qty))} ×</span>
              <span className="min-w-[80px] text-right text-[15px] font-semibold tabular-nums text-ink">{eur(Number(it.lineTotal))}</span>
            </div>
          ))}
        </div>
        <OrderEditor orderId={order.id} editable={editable} items={editorItems} locations={order.company.locations} note={order.note} deliveryLocationId={order.deliveryLocationId} shippingFee={Number(order.shippingFee)} paymentSurcharge={Number(order.paymentSurcharge)} vatRate={SHIPPING_VAT_RATE} />
        </div>

        {/* bočný panel */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-[22px]">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Súhrn</h3>
            <div className="flex justify-between text-[14.5px] text-muted"><span>Medzisúčet (tovar)</span><span className="tabular-nums text-ink">{eur(Number(order.subtotal))}</span></div>
            {order.deliveryMethodLabel && <div className="flex justify-between text-[14.5px] text-muted"><span>Doprava</span><span className="tabular-nums text-ink">{Number(order.shippingFee) === 0 ? "Zdarma" : eur(Number(order.shippingFee))}</span></div>}
            {Number(order.paymentSurcharge) > 0 && <div className="flex justify-between text-[14.5px] text-muted"><span>{order.paymentMethodLabel ?? "Príplatok platby"}</span><span className="tabular-nums text-ink">{eur(Number(order.paymentSurcharge))}</span></div>}
            <div className="flex justify-between text-[14.5px] text-muted"><span>DPH</span><span className="tabular-nums text-ink">{eur(Number(order.vat))}</span></div>
            <div className="my-1 h-px bg-line" />
            <div className="flex items-baseline justify-between"><span className="text-[15px] font-semibold text-ink">Spolu s DPH</span><span className="text-[22px] font-semibold text-brand tabular-nums">{eur(Number(order.total))}</span></div>
            {costTotal > 0 && (
              <div className="mt-1 flex justify-between rounded-lg bg-mintbg/60 px-3 py-2 text-[12.5px] text-brand-2">
                <span>Marža (interné)</span><span className="font-semibold tabular-nums">{eur(margin)} · {marginPct.toFixed(0)} %</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-[22px]">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Zákazník</h3>
            <div className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold text-ink">{order.company.name}</span>
              <span className="text-[13.5px] leading-relaxed text-muted">{[order.company.address, order.company.city].filter(Boolean).join(", ") || "—"}</span>
              <span className="text-[12.5px] text-muted-2">IČO {order.company.ico}</span>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-line pt-3">
              <span className="text-[12px] text-muted-2">Dodacia adresa</span>
              {order.deliveryLocation ? (
                <span className="text-[13.5px] leading-relaxed text-ink">
                  {order.deliveryLocation.label ? <span className="font-medium">{order.deliveryLocation.label}: </span> : null}
                  {[order.deliveryLocation.street, [order.deliveryLocation.zip, order.deliveryLocation.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}
                </span>
              ) : (
                <span className="text-[13.5px] text-muted">Na fakturačnú adresu firmy</span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 border-t border-line pt-3">
              <span className="text-[12px] text-muted-2">Cenová úroveň</span>
              <span className="text-[13.5px] text-muted">{order.company.priceTier ? `${order.company.priceTier.code} — ${order.company.priceTier.name}` : "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-line pt-3">
              <span className="text-[12px] text-muted-2">Doprava · platba</span>
              <span className="text-[13.5px] text-muted">{[order.deliveryMethodLabel, order.paymentMethodLabel].filter(Boolean).join(" · ") || "—"}{order.paymentMethodCode === "faktura" ? ` (${order.company.splatDays} dní)` : ""}</span>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-line pt-3">
              <span className="text-[12px] text-muted-2">Objednal</span>
              <span className="text-[13.5px] text-muted">{order.createdBy.name ?? order.createdBy.email}</span>
            </div>
          </div>

          {/* technický stav synca s Pohodou (staff-only) */}
          <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-[22px] py-3.5">
            <span className="text-[12.5px] text-muted-2">Pohoda</span>
            <span className="rounded-full bg-cream px-2.5 py-1 text-[11.5px] font-medium text-muted">{order.pohodaSync === "LOKALNA" ? "Lokálna (nesynced)" : order.pohodaSync}</span>
          </div>
        </div>
      </div>

      {order.note && (
        <div className="rounded-2xl border border-line bg-white p-[22px]">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Poznámka zákazníka</h3>
          <p className="mt-1.5 text-[14px] text-muted-3">{order.note}</p>
        </div>
      )}

      {/* timeline */}
      <div className="rounded-2xl border border-line bg-white p-[22px]">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">História stavov</h3>
        <div className="flex flex-col gap-3.5">
          {order.events.map((e) => {
            const m = STATUS_META[e.status as OrderStatus];
            return (
              <div key={e.id} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: m.fg }} />
                <span className="text-[13.5px] font-medium text-ink">{m.label}</span>
                <span className="text-[12.5px] text-muted-2">{new Date(e.occurredAt).toLocaleString("sk")}</span>
                <span className="text-[12px] text-muted-2">{e.changedBy ? `· ${e.changedBy.name ?? e.changedBy.email}` : e.source === "POHODA_SYNC" ? "· Pohoda" : ""}</span>
                {e.note && <span className="text-[12.5px] italic text-muted-2">— {e.note}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
