// Diagnostika pokrytia: koľko kurovaných produktov má/nemá obrázok a koľko z nich
// humed reálne pokrýva (aj keď to úzke párovanie minulo). Spusti: npx tsx scripts/pohoda/diag-coverage.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const BRANDS = ["tork", "katrin", "lotus", "vileda", "merida", "krystal", "sidolux"];

async function main() {
  const curatedWhere = { shelfStatus: { not: "ARCHIVED" as const } };
  const curated = await prisma.product.count({ where: curatedWhere });
  const curatedImg = await prisma.product.count({ where: { ...curatedWhere, media: { some: { isPrimary: true } } } });
  console.log(`Kurované (FEATURED+CATALOG): ${curated} | s obrázkom: ${curatedImg} | bez: ${curated - curatedImg}`);

  // koľko feed zdrojov je ešte nespárovaných (productId NULL alebo SUGGESTED bez confirm)
  const srcTotal = await prisma.productSource.count();
  const srcConfirmed = await prisma.productSource.count({ where: { matchStatus: "CONFIRMED" } });
  const srcRejected = await prisma.productSource.count({ where: { matchStatus: "REJECTED" } });
  console.log(`ProductSource: spolu ${srcTotal}, CONFIRMED ${srcConfirmed}, REJECTED ${srcRejected}, voľných ${srcTotal - srcConfirmed - srcRejected}`);

  console.log("\n--- podľa značky (Pohoda názov ILIKE) ---");
  console.log("značka      | Pohoda | s obr. | feed zdrojov | feed voľných");
  for (const b of BRANDS) {
    const pq = { name: { contains: b, mode: "insensitive" as const } };
    const poh = await prisma.product.count({ where: pq });
    const pohImg = await prisma.product.count({ where: { ...pq, media: { some: { isPrimary: true } } } });
    const feed = await prisma.productSource.count({ where: { title: { contains: b, mode: "insensitive" } } });
    const feedFree = await prisma.productSource.count({ where: { title: { contains: b, mode: "insensitive" }, matchStatus: { not: "CONFIRMED" } } });
    console.log(`${b.padEnd(11)} | ${String(poh).padStart(6)} | ${String(pohImg).padStart(6)} | ${String(feed).padStart(12)} | ${String(feedFree).padStart(12)}`);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
