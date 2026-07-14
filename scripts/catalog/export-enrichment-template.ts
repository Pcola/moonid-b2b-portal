/**
 * Generuje predvyplnenú XLSX šablónu na obohatenie katalógu (enterprise náležitosti).
 * Ťahá ŽIVÉ dáta z DB (Prisma), takže je reprodukovateľná — kedykoľvek pregeneruješ.
 *
 * Spustenie:  npx tsx scripts/catalog/export-enrichment-template.ts [--all]
 *   default   = len publikované (najpredávanejších 418)
 *   --all     = celý katalóg (aj FEED backlog)
 *
 * Výstup: data/katalog/katalog-sablona-418.xlsx  (gitignored — biznis dáta)
 *
 * Filozofia: SKU je kľúč. Import (catalog-enrich) páruje podľa SKU, je idempotentný.
 * Šedé stĺpce = z Pohody, needáš meniť. Žlté = vyplň. Oranžové = ⚖️ zákonné (chémia).
 */
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();
const ALL = process.argv.includes("--all");

// ── farby ──
const C = {
  headerBg: "FF163F38", // brand deep
  headerFg: "FFFFFFFF",
  legalHeaderBg: "FF8A5A00", // jantár = ⚖️ zákonné
  locked: "FFEDEFEE", // šedá = z Pohody
  fill: "FFFFF7E0", // svetlo žltá = vyplň
  legalFill: "FFFDF1E2", // svetlo jantárová = zákonné vyplň
  refHeaderBg: "FF2C6E63",
};

type Col = {
  key: string;
  header: string;
  width: number;
  kind: "locked" | "fill" | "legal";
  note?: string;
  wrap?: boolean;
  list?: string[]; // inline dropdown
  listRef?: string; // range dropdown, napr. "Kategorie!$B$2:$B$200"
};

