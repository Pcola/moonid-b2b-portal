// Rýchla kontrola výsledku párovania. Spusti: npx tsx scripts/pohoda/check-matches.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const g = await prisma.productSource.groupBy({ by: ["matchStatus"], _count: { _all: true } });
  console.log("ProductSource:", g.map((x) => `${x.matchStatus}=${x._count._all}`).join(", "));
  const withImg = await prisma.product.count({ where: { media: { some: { isPrimary: true } } } });
  console.log("Produktov s primárnym obrázkom:", withImg);

  console.log("\n--- vzorka CONFIRMED (produkt <= humed zdroj) ---");
  const ok = await prisma.productSource.findMany({
    where: { matchStatus: "CONFIRMED" },
    take: 10,
    select: { title: true, product: { select: { name: true } } },
  });
  for (const x of ok) console.log(`  OK  ${x.product?.name}  <=  ${x.title}`);

  console.log("\n--- vzorka REJECTED (kolízie, ktoré AI zahodila) ---");
  const no = await prisma.productSource.findMany({
    where: { matchStatus: "REJECTED" },
    take: 10,
    select: { title: true, product: { select: { name: true } } },
  });
  for (const x of no) console.log(`  X   ${x.product?.name}  =/=  ${x.title}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
