import { describe, it, expect } from "vitest";
import { resolveUnitPrice } from "@/lib/pricing";

describe("resolveUnitPrice — cenová logika (jadro biznisu)", () => {
  it("dotovaný produkt → ON_REQUEST (cena sa nezobrazí)", () => {
    expect(resolveUnitPrice({ basePriceNet: 10, vatRate: 23, isSubsidized: true, tierUnitNet: null, discountPct: 0 })).toEqual({ kind: "ON_REQUEST" });
  });

  it("basePrice bez zľavy: net = basePrice, gross = net×(1+DPH)", () => {
    const r = resolveUnitPrice({ basePriceNet: 10, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 0 });
    expect(r).toEqual({ kind: "PRICE", net: 10, gross: 12.3, vatRate: 23 });
  });

  it("tierová zľava 10 % sa aplikuje na basePrice", () => {
    const r = resolveUnitPrice({ basePriceNet: 10, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 10 });
    expect(r).toMatchObject({ kind: "PRICE", net: 9, gross: 11.07 });
  });

  it("tierUnitNet (pevná tierová cena) má prednosť pred basePrice+zľava", () => {
    const r = resolveUnitPrice({ basePriceNet: 10, vatRate: 23, isSubsidized: false, tierUnitNet: 7, discountPct: 50 });
    expect(r).toMatchObject({ kind: "PRICE", net: 7, gross: 8.61 }); // 7×1.23 = 8.61 (ignoruje basePrice aj zľavu)
  });

  it("gross sa zaokrúhľuje na 2 desatinné (r2)", () => {
    const r = resolveUnitPrice({ basePriceNet: 3.33, vatRate: 20, isSubsidized: false, tierUnitNet: null, discountPct: 0 });
    expect(r).toMatchObject({ kind: "PRICE", net: 3.33, gross: 4 }); // 3.33×1.2 = 3.996 → r2 4.00
  });

  it("žiadna cena (basePrice aj tierUnitNet null) → ON_REQUEST", () => {
    expect(resolveUnitPrice({ basePriceNet: null, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 0 })).toEqual({ kind: "ON_REQUEST" });
  });

  it("net ≤ 0 (napr. 100 % zľava) → ON_REQUEST (nie nulová cena von)", () => {
    expect(resolveUnitPrice({ basePriceNet: 10, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 100 })).toEqual({ kind: "ON_REQUEST" });
    expect(resolveUnitPrice({ basePriceNet: 0, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 0 })).toEqual({ kind: "ON_REQUEST" });
  });

  it(".005 hranica sa zaokrúhli NAHOR — Decimal regresia (float dával 1.84)", () => {
    // 1.50 × 1.23 = 1.845 presne → obchodné zaokrúhlenie 1.85; float Math.round dal 1.84
    const r = resolveUnitPrice({ basePriceNet: 1.5, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 0 });
    expect(r).toMatchObject({ kind: "PRICE", net: 1.5, gross: 1.85 });
  });

  it("dlhé desatinné zo zľavy sa počítajú presne", () => {
    // 3.33 × (1 − 33.33/100) = 3.33 × 0.6667 = 2.220111 → net 2.22; gross 2.22×1.23 = 2.7306 → 2.73
    const r = resolveUnitPrice({ basePriceNet: 3.33, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 33.33 });
    expect(r).toMatchObject({ kind: "PRICE", net: 2.22, gross: 2.73 });
  });

  it("gross sa počíta zo ZAOKRÚHLENÉHO net (self-konzistencia zobrazených cien)", () => {
    // 4-des. base z feedu: 8.1301 × 0.88 = 7.154488 → net 7.15;
    // gross = 7.15 × 1.23 = 8.7945 → 8.79 (z nezaokrúhleného by vyšlo 8.800020 → 8.80,
    // čo nesedí so zobrazeným net × DPH — zákazník musí vedieť brutto zreprodukovať)
    const r = resolveUnitPrice({ basePriceNet: 8.1301, vatRate: 23, isSubsidized: false, tierUnitNet: null, discountPct: 12 });
    expect(r).toMatchObject({ kind: "PRICE", net: 7.15, gross: 8.79 });
  });
});
