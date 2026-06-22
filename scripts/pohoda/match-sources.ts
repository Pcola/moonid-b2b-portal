// Spáruje nespárované ProductSource (HUMED_FEED) s Pohoda produktmi (Product).
// CODE: norm(g:sku) == norm(SKz.IDS) → matchScore 1.0
// NAME: Jaccard token skóre názvu >= 0.4 → SUGGESTED
// Nastaví productId + matchMethod + matchScore; matchStatus zostáva SUGGESTED
// (potvrdzuje admin = copy-on-confirm). REJECTED/CONFIRMED riadky preskakuje.
// Spusti: npm run match:sources
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NAME_THRESHOLD = 0.4;

function stripDia(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function norm(s: string) { return s.trim().replace(/^0+/, ""); }
function toks(s: string): Set<string> {
  const t = stripDia(s).toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return new Set(t.split(" ").filter((w) => w.length >= 2));
}
function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, nameDisplay: true },
  });

  const byNormSku = new Map<string, string>();
  const tokById = new Map<string, Set<string>>();
  const inv = new Map<string, string[]>(); // token -> productIds
  for (const p of products) {
    const ns = norm(p.sku);
    if (ns && !byNormSku.has(ns)) byNormSku.set(ns, p.id);
    const tk = toks([p.nameDisplay, p.name].filter(Boolean).join(" "));
    tokById.set(p.id, tk);
    for (const t of tk) {
      const arr = inv.get(t);
      if (arr) arr.push(p.id); else inv.set(t, [p.id]);
    }
  }

  const sources = await prisma.productSource.findMany({
    where: { productId: null, matchStatus: "SUGGESTED" },
    select: { id: true, externalSku: true, title: true },
  });

  let code = 0, name = 0, none = 0;
  for (const s of sources) {
    let productId: string | null = null;
    let method: "CODE" | "NAME" | null = null;
    let score: number | null = null;

    const ns = s.externalSku ? norm(s.externalSku) : "";
    if (ns && byNormSku.has(ns)) {
      productId = byNormSku.get(ns)!;
      method = "CODE";
      score = 1.0;
    } else if (s.title) {
      const st = toks(s.title);
      const cand = new Set<string>();
      for (const t of st) { const ids = inv.get(t); if (ids) for (const id of ids) cand.add(id); }
      let best = 0, bestId: string | null = null;
      for (const id of cand) {
        const j = jaccard(st, tokById.get(id)!);
        if (j > best) { best = j; bestId = id; }
      }
      if (bestId && best >= NAME_THRESHOLD) { productId = bestId; method = "NAME"; score = best; }
    }

    if (productId) {
      await prisma.productSource.update({
        where: { id: s.id },
        data: { productId, matchMethod: method, matchScore: score },
      });
      if (method === "CODE") code++; else name++;
    } else {
      none++;
    }
  }

  console.log(`Matcher: CODE=${code}, NAME(>=${NAME_THRESHOLD})=${name}, bez zhody=${none} (z ${sources.length} nespárovaných)`);
  console.log(`Návrhy čakajú na potvrdenie adminom (matchStatus=SUGGESTED, productId vyplnené).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
