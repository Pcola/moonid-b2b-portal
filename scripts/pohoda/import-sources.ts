// Import humed feedu (feed.xml) do ProductSource (sourceType=HUMED_FEED).
// Idempotentné podľa (sourceType, externalId=g:id). Re-import NEPREPISUJE
// scrapnutý ean/brand, ani productId/matchStatus/matchedBy (potvrdené zhody).
// Spusti: npm run import:sources  [-- <cesta-k-feed.xml>]
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const FEED = process.argv[2] || process.env.FEED_PATH || "C:/Users/lukas/Downloads/feed.xml";

function dec(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .trim();
}
function m1(block: string, re: RegExp): string {
  const m = block.match(re);
  return m ? dec(m[1]) : "";
}

async function main() {
  const xml = readFileSync(FEED, "utf8");
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  console.log(`Feed: ${FEED} — ${items.length} položiek`);

  let processed = 0, skipped = 0;
  for (const it of items) {
    const externalId = m1(it, /<g:id>(.*?)<\/g:id>/);
    if (!externalId) { skipped++; continue; } // bez g:id by rozbilo idempotenciu

    const externalSku = m1(it, /<g:sku>(.*?)<\/g:sku>/) || null;
    const title = m1(it, /<g:title>(.*?)<\/g:title>/) || null;
    const imageUrl = m1(it, /<g:image_link>(.*?)<\/g:image_link>/) || null;
    const sourceUrl = m1(it, /<g:link>(.*?)<\/g:link>/) || null;
    const descM = it.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    const descriptionLong = descM ? descM[1].replace(/\s+/g, " ").trim() : null;
    const priceRaw = m1(it, /<g:cenaVhumede>(.*?)<\/g:cenaVhumede>/);
    const pp = priceRaw ? Number(priceRaw) : NaN;
    const purchasePrice = Number.isFinite(pp) ? pp : null;
    const categories = [...it.matchAll(/<category_name>(.*?)<\/category_name>/g)].map((m) => dec(m[1]));
    const raw = { categories }; // sanitizované — žiadne cenové uzly

    // POZOR: ean ani brand sa z feedu nenastavujú (g:gtid je falošný). Doplní scraper humed.sk.
    // update zámerne NEobsahuje ean/brand/match*/productId — pretrvajú.
    const feedData = { externalSku, title, imageUrl, sourceUrl, descriptionLong, purchasePrice, raw };

    await prisma.productSource.upsert({
      where: { sourceType_externalId: { sourceType: "HUMED_FEED", externalId } },
      update: feedData,
      create: { sourceType: "HUMED_FEED", externalId, ...feedData },
    });
    processed++;
    if (processed % 250 === 0) console.log(`  ...${processed}`);
  }

  const total = await prisma.productSource.count({ where: { sourceType: "HUMED_FEED" } });
  console.log(`Hotovo. Spracované: ${processed}, preskočené (bez g:id): ${skipped}. ProductSource(HUMED_FEED) v DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
