// Vyexportuje navrhnuté zhody (SUGGESTED + productId) do data/match-candidates.json
// pre AI klasifikáciu (workflow). Spusti: npm run export:candidates
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.productSource.findMany({
    where: { matchStatus: "SUGGESTED", productId: { not: null } },
    select: {
      id: true,
      externalSku: true,
      title: true,
      raw: true,
      matchMethod: true,
      product: {
        select: { name: true, nameDisplay: true, category: { select: { name: true } } },
      },
    },
    orderBy: { matchMethod: "asc" },
  });

  const out = rows.map((r) => {
    const cats = (r.raw as { categories?: string[] } | null)?.categories ?? [];
    return {
      id: r.id,
      method: r.matchMethod,
      pohoda: r.product?.nameDisplay || r.product?.name || "",
      pohodaCat: r.product?.category?.name ?? "",
      humed: r.title ?? "",
      humedCat: cats.length ? cats[cats.length - 1] : "",
      code: r.externalSku ?? "",
    };
  });

  mkdirSync("data", { recursive: true });
  writeFileSync("data/match-candidates.json", JSON.stringify(out, null, 0), "utf8");
  console.log(`Vyexportovaných kandidátov: ${out.length} -> data/match-candidates.json`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
