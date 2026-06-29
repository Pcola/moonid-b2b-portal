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
});