// ── definícia stĺpcov hárku Produkty ──
const COLS: Col[] = [
  { key: "sku", header: "SKU", width: 16, kind: "locked", note: "Kľúč na import a most na Pohodu. NEMEŇ." },
  { key: "name", header: "Názov (Pohoda)", width: 40, kind: "locked", wrap: true, note: "Názov zo systému. NEMEŇ — na web použi 'Zobrazovaný názov'." },
  { key: "hasImage", header: "Obrázok v systéme?", width: 10, kind: "locked", note: "áno = obrázok už je; nie = treba doplniť do stĺpca Obrázky." },
  { key: "unit", header: "MJ", width: 7, kind: "locked" },
  { key: "basePrice", header: "Cena bez DPH (€)", width: 13, kind: "locked" },
  { key: "vatRate", header: "DPH %", width: 7, kind: "locked" },
  { key: "category", header: "Kategória", width: 20, kind: "locked", note: "L1 kategória zo systému." },

  { key: "nameDisplay", header: "Zobrazovaný názov", width: 34, kind: "fill", wrap: true, note: "Krajšie meno pre web. Prázdne = použije sa Názov (Pohoda)." },
  { key: "ean", header: "EAN / GTIN-13", width: 16, kind: "fill", note: "13 číslic z etikety/GS1. Povinné pre profesionálnu položku a most na Pohodu." },
  { key: "mpn", header: "MPN (kód výrobcu)", width: 16, kind: "fill", note: "Katalógové číslo výrobcu (dávkovače, náhradné diely, gastro)." },
  { key: "brand", header: "Značka", width: 16, kind: "fill" },
  { key: "originCountry", header: "Krajina pôvodu", width: 14, kind: "fill" },
  { key: "subcategory", header: "Podkategória", width: 20, kind: "fill", listRef: "Kategorie!$A$2:$A$400", note: "Výber z hárku Kategórie (alebo napíš vlastnú)." },
  { key: "packSize", header: "Balenie (ks/kartón)", width: 16, kind: "fill", note: "napr. '12 ks/kartón', '6×5 L', '1 rolka'." },
  { key: "netContent", header: "Čistý obsah", width: 12, kind: "fill", note: "napr. '5 L', '750 ml', '2-vrstvový, 200 útržkov'." },
  { key: "moq", header: "Min. objednávka (MOQ)", width: 10, kind: "fill", note: "Minimálne objednávacie množstvo (prázdne = 1)." },
  { key: "orderMultiple", header: "Násobok objednávky", width: 10, kind: "fill", note: "napr. len po kartónoch á 12 (prázdne = 1)." },
  { key: "leadDays", header: "Lead-time (dni)", width: 10, kind: "fill", note: "Dodacia lehota ak nie je skladom." },
  { key: "descriptionShort", header: "Krátky popis", width: 34, kind: "fill", wrap: true, note: "1 veta — čo to je / na čo. Zobrazí sa v zozname/na karte." },
  { key: "descriptionLong", header: "Dlhý popis", width: 46, kind: "fill", wrap: true, note: "Použitie, výhody, dávkovanie. ≥150 znakov pre SEO." },
  { key: "scent", header: "Vôňa", width: 12, kind: "fill" },
  { key: "color", header: "Farba", width: 12, kind: "fill" },
  { key: "material", header: "Materiál", width: 14, kind: "fill", note: "napr. celulóza 2-vrstvová, PP, nitril." },
  { key: "productKind", header: "Druh", width: 14, kind: "fill", list: ["CONSUMABLE", "DISPENSER", "EQUIPMENT"], note: "CONSUMABLE=spotrebný, DISPENSER=dávkovač, EQUIPMENT=vybavenie." },
  { key: "images", header: "Obrázky (URL, viac cez |)", width: 30, kind: "fill", wrap: true, note: "URL alebo názvy súborov oddelené '|'. Import ich rehostne do Storage." },

  { key: "sds", header: "KBÚ / bezp. list (URL PDF)", width: 26, kind: "legal", wrap: true, note: "⚖️ REACH čl.31: karta bezpečnostných údajov v SK pre nebezpečné zmesi. PDF URL." },
  { key: "clpPictos", header: "CLP piktogramy", width: 18, kind: "legal", note: "⚖️ CLP: napr. GHS05|GHS07. Kódy pozri v hárku CLP. Viac cez '|'." },
  { key: "clpSignal", header: "Signálne slovo", width: 14, kind: "legal", list: ["Nebezpečenstvo", "Pozor", "(žiadne)"], note: "⚖️ CLP signálne slovo z etikety/KBÚ." },
  { key: "clpPhrases", header: "H / EUH vety", width: 22, kind: "legal", wrap: true, note: "⚖️ napr. H315;H319;EUH208. Viac cez ';'. Zoznam v hárku CLP." },
  { key: "biocide", header: "Biocíd? (á/n)", width: 10, kind: "legal", list: ["áno", "nie"], note: "⚖️ Dezinfekcie/biocídy: BPR 528/2012." },
  { key: "biocideAuth", header: "Biocíd — autorizácia", width: 18, kind: "legal", note: "⚖️ Číslo autorizácie/registrácie (CCHLP). Reklama vyžaduje aj povinnú vetu BPR." },
  { key: "ingredients", header: "Odkaz na zloženie (URL)", width: 22, kind: "legal", wrap: true, note: "⚖️ Detergenty 648/2004: verejný zoznam zložiek výrobcu." },

  { key: "variantGroup", header: "Skupina variantov (kľúč)", width: 20, kind: "fill", note: "Rovnaký kľúč pre produkty, čo patria spolu (viď hárok Skupiny). Prázdne = samostatný." },
  { key: "variantLabel", header: "Označenie variantu", width: 16, kind: "fill", note: "napr. 'Citrón', '5 L'." },
  { key: "variantSort", header: "Poradie variantu", width: 9, kind: "fill" },
  { key: "isDefaultVariant", header: "Predvolený variant? (á/n)", width: 12, kind: "fill", list: ["áno", "nie"] },

  { key: "publish", header: "Publikovať? (á/n)", width: 11, kind: "fill", list: ["áno", "nie"], note: "áno = zobraziť zákazníkom. Chémia bez KBÚ/CLP → daj 'nie' kým nedoplníš." },
  { key: "note", header: "Interná poznámka", width: 24, kind: "fill", wrap: true },
];

function headerFill(kind: Col["kind"]) {
  return kind === "legal" ? C.legalHeaderBg : C.headerBg;
}
function bodyFill(kind: Col["kind"]) {
  return kind === "locked" ? C.locked : kind === "legal" ? C.legalFill : C.fill;
}
function solid(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } };
}

