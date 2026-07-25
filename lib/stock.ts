/**
 * Jediný zdroj pravdy pre „je to skladom?".
 *
 * Sklad je cache z Pohody (`stockCache` + `stockSyncedAt`). Ak sync stojí, cache je stará a
 * tvrdiť „Skladom" by bola lož: checkout ju aj tak vyhodnotí ako backorder. Preto sa všade
 * (katalóg, detail, obľúbené, košík) používa rovnaká podmienka vrátane veku dát.
 *
 * Pozadie: go-live audit (docs/GO_LIVE_AUDIT_2026-07-25.md, B6) našiel 235 produktov
 * označených „Skladom", z ktorých 0 malo svieže dáta — katalóg si protirečil s objednávkou.
 */
export const STOCK_FRESH_MS = 48 * 3600 * 1000;

type StockFields = {
  isStocked: boolean;
  stockCache: unknown;
  stockSyncedAt: Date | null;
};

/** Sú skladové dáta dostatočne svieže, aby sa dalo na ne spoliehať? */
export function isStockFresh(stockSyncedAt: Date | null, now: number = Date.now()): boolean {
  return !!stockSyncedAt && now - stockSyncedAt.getTime() < STOCK_FRESH_MS;
}

/** Je produkt reálne skladom v požadovanom množstve (vrátane kontroly veku dát)? */
export function isInStock(p: StockFields, qty = 1, now: number = Date.now()): boolean {
  if (!p.isStocked || p.stockCache == null) return false;
  if (!isStockFresh(p.stockSyncedAt, now)) return false;
  return Number(p.stockCache) >= qty;
}

/** Prisma `where` fragment pre „len skladom" — musí znamenať to isté ako badge v UI. */
export function inStockWhere(now: number = Date.now()) {
  return {
    isStocked: true,
    stockCache: { gt: 0 },
    stockSyncedAt: { gte: new Date(now - STOCK_FRESH_MS) },
  };
}
