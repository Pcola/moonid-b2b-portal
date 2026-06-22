// Aplikuje AI verdikty (data/match-verdicts.json) na ProductSource.
// same & conf>=0.75 -> CONFIRMED (copy-on-confirm: obrázok+popis+značka+ean do Product ak prázdne)
// different & conf>=0.6 -> REJECTED ; inak ponechá SUGGESTED.
// Spusti: npm run apply:verdicts
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const CONFIRM_MIN = 0.75;
const REJECT_MIN = 0.6;

type Verdict = { id: string; verdict: "same" | "different" | "uncertain"; confidence: number };

async function confirm(sourceId: string): Promise<boolean> {
  const src = await prisma.productSource.findUnique({
    where: { id: sourceId },
    include: { product: { include: { media: true } } },
  });
  if (!src || !src.productId || !src.product) return false;
  const p = src.product;

  const data: { descriptionLong?: string; brand?: string; ean?: string } = {};
  if (!p.descriptionLong && src.descriptionLong) data.descriptionLong = src.descriptionLong;
  if (!p.brand && src.brand) data.brand = src.brand;
  if (!p.ean && src.ean) data.ean = src.ean;
  if (Object.keys(data).length) await prisma.product.update({ where: { id: p.id }, data });

  const hasPrimary = p.media.some((m) => m.isPrimary);
  if (!hasPrimary && src.imageUrl) {
    await prisma.productMedia.create({
      data: { productId: p.id, storagePath: src.imageUrl, isPrimary: true, alt: p.nameDisplay || p.name },
    });
  }
  await prisma.productSource.update({
    where: { id: sourceId },
    data: { matchStatus: "CONFIRMED", matchedAt: new Date(), matchedBy: "ai" },
  });
  return true;
}

async function main() {
  const verdicts: Verdict[] = JSON.parse(readFileSync("data/match-verdicts.json", "utf8"));
  let confirmed = 0, rejected = 0, left = 0;
  for (const v of verdicts) {
    if (v.verdict === "same" && v.confidence >= CONFIRM_MIN) {
      if (await confirm(v.id)) confirmed++; else left++;
    } else if (v.verdict === "different" && v.confidence >= REJECT_MIN) {
      await prisma.productSource.update({
        where: { id: v.id },
        data: { matchStatus: "REJECTED", matchedAt: new Date(), matchedBy: "ai" },
      });
      rejected++;
    } else {
      left++;
    }
  }
  console.log(`Aplikované: potvrdené=${confirmed}, zamietnuté=${rejected}, ponechané (neisté)=${left}`);
  const withImg = await prisma.product.count({ where: { media: { some: { isPrimary: true } } } });
  console.log(`Produktov s primárnym obrázkom: ${withImg}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
