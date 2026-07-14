import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { RepeatOrderConfirm } from "./repeat-confirm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zopakovať objednávku — Moonid portál", robots: { index: false, follow: false } };

const PRICE_SELECT = { name: true, nameDisplay: true, basePrice: true, vatRate: true, isSubsidized: true, isPublished: true } as const;

export default async function OpakovatPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const user = await requireUser();
  const { source } = await searchParams;
  const isAdmin = user.role === "CUSTOMER_ADMIN";
  if (!user.companyId) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Objednávky sú dostupné pre firemné kontá.</div>;
  }
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const priceOf = (p: { basePrice: unknown; vatRate: unknown; isSubsidized: boolean; isPublished: boolean; prices: { unitPriceNet: unknown }[] } | null | undefined) =>
    p && p.isPublished
      ? resolveUnitPrice({ basePriceNet: p.basePrice != null ? Number(p.basePrice) : null, vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized, tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null, discountPct })
      : null;
  const pricesWhere = { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } } as const;

  const [last, draftItems] = await Promise.all([
    prisma.order.findFirst({
      // ?source=<id> → zopakovať KONKRÉTNU objednávku (z detailu/zoznamu); inak posledná.
      // companyId filter = IDOR ochrana (cudzia objednávka sa nenájde → fallback nižšie).
      where: source
        ? { id: source, companyId: user.companyId, ...(isAdmin ? {} : { createdById: user.id }) }
        : { companyId: user.companyId, ...(isAdmin ? {} : { createdById: user.id }) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, number: true, note: true,
        deliveryLocation: { select: { label: true, street: true, city: true, zip: true } },
        items: { select: { qty: true, nameSnapshot: true, product: { select: { ...PRICE_SELECT, prices: pricesWhere } } } },
      },
    }),
    // doobjednané sa stagujú oddelene od košíka (per-user); čistia sa pri štarte opakovania
    prisma.repeatDraftItem.findMany({
      where: { userId: user.id },
      orderBy: { id: "asc" },
      select: { id: true, qty: true, product: { select: { ...PRICE_SELECT, prices: pricesWhere } } },
    }),
  ]);

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

  const items = last.items.map((it) => {
    const price = priceOf(it.product);
    return { name: it.nameSnapshot || it.product?.nameDisplay || it.product?.name || "—", qty: Number(it.qty), net: price?.kind === "PRICE" ? price.net : null, usable: price?.kind === "PRICE" };
  });
  const extraLines = draftItems.map((d) => {
    const price = priceOf(d.product);
    return { id: d.id, name: d.product?.nameDisplay || d.product?.name || "—", qty: Number(d.qty), net: price?.kind === "PRICE" ? price.net : null, usable: price?.kind === "PRICE" };
  });
  const loc = last.deliveryLocation;
  const deliveryText = loc ? `${loc.label ? loc.label + " · " : ""}${loc.street}, ${loc.zip} ${loc.city}` : null;

  return (
    <div className="max-w-[760px]">
      <Link href="/objednavky" className="text-[13.5px] font-medium text-muted transition hover:text-ink">← Objednávky</Link>
      <h1 className="mt-3 font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Zopakovať objednávku <span className="font-mono text-[18px] text-muted-2">{last.number}</span></h1>
      <p className="mt-1.5 text-[14.5px] text-muted">Skontrolujte položky a adresu — nič nemusíte vypĺňať. Môžete aj doobjednať ďalší tovar. Ceny a dostupnosť sú prepočítané k dnešku.</p>
      <RepeatOrderConfirm sourceOrderId={last.id} idempotencyKey={randomUUID()} items={items} extraLines={extraLines} deliveryText={deliveryText} note={last.note} />
    </div>
  );
}
