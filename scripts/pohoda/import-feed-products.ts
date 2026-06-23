// Import feedových produktov do katalógu (Fáza A).
// Promotuje humed ProductSource (matchStatus != CONFIRMED) na feed-origin Product:
//   sku = HUM-<g:id> (unikátne, nekoliduje s Pohoda IDS), origin=FEED, obrázok z imageUrl,
//   kategória z raw.categories (mapovaná na čistú taxonómiu), značka + objem z názvu,
//   cena = null -> ON_REQUEST ("na vyžiadanie"), isStocked=false (na objednávku), isPublished=true.
// Idempotentné: preskočí ak Product so sku HUM-<id> už existuje.
// Spusti: npm run import:feed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// feed top-level kategória -> kanonická kategória katalógu
const CATEGORY_MAP: Record<string, string> = {
  "Čistiace prostriedky": "Čistiace prostriedky",
  "Upratovacie pomôcky": "Upratovanie",
  "Kozmetika": "Kozmetika",
  "Hygienický papier": "Hygienický papier",
  "Zásobníky, dávkovače,  koše, sušiče a kupeľňové sety": "Dávkovače a zásobníky",
  "Rukavice jednorázové a upratovacie": "Rukavice",
  "Vrecia": "Vrecia a obaly",
  "Pracie prostriedky": "Pracie prostriedky",
  "Baliaci materiál": "Baliaci materiál",
  "Mydlá": "Mydlá a peny",
  "Dezinfekcia, repelenty, insekticídy": "Dezinfekcia",
  "Tašky, sáčky, hyg sáčky": "Tašky a sáčky",
  "TORK hygiena": "Hygienický papier",
  "Osviežovače vzduchu": "Osviežovače vzduchu",
  "Ostatné": "Príslušenstvo",
};

const BRANDS = [
  "SIDOLUX", "SAVO", "FIXINELA", "BREF", "AJAX", "CIF", "JAR", "PUR", "FAIRY", "DOMESTOS", "TORK", "KATRIN",
  "LOTUS", "KRYSTAL", "VILEDA", "LEIFHEIT", "SANYTOL", "PRIMASEPT", "WELLDONE", "PERWOLL", "PERSIL", "ARIEL",
  "LENOR", "SILAN", "REX", "PALMOLIVE", "NIVEA", "VITALON", "GREEN PHARMACY", "TULIPÁN", "TULIPAN", "CLIN",
  "PRONTO", "OKENA", "DIXI", "SCOTT", "AQUARIUS", "CELLART", "RULOPAK", "VELVET", "ZEWA", "HARMONY",
  "PEMARK", "DEZON", "INCIDIN", "GLANC", "LARRIN", "TYTAN", "SAVON",
];

const COLORS: Record<string, string> = {
  "BIELY": "biela", "BIELA": "biela", "BIELE": "biela",
  "ČIERNY": "čierna", "ČIERNA": "čierna", "ČIERNE": "čierna", "CIERNY": "čierna",
  "MODRÝ": "modrá", "MODRÁ": "modrá", "MODRE": "modrá",
  "ČERVENÝ": "červená", "ČERVENÁ": "červená", "CERVENY": "červená",
  "ZELENÝ": "zelená", "ZELENÁ": "zelená",
  "ŽLTÝ": "žltá", "ŽLTÁ": "žltá",
  "TRANSPARENTNÝ": "transparentná", "TRANSPARENT": "transparentná", "PRIEHĽADNÝ": "transparentná",
  "NEREZ": "nerez", "NEREZOVÝ": "nerez",
};

function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "produkt";
}

function parseBrand(title: string): string | null {
  const up = title.toUpperCase().trim();
  const norm = (b: string) => (b === "TULIPAN" ? "TULIPÁN" : b);
  for (const b of BRANDS) if (up.startsWith(b)) return norm(b); // názov väčšinou začína značkou
  const padded = " " + up + " ";
  for (const b of BRANDS) if (padded.includes(" " + b + " ")) return norm(b);
  return null;
}

