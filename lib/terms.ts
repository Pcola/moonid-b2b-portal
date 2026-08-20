import "server-only";
import { createHash } from "node:crypto";

/** Verzia sa mení pri každej obsahovej zmene VOP. Staré objednávky nesú celý pôvodný text. */
export const TERMS_VERSION = "2026-08-20.1";
export const TERMS_PATH = "/obchodne-podmienky";

/** Jediný obsahový zdroj pre verejnú stránku aj nezmeniteľný order snapshot. */
export const TERMS_SECTIONS = [
  {
    title: "Predávajúci",
    paragraphs: [
      "Moonid s.r.o., Hlavná 39/78, 941 43 Dolný Ohaj, IČO 50 934 660, DIČ 2120530995, IČ DPH SK2120530995, Obchodný register Okresného súdu Nitra, oddiel Sro, vložka 43461/N. Kontakt: moonid@moonid.sk, +421 919 216 908.",
    ],
  },
  {
    title: "B2B rozsah",
    paragraphs: [
      "Portál je určený výhradne podnikateľom, ktorí nakupujú v súvislosti so svojou podnikateľskou činnosťou. Zmluvný vzťah sa spravuje právnym poriadkom Slovenskej republiky, najmä Obchodným zákonníkom, a týmito VOP.",
    ],
  },
  {
    title: "Objednávka a vznik zmluvy",
    paragraphs: [
      "Kupujúci môže pred odoslaním skontrolovať a opraviť položky, množstvá, ceny, dopravu, platbu, adresu a referenciu. Odoslanie objednávky je záväzným návrhom kupujúceho. Automatické potvrdenie prijatia iba potvrdzuje doručenie návrhu a nie je akceptáciou. Zmluva vzniká až samostatným potvrdením objednávky predávajúcim. Zmluva sa uzatvára v slovenskom jazyku a jej elektronický záznam vrátane tejto verzie VOP predávajúci archivuje.",
    ],
  },
  {
    title: "Ceny a DPH",
    paragraphs: [
      "Rozhodujú ceny zobrazené konkrétnemu prihlásenému kupujúcemu v rekapitulácii pred odoslaním. Ceny tovaru sú uvedené bez DPH; rekapitulácia uvádza DPH a celkovú cenu. Ak portál v rekapitulácii výslovne neuvedie minimálnu hodnotu objednávky, minimálna hodnota sa na danú objednávku neuplatní.",
    ],
  },
  {
    title: "Doprava, dodanie a platba",
    paragraphs: [
      "Dostupné spôsoby dopravy, ich cena, prípadná hranica dopravy zdarma, spôsob platby a príplatok sa zobrazia pred odoslaním a uložia k objednávke. Splatnosť faktúry je individuálne nastavená pre firmu a zobrazí sa pred odoslaním. Termín dodania predávajúci potvrdí podľa dostupnosti a rozvozového plánu. Nebezpečenstvo škody prechádza podľa Obchodného zákonníka; tovar zostáva vlastníctvom predávajúceho do úplného zaplatenia.",
    ],
  },
  {
    title: "Omeškanie",
    paragraphs: [
      "Pri omeškaní môže predávajúci uplatniť zákonný úrok z omeškania, paušálnu náhradu nákladov podľa platných predpisov, pozastaviť ďalšie dodávky alebo požadovať platbu vopred.",
    ],
  },
  {
    title: "Vady a reklamácie",
    paragraphs: [
      "Kupujúci tovar pri prevzatí skontroluje a vady oznámi bez zbytočného odkladu na moonid@moonid.sk s číslom dokladu, popisom a podľa možnosti fotodokumentáciou. Zodpovednosť za vady a nároky sa spravujú § 422 až 442 Obchodného zákonníka. Záruka za akosť platí iba ak bola výslovne dohodnutá alebo vyhlásená; tým nie je dotknutá zodpovednosť za vady.",
    ],
  },
  {
    title: "Vyššia moc a spory",
    paragraphs: [
      "Predávajúci nezodpovedá za nesplnenie spôsobené okolnosťami vylučujúcimi zodpovednosť podľa § 374 Obchodného zákonníka a o ich dopade kupujúceho informuje. Strany sa pokúsia spor vyriešiť dohodou; inak rozhodne vecne a miestne príslušný súd Slovenskej republiky.",
    ],
  },
  {
    title: "Ochrana osobných údajov a zmeny",
    paragraphs: [
      "Spracúvanie osobných údajov upravujú samostatné zásady ochrany osobných údajov. Pre objednávku platí verzia VOP, ktorú portál zobrazil a uložil pri jej odoslaní; neskoršia zmena ju nemení.",
    ],
  },
] as const;

/** Premenlivé sadzby dopravy a splatnosť sú v order snapshote, nie vo verziovanom texte. */
export const TERMS_TEXT = [
  "VŠEOBECNÉ OBCHODNÉ PODMIENKY MOONID S.R.O.",
  `Verzia ${TERMS_VERSION}`,
  ...TERMS_SECTIONS.map((section, index) =>
    `${index + 1}. ${section.title}\n${section.paragraphs.join("\n\n")}`
  ),
].join("\n\n");

export const TERMS_SHA256 = createHash("sha256").update(TERMS_TEXT, "utf8").digest("hex");

export const SELLER_SNAPSHOT = {
  name: "Moonid s.r.o.",
  address: "Hlavná 39/78",
  zip: "941 43",
  city: "Dolný Ohaj",
  ico: "50934660",
  dic: "2120530995",
  icDph: "SK2120530995",
  register: "Obchodný register Okresného súdu Nitra, oddiel Sro, vložka 43461/N",
  email: "moonid@moonid.sk",
  phone: "+421919216908",
} as const;
