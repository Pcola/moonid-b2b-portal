// Backfill mostu katalóg → Pohoda (ProductLink).
// KROK A: každý Pohoda-origin Product má sku = SKz.IDS (importovaný z Pohody),
// takže most je triviálny: pohodaSku = sku, PREMAPPED, ACTIVE.
// Idempotentné: NEPREPISUJE existujúce mosty (manuálne/potvrdené ostávajú).
// Spusti: npm run premap:links
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ where: { origin: "POHODA" }, select: { id: true, sku: true } });
  const existing = await prisma.productLink.findMany({ select: { productId: true } });
  const have = new Set(existing.map((e) => e.productId));
  const toCreate = products.filter((p) => !have.has(p.id) && p.sku.trim().length > 0);

  if (toCreate.length > 0) {
    const res = await prisma.productLink.createMany({
      data: toCreate.map((p) => ({
        productId: p.id,
        pohodaSku: p.sku,
        linkMethod: "PREMAPPED" as const,
        linkStatus: "ACTIVE" as const,
        confidence: 1,
        matchedBy: "premap",
        note: "auto: sku=SKz.IDS (Pohoda-origin)",
      })),
      skipDuplicates: true,
    });
    console.log(`Vytvorených mostov (KROK A): ${res.count}`);
  } else {
    console.log("KROK A: nič nové na predmapovanie (všetky Pohoda-origin už majú most).");
  }

  const [total, links, active, pohodaUnlinked, feedTotal, feedUnlinked] = await Promise.all([
    prisma.product.count(),
    prisma.productLink.count(),
    prisma.productLink.count({ where: { linkStatus: "ACTIVE" } }),
    prisma.product.count({ where: { origin: "POHODA", pohodaLink: { is: null } } }),
    prisma.product.count({ where: { origin: "FEED" } }),
    prisma.product.count({ where: { origin: "FEED", pohodaLink: { is: null } } }),
  ]);
  console.log({ productsTotal: total, links, active, pohodaUnlinked, feedTotal, feedUnlinked });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
