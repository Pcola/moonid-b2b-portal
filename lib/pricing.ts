// Výpočet ceny pre zákazníka. Priorita: ProductPrice pre jeho tier (ak existuje)
// > výpočet basePrice × (1 − discountPct/100). Dotované položky = na vyžiadanie.
// POZN: basePrice/discountPct sú INTERNÉ — von ide len PricedLine (net/gross).
// Aritmetika v Decimal (lib/money) — float zle zaokrúhľuje .005 hranice.
import { dec, round2 } from "@/lib/money";

export type PricedLine =
  | { kind: "PRICE"; net: number; gross: number; vatRate: number }
  | { kind: "ON_REQUEST" };

export function resolveUnitPrice(p: {
  basePriceNet: number | null;
  vatRate: number;
  isSubsidized: boolean;
  tierUnitNet: number | null; // z ProductPrice pre daný tier (zatiaľ zvyčajne null)
  discountPct: number; // fallback zľava tieru
}): PricedLine {
  if (p.isSubsidized) return { kind: "ON_REQUEST" };
  const raw =
    p.tierUnitNet != null
      ? dec(p.tierUnitNet)
      : p.basePriceNet != null
        ? dec(p.basePriceNet).times(dec(100).minus(p.discountPct).dividedBy(100))
        : null;
  if (raw == null || raw.lessThanOrEqualTo(0)) return { kind: "ON_REQUEST" };
  // kanonická jednotková cena = 2 des.: gross sa počíta zo ZAOKRÚHLENÉHO net,
  // aby zobrazené net × (1+DPH) vždy sedelo so zobrazeným gross (self-konzistencia)
  const net = round2(raw);
  const gross = round2(dec(net).times(dec(100).plus(p.vatRate).dividedBy(100)));
  return { kind: "PRICE", net, gross, vatRate: p.vatRate };
}