async function main() {
  // ── dáta ──
  const cats = await prisma.category.findMany({ select: { id: true, name: true, parentId: true, sortOrder: true } });
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const catPath = (id: string | null) => {
    if (!id) return "";
    const c = catMap.get(id);
    if (!c) return "";
    const p = c.parentId ? catMap.get(c.parentId) : null;
    return p ? `${p.name} › ${c.name}` : c.name;
  };

  const groups = await prisma.productGroup.findMany({ select: { id: true, name: true } });
  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const withImage = new Set(
    (await prisma.productMedia.findMany({ select: { productId: true }, distinct: ["productId"] })).map((m) => m.productId)
  );

  const products = await prisma.product.findMany({
    where: ALL ? {} : { isPublished: true },
    select: {
      id: true, sku: true, name: true, nameDisplay: true, ean: true, brand: true,
      unit: true, packSize: true, vatRate: true, basePrice: true,
      descriptionShort: true, descriptionLong: true, scent: true, color: true, material: true,
      productKind: true, leadDays: true, isPublished: true,
      categoryId: true, subcategoryId: true,
      variantGroupId: true, variantLabel: true, variantSort: true, isDefaultVariant: true,
    },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Moonid catalog tooling";
  wb.created = new Date();

  // ═══ Hárok: Návod ═══
  const nav = wb.addWorksheet("Návod", { properties: { tabColor: { argb: "FF163F38" } } });
  nav.getColumn(1).width = 3;
  nav.getColumn(2).width = 120;
  const navLines: [string, "h1" | "h2" | "p" | "legend" | "warn"][] = [
    ["Katalóg — šablóna na obohatenie (enterprise náležitosti)", "h1"],
    [`Predvyplnené: ${products.length} položiek (${ALL ? "celý katalóg" : "publikované / najpredávanejšie"}). Generované zo živej DB — reprodukovateľné.`, "p"],
    ["", "p"],
    ["AKO NA TO", "h2"],
    ["1. Vypĺňaj hárok 'Produkty' — jeden riadok = jedna objednávateľná položka (SKU).", "p"],
    ["2. ŠEDÉ stĺpce sú z Pohody — NEMEŇ ich (SKU, Názov, MJ, cena, DPH, kategória).", "legend"],
    ["3. ŽLTÉ stĺpce vypĺňaš ty (názov na web, EAN, značka, balenie, popisy, obrázky…).", "legend"],
    ["4. ORANŽOVÉ stĺpce sú ⚖️ ZÁKONNÉ pri chémii (KBÚ, CLP, biocíd, zloženie) — bez nich produkt nepublikuj.", "legend"],
    ["", "p"],
    ["POVINNÉ PRED PUBLIKOVANÍM (inak daj 'Publikovať? = nie')", "h2"],
    ["• SKU, Názov, MJ, Cena bez DPH, DPH, Kategória (máš z Pohody)", "p"],
    ["• EAN/GTIN-13 • Balenie (ks/kartón) • Čistý obsah • aspoň 1 obrázok • Krátky popis", "p"],
    ["• [CHÉMIA] KBÚ (PDF v SK) • CLP piktogramy + Signálne slovo + H/EUH vety", "warn"],
    ["• [DETERGENT] odkaz na zloženie   • [BIOCÍD] číslo autorizácie", "warn"],
    ["", "p"],
    ["VARIANTY (rovnaký produkt, iná vôňa/farba/veľkosť)", "h2"],
    ["• Každý variant ostáva samostatný riadok s vlastným SKU/EAN/cenou (kvôli Pohode a objednávaniu).", "p"],
    ["• Aby sa na webe zobrazili ako JEDNA stránka s prepínačom: daj im rovnaký 'Skupina variantov (kľúč)'", "p"],
    ["  a vyplň hárok 'Skupiny' (spoločný popis/značku/KBÚ napíšeš RAZ na skupinu).", "p"],
    ["• 'Označenie variantu' = čím sa líši (Citrón / 5 L). Jeden z nich označ 'Predvolený variant = áno'.", "p"],
    ["• ⚠️ Chémia: rôzne vône môžu mať INÉ KBÚ/CLP — vtedy ich vyplň priamo na riadku (prebije skupinu).", "warn"],
    ["", "p"],
    ["OBRÁZKY A KBÚ (nie sú bunky)", "h2"],
    ["• Do stĺpca 'Obrázky' daj URL alebo názvy súborov oddelené '|'. Import ich stiahne a uloží do Storage.", "p"],
    ["• Do 'KBÚ' daj URL na PDF. Viac hodnôt (piktogramy, H-vety) oddeľuj '|' resp. ';'.", "p"],
    ["", "p"],
    ["IMPORT", "h2"],
    ["• Import páruje podľa SKU a je idempotentný — pokojne pošli súbor viackrát, needuplikuje.", "p"],
    ["• Prázdna bunka = 'nemeň'. Ak chceš pole vymazať, napíš '—'.", "p"],
    ["• Referenčné hárky: 'Kategórie', 'CLP', 'Číselníky' — hodnoty na kopírovanie/dropdowny.", "p"],
    ["", "p"],
    ["PRÍKLAD RIADKA (vzor formátu — nezadávaj ho)", "h2"],
  ];
  let r = 1;
  for (const [text, style] of navLines) {
    const cell = nav.getCell(`B${r}`);
    cell.value = text;
    cell.font = { name: "Arial", size: style === "h1" ? 15 : style === "h2" ? 12 : 10, bold: style === "h1" || style === "h2", color: style === "warn" ? { argb: "FF8A5A00" } : undefined };
    if (style === "legend") cell.font = { name: "Arial", size: 10 };
    r++;
  }
  // príkladová mini-tabuľka
  const exHeaders = ["SKU", "Zobrazovaný názov", "EAN", "Značka", "Balenie", "Krátky popis", "CLP piktogramy", "H vety", "Publikovať?"];
  const exValues = ["ABC-123", "Jar univerzálny čistič citrón 5 L", "8595001234567", "Jar", "4×5 L/kartón", "Univerzálny kyslý čistič na sanitu.", "GHS05|GHS07", "H315;H319", "áno"];
  nav.getRow(r + 1).values = ["", ...exHeaders];
  nav.getRow(r + 2).values = ["", ...exValues];
  nav.getRow(r + 1).eachCell((c, col) => { if (col > 1) { c.font = { name: "Arial", size: 9, bold: true, color: { argb: C.headerFg } }; c.fill = solid(C.headerBg); } });
  nav.getRow(r + 2).eachCell((c, col) => { if (col > 1) { c.font = { name: "Arial", size: 9 }; c.fill = solid(C.fill); } });

  // ═══ Hárok: Produkty ═══
  const ws = wb.addWorksheet("Produkty", {
    properties: { tabColor: { argb: "FF2C6E63" } },
    views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
  });
  ws.columns = COLS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  // hlavička
  const head = ws.getRow(1);
  head.height = 34;
  COLS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: C.headerFg } };
    cell.fill = solid(headerFill(c.kind));
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    if (c.note) cell.note = { texts: [{ text: c.note }] } as unknown as string;
  });

  // dáta
  const boolSk = (b: boolean | null | undefined) => (b ? "áno" : "nie");
  for (const p of products) {
    ws.addRow({
      sku: p.sku,
      name: p.name,
      hasImage: withImage.has(p.id) ? "áno" : "nie",
      unit: p.unit,
      basePrice: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: p.vatRate != null ? Number(p.vatRate) : null,
      category: catPath(p.categoryId),
      nameDisplay: p.nameDisplay ?? "",
      ean: p.ean ?? "",
      brand: p.brand ?? "",
      subcategory: catPath(p.subcategoryId),
      packSize: p.packSize ?? "",
      descriptionShort: p.descriptionShort ?? "",
      descriptionLong: p.descriptionLong ?? "",
      scent: p.scent ?? "",
      color: p.color ?? "",
      material: p.material ?? "",
      productKind: p.productKind ?? "",
      leadDays: p.leadDays ?? "",
      variantGroup: p.variantGroupId ? groupMap.get(p.variantGroupId) ?? "" : "",
      variantLabel: p.variantLabel ?? "",
      variantSort: p.variantSort ?? "",
      isDefaultVariant: boolSk(p.isDefaultVariant),
      publish: boolSk(p.isPublished),
    });
  }

  const lastRow = ws.rowCount; // vrátane hlavičky
  // štýl tela + validácie
  COLS.forEach((c, i) => {
    const col = i + 1;
    for (let rr = 2; rr <= lastRow; rr++) {
      const cell = ws.getRow(rr).getCell(col);
      cell.font = { name: "Arial", size: 10 };
      cell.fill = solid(bodyFill(c.kind));
      cell.alignment = { vertical: "top", wrapText: !!c.wrap };
      if (c.key === "basePrice") cell.numFmt = "#,##0.00";
      if (c.key === "vatRate") cell.numFmt = "0";
      if (c.list) {
        cell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${c.list.join(",")}"`], showErrorMessage: false };
      } else if (c.listRef) {
        cell.dataValidation = { type: "list", allowBlank: true, formulae: [`=${c.listRef}`], showErrorMessage: false };
      }
    }
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };

  // ═══ Hárok: Skupiny ═══
  const grp = wb.addWorksheet("Skupiny", { properties: { tabColor: { argb: "FF2C6E63" } }, views: [{ state: "frozen", ySplit: 1 }] });
  const grpCols: Col[] = [
    { key: "groupKey", header: "Skupina (kľúč)", width: 20, kind: "fill", note: "Rovnaký kľúč napíš aj do 'Produkty → Skupina variantov'." },
    { key: "name", header: "Názov skupiny (na web)", width: 34, kind: "fill", wrap: true },
    { key: "axis", header: "Os variantu", width: 14, kind: "fill", list: ["vôňa", "farba", "veľkosť", "balenie"] },
    { key: "descriptionLong", header: "Spoločný popis", width: 46, kind: "fill", wrap: true, note: "Napíšeš RAZ, platí pre všetky varianty." },
    { key: "brand", header: "Značka", width: 16, kind: "fill" },
    { key: "category", header: "Kategória", width: 20, kind: "fill", listRef: "Kategorie!$A$2:$A$400" },
    { key: "sds", header: "Spoločné KBÚ (URL)", width: 24, kind: "legal", wrap: true, note: "⚖️ Default pre skupinu; ak sa variant líši, vyplň KBÚ priamo na riadku produktu." },
    { key: "clpPictos", header: "Spoločné CLP piktogramy", width: 18, kind: "legal" },
    { key: "clpSignal", header: "Signálne slovo", width: 14, kind: "legal", list: ["Nebezpečenstvo", "Pozor", "(žiadne)"] },
    { key: "clpPhrases", header: "Spoločné H/EUH vety", width: 22, kind: "legal", wrap: true },
    { key: "note", header: "Poznámka", width: 24, kind: "fill", wrap: true },
  ];
  grp.columns = grpCols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  grp.getRow(1).height = 30;
  grpCols.forEach((c, i) => {
    const cell = grp.getRow(1).getCell(i + 1);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: C.headerFg } };
    cell.fill = solid(headerFill(c.kind));
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    if (c.note) cell.note = { texts: [{ text: c.note }] } as unknown as string;
  });
  // príklad + prázdne riadky s validáciou
  grp.addRow({ groupKey: "PRÍKLAD-jar-5l", name: "Jar univerzálny čistič 5 L", axis: "vôňa", descriptionLong: "Kyslý univerzálny čistič na sanitu, v 3 vôňach.", brand: "Jar", category: "Čistiace prostriedky", clpSignal: "Pozor" });
  for (let rr = 2; rr <= 60; rr++) {
    grpCols.forEach((c, i) => {
      const cell = grp.getRow(rr).getCell(i + 1);
      cell.font = { name: "Arial", size: 10, italic: rr === 2 };
      cell.fill = solid(bodyFill(c.kind));
      cell.alignment = { vertical: "top", wrapText: !!c.wrap };
      if (c.list) cell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${c.list.join(",")}"`], showErrorMessage: false };
      else if (c.listRef) cell.dataValidation = { type: "list", allowBlank: true, formulae: [`=${c.listRef}`], showErrorMessage: false };
    });
  }

  // ═══ Ref: Kategórie ═══
  const refCat = wb.addWorksheet("Kategorie", { properties: { tabColor: { argb: "FFB0B7B4" } } });
  refCat.columns = [{ header: "Kategória / Podkategória (platné hodnoty)", key: "v", width: 44 }];
  refCat.getRow(1).font = { name: "Arial", size: 10, bold: true, color: { argb: C.headerFg } };
  refCat.getRow(1).fill = solid(C.refHeaderBg);
  const catNames = [...new Set(cats.map((c) => (c.parentId ? `${catMap.get(c.parentId)?.name} › ${c.name}` : c.name)))].sort();
  for (const n of catNames) refCat.addRow({ v: n });

  // ═══ Ref: CLP ═══
  const refClp = wb.addWorksheet("CLP", { properties: { tabColor: { argb: "FFB0B7B4" } } });
  refClp.columns = [
    { header: "Kód", key: "k", width: 12 },
    { header: "Význam (SK)", key: "v", width: 50 },
  ];
  refClp.getRow(1).eachCell((c) => { c.font = { name: "Arial", size: 10, bold: true, color: { argb: C.headerFg } }; c.fill = solid(C.refHeaderBg); });
  const clp: [string, string][] = [
    ["— PIKTOGRAMY —", ""],
    ["GHS01", "Výbušné látky"],
    ["GHS02", "Horľavé látky"],
    ["GHS03", "Oxidujúce látky"],
    ["GHS04", "Plyny pod tlakom"],
    ["GHS05", "Korozívne / žieravé (poškodenie kože, očí, korózia kovov)"],
    ["GHS06", "Toxické (akútna toxicita)"],
    ["GHS07", "Dráždivé / škodlivé (výkričník)"],
    ["GHS08", "Nebezpečné pre zdravie (dlhodobé účinky)"],
    ["GHS09", "Nebezpečné pre životné prostredie"],
    ["— SIGNÁLNE SLOVO —", ""],
    ["Nebezpečenstvo", "závažnejšie kategórie"],
    ["Pozor", "menej závažné kategórie"],
    ["— ČASTÉ H/EUH VETY (čistiaca chémia) —", "úplný a záväzný zoznam VŽDY z KBÚ výrobcu"],
    ["H290", "Môže byť korozívna pre kovy"],
    ["H302", "Škodlivá po požití"],
    ["H314", "Spôsobuje vážne poleptanie kože a poškodenie očí"],
    ["H315", "Dráždi kožu"],
    ["H318", "Spôsobuje vážne poškodenie očí"],
    ["H319", "Spôsobuje vážne podráždenie očí"],
    ["H335", "Môže spôsobiť podráždenie dýchacích ciest"],
    ["H400", "Veľmi toxická pre vodné organizmy"],
    ["H411", "Toxická pre vodné organizmy, s dlhodobými účinkami"],
    ["H412", "Škodlivá pre vodné organizmy, s dlhodobými účinkami"],
    ["EUH031", "Pri kontakte s kyselinami uvoľňuje toxický plyn"],
    ["EUH206", "Pozor! Nepoužívajte spolu s inými výrobkami (chlór)"],
    ["EUH208", "Obsahuje (alergén). Môže vyvolať alergickú reakciu"],
  ];
  for (const [k, v] of clp) {
    const row = refClp.addRow({ k, v });
    if (k.startsWith("—")) row.eachCell((c) => { c.font = { name: "Arial", size: 10, bold: true }; });
    else row.eachCell((c) => { c.font = { name: "Arial", size: 10 }; });
  }

  // ═══ Ref: Číselníky ═══
  const refEnum = wb.addWorksheet("Ciselniky", { properties: { tabColor: { argb: "FFB0B7B4" } } });
  refEnum.columns = [
    { header: "Jednotky (MJ)", key: "u", width: 16 },
    { header: "Druh (productKind)", key: "k", width: 20 },
    { header: "Cenové úrovne", key: "t", width: 22 },
    { header: "Os variantu", key: "a", width: 16 },
  ];
  refEnum.getRow(1).eachCell((c) => { c.font = { name: "Arial", size: 10, bold: true, color: { argb: C.headerFg } }; c.fill = solid(C.refHeaderBg); });
  const tiers = await prisma.priceTier.findMany({ select: { code: true, name: true, discountPct: true }, orderBy: { code: "asc" } });
  const units = ["ks", "bal", "kartón", "rolka", "l", "ml", "kg", "g", "pár", "sada"];
  const kinds = ["CONSUMABLE", "DISPENSER", "EQUIPMENT"];
  const axes = ["vôňa", "farba", "veľkosť", "balenie"];
  const maxLen = Math.max(units.length, kinds.length, tiers.length, axes.length);
  for (let i = 0; i < maxLen; i++) {
    refEnum.addRow({
      u: units[i] ?? "",
      k: kinds[i] ?? "",
      t: tiers[i] ? `${tiers[i].code} — ${tiers[i].name} (−${Number(tiers[i].discountPct)}%)` : "",
      a: axes[i] ?? "",
    });
  }
  refEnum.eachRow((row, n) => { if (n > 1) row.eachCell((c) => { c.font = { name: "Arial", size: 10 }; }); });

  // ── zápis ──
  const outDir = resolve(process.cwd(), "data", "katalog");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, ALL ? "katalog-sablona-VSETKO.xlsx" : "katalog-sablona-418.xlsx");
  await wb.xlsx.writeFile(outFile);
  console.log(`✓ Hotovo: ${outFile}`);
  console.log(`  Produktov: ${products.length}  ·  bez obrázka: ${products.filter((p) => !withImage.has(p.id)).length}`);
  console.log(`  Hárky: Návod · Produkty · Skupiny · Kategorie · CLP · Ciselniky`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