function parseVolume(title: string): string | null {
  // prvý objemový/množstvový token: 500ml, 5 l, 100 ks, 0,75l, 60L, 1kg, 20m
  const m = title.match(/(\d+(?:[.,]\d+)?)\s?(ml|l|kg|g|ks|m|cm|mm)\b/i);
  if (!m) return null;
  return `${m[1].replace(",", ".")} ${m[2].toLowerCase()}`;
}

function parseColor(title: string): string | null {
  const up = title.toUpperCase();
  for (const [k, v] of Object.entries(COLORS)) if (up.includes(k)) return v;
  return null;
}

async function main() {
  const sources = await prisma.productSource.findMany({
    where: { sourceType: "HUMED_FEED", matchStatus: { not: "CONFIRMED" }, imageUrl: { not: null }, title: { not: "" } },
    select: { id: true, externalId: true, externalSku: true, title: true, imageUrl: true, raw: true },
  });

  // predmapuj kategórie (upsert) -> id podľa kanonického názvu
  const wantedCats = new Set<string>();
  for (const s of sources) {
    const r = s.raw as { categories?: string[] } | null;
    const top = r?.categories?.[0]?.split(">")[0].trim();
    wantedCats.add(top && CATEGORY_MAP[top] ? CATEGORY_MAP[top] : "Príslušenstvo");
  }
  const catId = new Map<string, string>();
  for (const name of wantedCats) {
    const c = await prisma.category.upsert({ where: { name }, create: { name, slug: slugify(name) }, update: {}, select: { id: true } });
    catId.set(name, c.id);
  }

  const existing = new Set((await prisma.product.findMany({ where: { origin: "FEED" }, select: { sku: true } })).map((p) => p.sku));
  const usedSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug).filter(Boolean) as string[]);

  let created = 0, skipped = 0;
  for (const s of sources) {
    const sku = `HUM-${s.externalId}`;
    if (existing.has(sku)) { skipped++; continue; }
    const r = s.raw as { categories?: string[] } | null;
    const topRaw = r?.categories?.[0]?.split(">")[0].trim();
    const canonical = topRaw && CATEGORY_MAP[topRaw] ? CATEGORY_MAP[topRaw] : "Príslušenstvo";
    const fullPath = r?.categories?.[1] || r?.categories?.[0] || null;

    let slug = slugify(s.title);
    if (usedSlugs.has(slug)) slug = `${slug}-h${s.externalId}`;
    usedSlugs.add(slug);

    const brand = parseBrand(s.title);
    const packSize = parseVolume(s.title);
    const color = parseColor(s.title);
    const attributes: Record<string, string> = {};
    if (fullPath) attributes.kategoriaPlna = fullPath;
    if (packSize) attributes.objem = packSize;

    await prisma.product.create({
      data: {
        sku, origin: "FEED", name: s.title, nameDisplay: s.title,
        categoryId: catId.get(canonical) ?? null,
        brand: brand ?? undefined, packSize: packSize ?? undefined, color: color ?? undefined,
        attributes: Object.keys(attributes).length ? attributes : undefined,
        vatRate: 23, isStocked: false, isPublished: true, shelfStatus: "CATALOG", contentStatus: "STUB",
        slug,
        media: { create: { storagePath: s.imageUrl!, isPrimary: true, sortOrder: 0 } },
      },
    });
    created++;
  }

  console.log(`Vytvorených feed produktov: ${created}, preskočených (už existujú): ${skipped}`);
  const [pub, feedPub, withImg, brands] = await Promise.all([
    prisma.product.count({ where: { isPublished: true } }),
    prisma.product.count({ where: { isPublished: true, origin: "FEED" } }),
    prisma.product.count({ where: { isPublished: true, media: { some: { isPrimary: true } } } }),
    prisma.product.count({ where: { isPublished: true, brand: { not: null } } }),
  ]);
  console.log({ publishedTotal: pub, feedPublished: feedPub, withImage: withImg, withBrand: brands });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
