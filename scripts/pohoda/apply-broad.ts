// Aplikuje výsledok širokého AI párovania (data/broad-verdicts.json: [{id=productId, sid=zdroj|"" , confidence}]).
// sid && conf>=0.75 -> spáruj + CONFIRMED + copy-on-confirm. Spusti: npm run apply:broad
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();
const MIN = 0.75;
type Pick = { id: string; sid: string; confidence: number };

async function confirmPair(productId: string, sourceId: string): Promise<boolean> {
  const src = await prisma.productSource.findUnique({
    where: { id: sourceId },
    select: { id: true, imageUrl: true, descriptionLong: true, brand: true, ean: true, matchStatus: true },
  });
  if (!src || src.matchStatus === "CONFIRMED") return false; // už použité inde
  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, nameDisplay: true, descriptionLong: true, brand: true, ean: true, media: { where: { isPrimary: true }, select: { id: true } } },
  });
  if (!p) return false;

  const data: { descriptionLong?: string; brand?: string; ean?: string } = {};
  if (!p.descriptionLong && src.descriptionLong) data.descriptionLong = src.descriptionLong;
  if (!p.brand && src.brand) data.brand = src.brand;
  if (!p.ean && src.ean) data.ean = src.ean;
  if (Object.keys(data).length) await prisma.product.update({ where: { id: p.id }, data });

  if (p.media.length === 0 && src.imageUrl) {
    await prisma.productMedia.create({ data: { productId: p.id, storagePath: src.imageUrl, isPrimary: true, alt: p.nameDisplay || p.name } });
  }
  await prisma.productSource.update({
    where: { id: src.id },
    data: { productId, matchStatus: "CONFIRMED", matchMethod: "NAME", matchedAt: new Date(), matchedBy: "ai-broad" },
  });
  return true;
}

async function main() {
  const picks: Pick[] = JSON.parse(readFileSync("data/broad-verdicts.json", "utf8"));
  let confirmed = 0, none = 0, skip = 0;
  for (const pk of picks) {
    if (pk.sid && pk.confidence >= MIN) {
      if (await confirmPair(pk.id, pk.sid)) confirmed++; else skip++;
    } else none++;
  }
  console.log(`Broad: potvrdené=${confirmed}, žiadny/nízka istota=${none}, preskočené (zdroj už použitý)=${skip}`);
  const curatedImg = await prisma.product.count({ where: { shelfStatus: { not: "ARCHIVED" }, media: { some: { isPrimary: true } } } });
  console.log(`Kurovaných (FEATURED+CATALOG) s obrázkom teraz: ${curatedImg}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
