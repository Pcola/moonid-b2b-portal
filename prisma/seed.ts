import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cenové úrovne — discountPct je FALLBACK kým hladiny nie sú v Pohode.
// (Overené: Pohoda dnes nemá cenové hladiny — rozhodnutie majiteľa, viď BUILD_BLUEPRINT §9.)
const tiers = [
  { code: "A", name: "Štandard", discountPct: 8 },
  { code: "B1", name: "Partner", discountPct: 12 },
  { code: "B2", name: "Hotel", discountPct: 18 },
  { code: "B3", name: "Gastro VIP", discountPct: 22 },
];

const categories = [
  "Hygienický papier",
  "Mydlá a peny",
  "Dezinfekcia",
  "Čistiace prostriedky",
  "Dávkovače a zásobníky",
  "Upratovanie",
  "Vrecia a obaly",
  "Príslušenstvo",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  for (const t of tiers) {
    await prisma.priceTier.upsert({
      where: { code: t.code },
      update: { name: t.name, discountPct: t.discountPct },
      create: t,
    });
  }

  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: { name, sortOrder: i },
      create: { name, slug, sortOrder: i },
    });
  }

  console.log(
    `Seed hotový: ${tiers.length} cenových úrovní + ${categories.length} kategórií.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
