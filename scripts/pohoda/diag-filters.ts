// Zistí, aké dáta máme pre filtre katalógu (dostupnosť, značka, podkategórie z humed hierarchie).
// Spusti: npx tsx scripts/pohoda/diag-filters.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const pub = { isPublished: true } as const;
  const total = await prisma.product.count({ where: pub });
  const stocked = await prisma.product.count({ where: { ...pub, isStocked: true } });
  const withBrand = await prisma.product.count({ where: { ...pub, brand: { not: null } } });
  const byKind = await prisma.product.groupBy({ by: ["productKind"], where: pub, _count: { _all: true } });
  console.log(`Publikovaných: ${total}`);
  console.log(`  isStocked=true (Skladom): ${stocked} | na objednávku: ${total - stocked}`);
  console.log(`  so značkou (brand): ${withBrand} | bez: ${total - withBrand}`);
  console.log(`  productKind: ${byKind.map((x) => `${x.productKind}=${x._count._all}`).join(", ")}`);

  // PODKATEGÓRIE: zdroj = humed raw.categories (2-úrovňová hierarchia "Parent > Child")
  const confirmed = await prisma.productSource.findMany({
    where: { matchStatus: "CONFIRMED", product: { isPublished: true } },
    select: { raw: true, product: { select: { category: { select: { name: true } } } } },
  });
  let withSub = 0;
  const subByCat = new Map<string, Map<string, number>>();
  for (const s of confirmed) {
    const cats = (s.raw as { categories?: string[] } | null)?.categories ?? [];
    const path = cats.find((c) => c.includes(">"));
    if (!path) continue;
    withSub++;
    const cat = s.product?.category?.name ?? "—";
    const sub = path.split(">").pop()!.trim();
    if (!subByCat.has(cat)) subByCat.set(cat, new Map());
    const m = subByCat.get(cat)!;
    m.set(sub, (m.get(sub) || 0) + 1);
  }
  console.log(`\nPodkategórie z humed: ${withSub}/${confirmed.length} potvrdených má hierarchickú cestu.`);
  console.log("Top podkategórie podľa kategórie (vzorka):");
  for (const [cat, m] of [...subByCat.entries()].slice(0, 6)) {
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, n]) => `${s}(${n})`);
    console.log(`  ${cat}: ${top.join(", ")}`);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
