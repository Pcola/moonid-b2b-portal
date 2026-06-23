// Konzervatívne auto-zoskupenie veľkostných variantov (Fáza B).
// Pravidlo (vysoký prah, bezpečné): rovnaká ZNAČKA + rovnaká KATEGÓRIA + rovnaký ZÁKLAD názvu
// (názov bez objemového tokenu) + 2–6 členov s RÔZNYM packSize → veľkostné varianty.
// Vytvorí ProductGroup, nastaví variantGroupId/axis=size/label=packSize/sort/default.
// Idempotentné: členov už v skupine NEpresúva. Reverzibilné: variantGroupId=NULL.
// Spusti: npm run group:variants
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function strip(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function baseKey(name: string): string {
  return strip(name.replace(/\d+(?:[.,]\d+)?\s?(ml|l|kg|g|ks|m|cm|mm)\b/gi, " "));
}
function volNum(packSize: string | null): number {
  if (!packSize) return 0;
  const m = packSize.match(/(\d+(?:[.,]\d+)?)\s?(ml|l|kg|g|ks|m|cm|mm)/i);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(",", "."));
  const u = m[2].toLowerCase();
  if (u === "l") n *= 1000; else if (u === "kg") n *= 1000; // hrubé na zoradenie
  return n;
}
function slugify(s: string): string {
  return strip(s).replace(/\s+/g, "-").slice(0, 56) || "skupina";
}

async function main() {
  const rows = await prisma.product.findMany({
    where: { isPublished: true, brand: { not: null }, packSize: { not: null }, variantGroupId: null },
    select: { id: true, name: true, nameDisplay: true, brand: true, packSize: true, categoryId: true },
  });

  // zoskup podľa značka|kategória|základ
  const groups = new Map<string, typeof rows>();
  for (const p of rows) {
    const key = `${p.brand}|${p.categoryId ?? "-"}|${baseKey(p.nameDisplay || p.name)}`;
    if (!groups.get(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const usedSlugs = new Set((await prisma.productGroup.findMany({ select: { slug: true } })).map((g) => g.slug).filter(Boolean) as string[]);
  let createdGroups = 0, groupedMembers = 0;

  for (const [, members] of groups) {
    if (members.length < 2 || members.length > 6) continue;
    const distinctSizes = new Set(members.map((m) => m.packSize));
    if (distinctSizes.size < 2) continue; // musia sa líšiť veľkosťou (inak sú to duplicity, nie varianty)

    const sorted = [...members].sort((a, b) => volNum(a.packSize) - volNum(b.packSize));
    // názov skupiny = základ z najmenšieho člena (bez objemu), pekne orezaný
    const baseName = (sorted[0].nameDisplay || sorted[0].name).replace(/\s*\d+(?:[.,]\d+)?\s?(ml|l|kg|g|ks|m|cm|mm)\b.*$/i, "").trim() || (sorted[0].nameDisplay || sorted[0].name);
    let slug = slugify(baseName + "-" + sorted[0].brand);
    while (usedSlugs.has(slug)) slug = slug + "-x";
    usedSlugs.add(slug);

    const group = await prisma.productGroup.create({
      data: { name: baseName, slug, categoryId: sorted[0].categoryId, primaryAxis: "size", isPublished: true },
    });
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      await prisma.product.update({
        where: { id: m.id },
        data: { variantGroupId: group.id, variantAxis: "size", variantLabel: m.packSize, variantSort: i, isDefaultVariant: i === 0 },
      });
    }
    createdGroups++;
    groupedMembers += sorted.length;
  }

  console.log({ createdGroups, groupedMembers });
  const [grp, members, defaults] = await Promise.all([
    prisma.productGroup.count(),
    prisma.product.count({ where: { variantGroupId: { not: null } } }),
    prisma.product.count({ where: { isDefaultVariant: true } }),
  ]);
  console.log({ totalGroups: grp, totalMembers: members, defaults });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
