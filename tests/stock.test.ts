import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STOCK_FRESH_MS, isInStock, isStockFresh, inStockWhere } from "@/lib/stock";

const NOW = Date.parse("2026-08-24T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms);

describe("isStockFresh — vek skladovej cache", () => {
  it("čerstvé sú dáta mladšie než 48 h", () => {
    expect(isStockFresh(ago(1_000), NOW)).toBe(true);
    expect(isStockFresh(ago(STOCK_FRESH_MS - 1_000), NOW)).toBe(true);
  });

  it("presne na hranici a staršie už nie", () => {
    expect(isStockFresh(ago(STOCK_FRESH_MS), NOW)).toBe(false);
    expect(isStockFresh(ago(STOCK_FRESH_MS + 1), NOW)).toBe(false);
  });

  it("chýbajúci timestamp nie je čerstvý (fail-closed)", () => {
    expect(isStockFresh(null, NOW)).toBe(false);
  });
});

describe("isInStock — „Skladom“ smie tvrdiť len čerstvá cache", () => {
  const fresh = { isStocked: true, stockCache: 10, stockSyncedAt: ago(3_600_000) };

  it("skladová položka s čerstvými dátami a dostatkom kusov", () => {
    expect(isInStock(fresh, 1, NOW)).toBe(true);
    expect(isInStock(fresh, 10, NOW)).toBe(true);
  });

  it("nedostatok kusov pre požadované množstvo", () => {
    expect(isInStock(fresh, 11, NOW)).toBe(false);
  });

  it("REGRESIA: stará cache neznamená Skladom, aj keď isStocked=true a kusy sú", () => {
    // Presne stav produkcie v čase auditu: 235 publikovaných produktov s isStocked=true
    // a stockSyncedAt spred 58 dní. Verejná stránka to hlásila ako „Skladom“ + InStock.
    const stale = { isStocked: true, stockCache: 500, stockSyncedAt: ago(58 * 24 * 3_600_000) };
    expect(isInStock(stale, 1, NOW)).toBe(false);
  });

  it("neskladová položka, nulová cache a chýbajúca cache", () => {
    expect(isInStock({ ...fresh, isStocked: false }, 1, NOW)).toBe(false);
    expect(isInStock({ ...fresh, stockCache: 0 }, 1, NOW)).toBe(false);
    expect(isInStock({ ...fresh, stockCache: null }, 1, NOW)).toBe(false);
  });

  it("Decimal aj string z DB sa vyhodnotia rovnako ako number", () => {
    expect(isInStock({ ...fresh, stockCache: "10" }, 10, NOW)).toBe(true);
    expect(isInStock({ ...fresh, stockCache: "9.5" }, 10, NOW)).toBe(false);
  });
});

describe("inStockWhere — Prisma filter musí znamenať to isté ako badge", () => {
  it("žiada isStocked, kladnú cache aj čerstvý timestamp", () => {
    const w = inStockWhere(NOW);
    expect(w.isStocked).toBe(true);
    expect(w.stockCache).toEqual({ gt: 0 });
    expect(w.stockSyncedAt.gte.getTime()).toBe(NOW - STOCK_FRESH_MS);
  });
});

describe("verejná stránka produktu neobchádza pravidlo čerstvosti", () => {
  it("používa isInStock, nie surové p.isStocked", () => {
    const src = readFileSync(resolve(process.cwd(), "app/produkt/[slug]/page.tsx"), "utf8");
    expect(src).toContain("const inStock = isInStock(p)");
    // surový flag sa nesmie dostať ani do UI, ani do structured data pre Google
    expect(src).not.toContain("p.isStocked");
    expect(src).toContain('availability: inStock ? "https://schema.org/InStock"');
  });
});
