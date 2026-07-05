// Klientská (náhľadová) peňažná matematika — celé centy, bez závislostí (Decimal
// z lib/money by ťahal Prisma runtime do klientského bundle). Server je autorita
// (lib/money.ts); tieto helpery dávajú ZHODNÝ výsledok ako server, aby náhľad
// v UI nikdy nesedel o cent inak než uložená suma. Kanonická jednotková cena je
// 2-des. — vstupy s viac des. sa kvantizujú na centy POLOVICOU NAHOR, rovnako
// ako serverové round2 (updateOrder zaokrúhľuje snapshot pred výpočtom).

/** Cena → presné centy, polovica nahor (2.62 → 262; 1.005 → 101 ako Decimal round2).
 *  toPrecision(15) obnoví dekadickú hodnotu doubles (1.005*100 = 100.4999… → 100.5). */
function cents(n: number): number {
  return Math.round(Number((n * 100).toPrecision(15)));
}

/** net × qty (net sa kvantizuje na centy) — presne, bez float driftu. */
export function lineTotal2(unitNet: number, qty: number): number {
  return (cents(unitNet) * qty) / 100;
}

/** Súčet 2-des. súm — presne (v centoch). */
export function sumMoney2(values: number[]): number {
  return values.reduce((s, v) => s + cents(v), 0) / 100;
}

/** Brutto jednotky: net (kvantizovaný na centy) × (1 + sadzba/100), polovica nahor —
 *  zhodné s lib/money round2. vatRate s max 2 des. Celočíselne: centy×(10000+vr·100), half-up /10000. */
export function grossUnit2(unitNet: number, vatRate: number): number {
  const vr100 = Math.round(vatRate * 100);
  return Math.floor((cents(unitNet) * (10000 + vr100) + 5000) / 10000) / 100;
}

/** DPH zo sumy: amount × sadzba/100, polovica nahor (poplatky v náhľade).
 *  vatCents = amountCents × (vr100/100) / 100 → half-up cez +5000/10000. */
export function vatOf2(amount: number, vatRate: number): number {
  const vr100 = Math.round(vatRate * 100);
  return Math.floor((cents(amount) * vr100 + 5000) / 10000) / 100;
}

/** Netto po zľave: base × (1 − pct/100), polovica nahor — zhodné so serverovým
 *  resolveUnitPrice (najprv násobenie, až potom round2). base do 4 des. (feed ceny),
 *  pct do 2 des. Celočíselne v 10⁻⁴ €: u×(10000−pct·100), half-up na centy /10⁶. */
export function discountedNet2(base: number, discountPct: number): number {
  const u = Math.round(Number((base * 10000).toPrecision(15))); // presné 10⁻⁴ € jednotky
  const pct100 = Math.round(discountPct * 100);
  return Math.floor((u * (10000 - pct100) + 500000) / 1000000) / 100;
}
