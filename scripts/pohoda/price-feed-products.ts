// Doplní basePrice (netto) FEED produktom z humed feedu.
// Feed má <g:price> = predajná cena S DPH (brutto) → basePrice = g:price / (1 + vatRate/100).
// Idempotentné — len nastaví basePrice; bezpečné spustiť opakovane.
// Spusti: npm run price:feed  [-- <cesta-k-feed.xml>]
import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const FEED = process.argv[2] || process.env.FEED_PATH || "C:/Users/lukas/Downloads/feed.xml";

async function main() {
  const xml = readFileSync(FEED, "utf8");
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  // g:id -> predajná cena S DPH (string — presná dekadická hodnota pre Decimal)
  const grossById = new Map<string, string>();
  for (const it of items) {
    const id = it.match(/<g:id>(.*?)<\/g:id>/)?.[1]?.trim();
    const praw = it.match(/<g:price>(.*?)<\/g:price>/)?.[1]?.replace(/eur/i, "").replace(",", ".").trim();
    const p = praw ? Number(praw) : NaN;
    if (id && praw && Number.isFinite(p) && p > 0) grossById.set(id, praw);
  }
  console.log(`Feed: ${FEED} — ${items.length} položiek, s g:price: ${grossById.size}`);

  const feedProducts = await prisma.product.findMany({
    where: { origin: "FEED" },
    select: { id: true, sku: true, vatRate: true },
  });

  let updated = 0, noMatch = 0, skipped = 0;
  for (const p of feedProducts) {
    const extId = p.sku.replace(/^HUM-/, "");
    const gross = grossById.get(extId);
    if (gross == null) { noMatch++; continue; }
    const vat = Number(p.vatRate) || 23;
    // net = gross / (1 + vat/100) v Decimal — float delenie mis-zaokrúhľovalo 4. des. miesto
    const net = new Prisma.Decimal(gross).times(100).dividedBy(100 + vat).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
    if (net.lessThanOrEqualTo(0)) { skipped++; continue; }
    await prisma.product.update({ where: { id: p.id }, data: { basePrice: net } });
    updated++;
  }

  console.log({ feedProducts: feedProducts.length, updated, noMatch, skipped });
  // kontrola výsledku
  const priced = await prisma.product.count({ where: { origin: "FEED", basePrice: { gt: 0 } } });
  const stillNull = await prisma.product.count({ where: { origin: "FEED", isPublished: true, basePrice: null } });
  console.log({ feedSCenou: priced, publikovaneBezCeny: stillNull });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
