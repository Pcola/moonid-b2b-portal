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

/** DPH riadku: (gross − net) × qty, zaokrúhlené na 2 des. (rovnaká metóda ako doteraz). */
export function lineVat(unitNet: MoneyInput, unitGross: MoneyInput, qty: number): number {
  return round2(dec(unitGross).minus(dec(unitNet)).times(qty));
}

/** DPH zo sumy: amount × sadzba/100, zaokrúhlené na 2 des. (poplatky dopravy/platby). */
export function vatOf(amount: MoneyInput, vatRatePct: MoneyInput): number {
  return round2(dec(amount).times(dec(vatRatePct)).dividedBy(100));
}
