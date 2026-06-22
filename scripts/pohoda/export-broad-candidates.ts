// ŠIROKÉ párovanie: pre každý kurovaný produkt BEZ obrázka nájde top-K humed kandidátov
// podľa počtu zdieľaných slov (bez prahu — chytí aj zmrštené názvy). AI potom vyberie.
// Spusti: npm run export:broad
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";

const prisma = new PrismaClient();
const K = 6;

function stripDia(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function toks(s: string): string[] {
  const t = stripDia(s).toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return [...new Set(t.split(" ").filter((w) => w.length >= 2))];
}

async function main() {
  const products = await prisma.product.findMany({
    where: { shelfStatus: { not: "ARCHIVED" }, media: { none: { isPrimary: true } } },
    select: { id: true, name: true, nameDisplay: true, category: { select: { name: true } } },
  });
  const sources = await prisma.productSource.findMany({
    where: { matchStatus: "SUGGESTED", title: { not: null } },
    select: { id: true, title: true, raw: true },
  });

  const srcToks = sources.map((s) => {
    const cats = (s.raw as { categories?: string[] } | null)?.categories ?? [];
    return { id: s.id, title: s.title as string, cat: cats.length ? cats[cats.length - 1] : "", toks: new Set(toks(s.title as string)) };
  });
  const inv = new Map<string, number[]>();
  srcToks.forEach((s, i) => { for (const t of s.toks) { const a = inv.get(t); if (a) a.push(i); else inv.set(t, [i]); } });

  const out = [];
  for (const p of products) {
    const pt = toks([p.nameDisplay, p.name].filter(Boolean).join(" "));
    const counts = new Map<number, number>();
    for (const t of pt) { const a = inv.get(t); if (a) for (const i of a) counts.set(i, (counts.get(i) || 0) + 1); }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, K).map(([i]) => srcToks[i]);
    if (top.length) {
      out.push({
        id: p.id,
        pohoda: p.nameDisplay || p.name,
        pohodaCat: p.category?.name || "",
        candidates: top.map((s) => ({ sid: s.id, humed: s.title, humedCat: s.cat })),
      });
    }
  }
  mkdirSync("data", { recursive: true });
  writeFileSync("data/broad-candidates.json", JSON.stringify(out), "utf8");
  console.log(`Kurovaných bez obrázka: ${products.length} | s aspoň 1 kandidátom: ${out.length} -> data/broad-candidates.json`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
