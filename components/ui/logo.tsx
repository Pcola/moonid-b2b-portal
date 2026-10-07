import { cn } from "@/lib/utils";

/** Logotyp „moonid." ako SVG z obrysov — nezávislý od načítaných fontov.
 *
 *  Prečo: wordmark bol na 8 miestach (+ monogram „m." v mockupe portálu) živý text v Bricolage
 *  Grotesque; /cakajuce mal vlastný text v Hanken. Redizajn 2026 mení
 *  display font na Newsreader (docs/REDESIGN_2026.md, R1 a K4), takže textové logo by sa
 *  zmenilo spolu s ním — to by bol rebrand, nie výmena fontu. Obrysy sú preto vyrezané
 *  z presne toho súboru, ktorý servíroval next/font (Bricolage Grotesque, Google Fonts v9,
 *  subset latin, inštancia wght 600, kerning cez HarfBuzz, tracking −0,03 em) a
 *  optimalizované na celé jednotky v ploche UPM 1000 (≈ 1,6 KB). Font Bricolage sa už
 *  nenačítava (−58 KB).
 *
 *  viewBox je tesný obrys tlače (bez bočných a vertikálnych okrajov), takže výška loga je
 *  priamo výška písmen: ≈ 0,747 × pôvodná font-size textového wordmarku
 *  (23 px → h-[17px], 26 px → h-[19px], 28 px → h-[21px], 30 px → h-[22px]).
 *  Šírku dopočíta prehliadač z pomeru strán (≈ 4,82 : 1), stačí nastaviť výšku.
 *
 *  Bodka je samostatná cesta, aby mohla niesť akcent (mint-ink na svetlej, mint na tmavej)
 *  — rovnako ako `<span className="text-mint">.</span>` v pôvodnom texte. */

const VIEWBOX = "70 -733 3601 747";

const LETTERS =
  "M70 0v-523h105l-4 160h18q14-58 37-96 22-39 55-58t76-19q47 0 79 22 31 22 48 60 16 39 20 89h16q14-57 38-95 24-39 59-57 36-19 78-19 43 0 75 17 31 17 53 50 22 32 32 81 11 49 11 113V0H739v-259q0-56-9-93-10-37-30-56-20-18-50-18-35 0-60 23-26 23-42 65-15 41-18 93V0H406v-253q0-59-10-97t-30-57-51-19q-36 0-62 24-25 24-40 66-14 42-17 93V0Zm1132 13q-77 0-136-31-59-32-92-93-33-62-33-152 0-92 34-152 34-61 93-91t134-30 135 31q59 31 93 93 34 61 34 152 0 92-34 153-35 61-94 91-60 29-134 29m4-96q42 0 72-19 29-20 44-59t15-93q0-57-16-97-16-41-47-63t-76-22q-40 0-70 19-29 20-45 58-15 38-15 94 0 88 37 135t101 47m573 96q-77 0-136-31-59-32-92-93-33-62-33-152 0-92 34-152 34-61 93-91t134-30 135 31q59 31 93 93 34 61 34 152 0 92-34 153-35 61-94 91-60 29-134 29m4-96q42 0 72-19 29-20 44-59t15-93q0-57-16-97-16-41-47-63t-76-22q-40 0-70 19-29 20-45 58-15 38-15 94 0 88 37 135t101 47m340 83v-523h107l-4 160h18q14-58 38-97t60-57 86-19q89 0 136 63 46 64 46 195V0h-127v-265q0-84-25-124-26-40-76-40-42 0-72 27-29 26-44 69-15 44-17 96V0Zm590 0v-523h126V0Zm63-605q-38 0-59-16-20-16-20-47 0-32 20-48 20-17 59-17t60 17 20 47-20 48q-21 16-60 16m362 618q-66 0-114-34t-74-96q-27-62-27-145 0-79 24-140 24-62 71-97 47-36 115-36 52 0 87 21 35 20 57 57 22 36 35 85h21l-11-63-8-59q-3-29-3-51v-165h127V0h-107l1-148h-19q-11 53-34 89-23 35-58 54-35 18-83 18m39-104q34 0 60-16 25-15 41-39 17-25 25-53t8-53v-17q0-19-5-41-6-22-16-43-11-22-27-40-16-17-38-28-22-10-49-10-39 0-66 22-27 21-40 60-14 38-14 89t14 89 42 59 65 21";

const DOT = "M3585 12q-42 0-63-18t-21-56q0-39 21-57t63-18 64 18q21 18 21 57 0 74-85 74";

/** brand = svetlý podklad (písmená brand, bodka mint-ink),
 *  inverse = tmavý podklad (písmená biele, bodka mint). */
export type LogoTone = "brand" | "inverse";

const TONE: Record<LogoTone, { letters: string; dot: string }> = {
  brand: { letters: "text-brand", dot: "text-mint-ink" },
  inverse: { letters: "text-white", dot: "text-mint" },
};

export function Logo({
  tone = "brand",
  className,
  dotClassName,
  title = "Moonid",
  decorative = false,
}: {
  tone?: LogoTone;
  /** Výška (h-[…]) a prípadne iná farba písmen (text-…); predvolene h-5. */
  className?: string;
  /** Iná farba bodky (text-…), napr. priehľadnosť pri dekoratívnom použití. */
  dotClassName?: string;
  /** Prístupný názov loga. Odkaz s logom tak dostane meno „Moonid". */
  title?: string;
  /** Čisto dekoratívne logo (napr. obrí wordmark vo footeri, mockup) — skryje ho čítačkám. */
  decorative?: boolean;
}) {
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img" as const, "aria-label": title };
  return (
    <svg
      viewBox={VIEWBOX}
      // ak rodič logo predsa roztiahne (flex stretch), ostane zarovnané vľavo, nie na stred
      preserveAspectRatio="xMinYMid meet"
      fill="currentColor"
      className={cn("block h-5 w-auto shrink-0 transition-colors", TONE[tone].letters, className)}
      {...a11y}
    >
      <path d={LETTERS} />
      <path d={DOT} fill="currentColor" className={cn("transition-colors", TONE[tone].dot, dotClassName)} />
    </svg>
  );
}
