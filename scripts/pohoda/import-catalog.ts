// Import katalógu z data/catalog.json (výstup export-catalog.ps1) do portál DB.
// Idempotentné (upsert podľa sku). Spusti: npm run import:catalog
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

type Row = {
  sku: string;
  name: string;
  unit: string;
  mj2Koef: number;
  basePrice: number;
  costPrice: number;
  stock: number;
  productKind: "CONSUMABLE" | "DISPENSER" | "EQUIPMENT";
  categorySlug: string;
  shelfStatus: "FEATURED" | "CATALOG" | "ARCHIVED";
  isStocked: boolean;
  isSubsidized: boolean;
  revenue: number;
  lastYear: number;
  customers: number;
};

async function main() {
  const raw = readFileSync("data/catalog.json", "utf8").replace(/^﻿/, "");
  const rows: Row[] = JSON.parse(raw);
  const cats = await prisma.category.findMany();
  const catId = new Map(cats.map((c) => [c.slug, c.id]));
  const now = new Date();

  let n = 0;
  for (const r of rows) {
    const categoryId = catId.get(r.categorySlug) ?? null;
    const featuredReason =
      r.shelfStatus === "FEATURED"
        ? `obrat=${Math.round(r.revenue)}EUR, zak=${r.customers}, posl=${r.lastYear}`
        : null;

    const data = {
      name: r.name,
      unit: r.unit || "ks",
      mj2Koef: r.mj2Koef || null,
      basePrice: r.basePrice || null,
      costPrice: r.costPrice || null,
      stockCache: r.stock,
      stockSyncedAt: now,
      isStocked: r.isStocked,
      isSubsidized: r.isSubsidized,
      productKind: r.productKind,
      shelfStatus: r.shelfStatus,
      featuredReason,
      categoryId,
      syncedAt: now,
    };

    await prisma.product.upsert({
      where: { sku: r.sku },
      update: data,
      create: { sku: r.sku, contentStatus: "STUB", ...data },
    });
    n++;
    if (n % 250 === 0) console.log(`  ...${n}`);
  }

  const total = await prisma.product.count();
  const byShelf = await prisma.product.groupBy({
    by: ["shelfStatus"],
    _count: { _all: true },
  });
  const byKind = await prisma.product.groupBy({
    by: ["productKind"],
    _count: { _all: true },
  });
  console.log(`Hotovo. Upsertnutých: ${n} | Produktov v DB: ${total}`);
  console.log(
    "shelfStatus:",
    byShelf.map((x) => `${x.shelfStatus}=${x._count._all}`).join(", ")
  );
  console.log(
    "productKind:",
    byKind.map((x) => `${x.productKind}=${x._count._all}`).join(", ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
