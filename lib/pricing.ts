// Výpočet ceny pre zákazníka. Priorita: ProductPrice pre jeho tier (ak existuje)
// > výpočet basePrice × (1 − discountPct/100). Dotované položky = na vyžiadanie.
// POZN: basePrice/discountPct sú INTERNÉ — von ide len PricedLine (net/gross).

export type PricedLine =
  | { kind: "PRICE"; net: number; gross: number; vatRate: number }
  | { kind: "ON_REQUEST" };

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

export function resolveUnitPrice(p: {
  basePriceNet: number | null;
  vatRate: number;
  isSubsidized: boolean;
  tierUnitNet: number | null; // z ProductPrice pre daný tier (zatiaľ zvyčajne null)
  discountPct: number; // fallback zľava tieru
}): PricedLine {
  if (p.isSubsidized) return { kind: "ON_REQUEST" };
  const net =
    p.tierUnitNet != null
      ? p.tierUnitNet
      : p.basePriceNet != null
        ? p.basePriceNet * (1 - p.discountPct / 100)
        : null;
  if (net == null || net <= 0) return { kind: "ON_REQUEST" };
  const gross = net * (1 + p.vatRate / 100);
  return { kind: "PRICE", net: r2(net), gross: r2(gross), vatRate: p.vatRate };
}
