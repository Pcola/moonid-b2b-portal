import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { RepeatConfirm } from "./repeat-confirm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zopakovať objednávku — Moonid portál", robots: { index: false, follow: false } };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
function r2(n: number) { return Math.round(n * 100) / 100; }

export default async function OpakovatPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Objednávky sú dostupné pre firemné kontá.</div>;
  }
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const last = await prisma.order.findFirst({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, number: true, note: true,
      deliveryLocation: { select: { label: true, street: true, city: true, zip: true } },
      items: {
        select: {
          qty: true, nameSnapshot: true,
          product: { select: { id: true, name: true, nameDisplay: true, basePrice: true, vatRate: true, isSubsidized: true, isPublished: true, prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } } },
        },
      },
    },
  });

  if (!last) {
    return (
      <div className="max-w-[760px]">
        <Link href="/objednavky" className="text-[13.5px] font-medium text-muted transition hover:text-ink">← Objednávky</Link>
        <div className="mt-4 rounded-2xl border border-line bg-white p-12 text-center">
          <p className="text-[15px] font-medium text-ink">Zatiaľ žiadne objednávky</p>
          <p className="mt-1 text-[13.5px] text-muted">Po prvej objednávke ju budete môcť zopakovať jedným klikom.</p>
        </div>
      </div>
    );
  }

  const lines = last.items.map((it) => {
    const p = it.product;
    const price = p && p.isPublished
      ? resolveUnitPrice({ basePriceNet: p.basePrice != null ? Number(p.basePrice) : null, vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized, tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null, discountPct })
      : null;
    const usable = price?.kind === "PRICE";
    return { name: it.nameSnapshot || p?.nameDisplay || p?.name || "—", qty: Number(it.qty), net: usable ? price!.net : null, usable };
  });
  const usable = lines.filter((l) => l.usable);
  const subtotal = r2(usable.reduce((s, l) => s + r2((l.net ?? 0) * l.qty), 0));
  const loc = last.deliveryLocation;

  return (
    <div className="max-w-[760px]">
      <Link href="/objednavky" className="text-[13.5px] font-medium text-muted transition hover:text-ink">← Objednávky</Link>
      <h1 className="mt-3 text-[22px] font-normal tracking-[-0.01em] text-ink">Zopakovať objednávku <span className="font-mono text-[18px] text-muted-2">{last.number}</span></h1>
      <p className="mt-1.5 text-[14.5px] text-muted">Skontrolujte položky a adresu — nič nemusíte vypĺňať. Ceny a dostupnosť sú prepočítané k dnešku.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-5 py-3.5 text-[13px] font-semibold uppercase tracking-wide text-muted-2">Položky</div>
        {lines.map((l, i) => (
          <div key={i} className={`flex items-center justify-between gap-4 px-5 py-3 ${i ? "border-t border-line" : ""} ${l.usable ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] text-ink">{l.name}</div>
              {!l.usable && <div className="text-[12px] text-[#9a6b0e]">nedostupné / na vyžiadanie — vynechá sa</div>}
            </div>
            <div className="flex flex-none items-center gap-4 text-right">
              <span className="text-[13.5px] text-muted-2">{l.qty} ks</span>
              <span className="w-[90px] text-[14px] font-semibold tabular-nums text-ink">{l.usable ? eur(r2((l.net ?? 0) * l.qty)) : "—"}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line bg-cream/50 px-5 py-3.5">
          <span className="text-[14px] font-semibold text-ink">Medzisúčet (bez DPH)</span>
          <span className="text-[16px] font-semibold tabular-nums text-ink">{eur(subtotal)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-2">Dodacia adresa</div>
        <div className="mt-1.5 text-[14.5px] text-ink">
          {loc ? <>{loc.label ? <span className="font-medium">{loc.label} · </span> : null}{loc.street}, {loc.zip} {loc.city}</> : <span className="text-muted">Bez uloženej adresy — rozvoz dohodneme telefonicky.</span>}
        </div>
        {last.note && <div className="mt-2 text-[13px] text-muted">Poznámka: {last.note}</div>}
      </div>

      <div className="mt-5">
        <RepeatConfirm orderId={last.id} disabled={usable.length === 0} />
        {usable.length === 0 && <p className="mt-2 text-[13px] text-[#9a3025]">Žiadna z položiek už nie je dostupná na objednanie.</p>}
        <p className="mt-2 text-[12.5px] text-muted-2">Bez platby vopred — platíte faktúrou so splatnosťou. Termín rozvozu potvrdíme.</p>
      </div>
    </div>
  );
}
