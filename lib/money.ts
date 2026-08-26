// Peňažná aritmetika v Decimal (decimal.js cez Prisma.Decimal — žiadna nová závislosť).
// Prečo: float počíta zle na hraniciach zaokrúhľovania — Math.round(1.50×1.23×100)/100
// dá 1,84 namiesto 1,85 (1.845 je vo floate 1.8449…). Obchodné zaokrúhľovanie je
// POLOVICA NAHOR (ROUND_HALF_UP) na 2 des. miesta a zaokrúhľuje sa len tu.
// Pozn.: hodnoty z DB stĺpcov Decimal(12,4) sa cez Number() round-tripujú bezstratovo
// (≤12 platných číslic) — stratová je len float ARITMETIKA, preto stačí počítať tu.
import { Prisma } from "@prisma/client";

const D = Prisma.Decimal;

/** number | string | Prisma.Decimal (čokoľvek s presnou dekadickou reprezentáciou) */
export type MoneyInput = number | string | Prisma.Decimal;

export function dec(v: MoneyInput): Prisma.Decimal {
  return v instanceof D ? v : new D(v);
}

/** Zaokrúhlenie na 2 des. miesta, polovica nahor (obchodné/daňové zaokrúhľovanie). */
export function round2(v: MoneyInput): number {
  return dec(v).toDecimalPlaces(2, D.ROUND_HALF_UP).toNumber();
}

/** Súčet peňažných hodnôt bez float driftu, zaokrúhlený na 2 des. */
export function sumMoney(values: MoneyInput[]): number {
  return round2(values.reduce<Prisma.Decimal>((acc, v) => acc.plus(dec(v)), new D(0)));
}

/** net × qty (riadok objednávky/košíka), zaokrúhlené na 2 des. */
export function lineTotal(unitNet: MoneyInput, qty: number): number {
  return round2(dec(unitNet).times(qty));
}

/**
 * DPH objednávkových riadkov: základ dane sa zoskupí podľa sadzby a DPH sa počíta z CELKOVÉHO
 * základu každej sadzby — nie z jednotkovej ceny vynásobenej množstvom.
 *
 * Prečo: DPH sa vyčísľuje zo základu dane (§ 74 ods. 1 písm. g/h zák. č. 222/2004 Z. z.,
 * rekapitulácia podľa sadzieb = EN 16931 BG-23). Pôvodná metóda `(gross − net) × qty`
 * zaokrúhľovala DPH na KUS, takže chyba rástla s množstvom a súčet v portáli sa rozchádzal
 * s faktúrou z Pohody:
 *   100 ks × 0,37 € pri 23 %  →  stará metóda 9,00 €, správne 8,51 €  (rozdiel 0,49 €)
 *   100 ks × 0,35 € pri 23 %  →  stará metóda 8,00 €, správne 8,05 €  (rozdiel 0,05 €)
 *
 * Poplatky (doprava, príplatok platby) majú vlastný základ a počíta ich vatOf() —
 * na faktúre sú samostatné riadky.
 */
export function vatFromLines(lines: { net: MoneyInput; vatRatePct: MoneyInput }[]): number {
  const byRate = new Map<string, { rate: Prisma.Decimal; base: Prisma.Decimal }>();
  for (const line of lines) {
    const rate = dec(line.vatRatePct);
    const key = rate.toFixed(2);
    const group = byRate.get(key) ?? { rate, base: new D(0) };
    group.base = group.base.plus(dec(line.net));
    byRate.set(key, group);
  }
  return sumMoney([...byRate.values()].map((g) => vatOf(round2(g.base), g.rate)));
}

/** DPH zo sumy: amount × sadzba/100, zaokrúhlené na 2 des. (poplatky dopravy/platby). */
export function vatOf(amount: MoneyInput, vatRatePct: MoneyInput): number {
  return round2(dec(amount).times(dec(vatRatePct)).dividedBy(100));
}
