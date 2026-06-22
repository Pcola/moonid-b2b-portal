// Publikuje kurovaný katalóg na verejný web: isPublished=true pre všetky NEarchivované
// (FEATURED + CATALOG). Archivované (staré/nepredávané) ostávajú skryté.
// Spusti: npm run publish:curated
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.product.updateMany({
    where: { shelfStatus: { not: "ARCHIVED" } },
    data: { isPublished: true },
  });
  const pub = await prisma.product.count({ where: { isPublished: true } });
  const withImg = await prisma.product.count({ where: { isPublished: true, media: { some: { isPrimary: true } } } });
  console.log(`isPublished=true nastavené pre: ${res.count}`);
  console.log(`Publikovaných spolu: ${pub} | z toho s obrázkom: ${withImg} | s placeholderom: ${pub - withImg}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
