// Doplní URL slug produktom, ktoré ho nemajú (stabilné — existujúce neprepisuje).
// Spusti: npm run backfill:slugs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function slugify(s: string): string {
  const base = s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return base || "produkt";
}

async function main() {
  const all = await prisma.product.findMany({ select: { id: true, name: true, nameDisplay: true, slug: true } });
  const taken = new Set(all.map((p) => p.slug).filter(Boolean) as string[]);
  let set = 0;
  for (const p of all) {
    if (p.slug) continue;
    let s = slugify(p.nameDisplay || p.name);
    let cand = s, i = 2;
    while (taken.has(cand)) cand = `${s}-${i++}`;
    taken.add(cand);
    await prisma.product.update({ where: { id: p.id }, data: { slug: cand } });
    set++;
  }
  console.log(`Slug doplnený pre ${set} produktov. Celkom so slugom: ${taken.size}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
