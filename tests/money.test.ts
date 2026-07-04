import { describe, it, expect } from "vitest";
import { dec, round2, sumMoney, lineTotal, lineVat, vatOf } from "@/lib/money";
import { lineTotal2, sumMoney2, grossUnit2, vatOf2 } from "@/lib/money-client";
import { Prisma } from "@prisma/client";

describe("round2 — obchodné zaokrúhľovanie (polovica nahor)", () => {
  it(".005 sa zaokrúhli NAHOR (float by dal zle)", () => {
    expect(round2(1.005)).toBe(1.01); // Math.round(1.005*100)/100 === 1.00 (float bug)
    expect(round2(2.675)).toBe(2.68); // Math.round(2.675*100)/100 === 2.67 (float bug)
    expect(round2("1.005")).toBe(1.01);
  });

  it("bežné hodnoty bez zmeny správania", () => {
    expect(round2(3.996)).toBe(4);
    expect(round2(3.2226)).toBe(3.22);
    expect(round2(0)).toBe(0);
    expect(round2(9.994)).toBe(9.99);
  });

  it("prijme Prisma.Decimal (DB hodnoty bez konverzie)", () => {
    expect(round2(new Prisma.Decimal("12.3456"))).toBe(12.35);
  });
});

describe("lineTotal / lineVat — riadok objednávky", () => {
  it("net × qty presne (žiadny float drift)", () => {
    expect(lineTotal(0.1, 3)).toBe(0.3); // 0.1*3 = 0.30000000000000004 vo floate
    expect(lineTotal(2.62, 7)).toBe(18.34);
  });

  it("DPH riadku = (gross − net) × qty", () => {
    // net 1.50, DPH 23 % → gross 1.845 → pol-hore 1.85 (float dal 1.84!)
    const gross = round2(dec(1.5).times(1.23));
    expect(gross).toBe(1.85);
    expect(lineVat(1.5, gross, 10)).toBe(3.5); // (1.85−1.50)×10
  });
});

describe("sumMoney — súčty bez driftu", () => {
  it("tisíc riadkov po 0.10 € = presne 100", () => {
    expect(sumMoney(Array.from({ length: 1000 }, () => 0.1))).toBe(100);
  });

  it("mix čísel, stringov a Decimalov", () => {
    expect(sumMoney([1.11, "2.22", new Prisma.Decimal("3.33")])).toBe(6.66);
  });

  it("prázdny zoznam = 0", () => {
    expect(sumMoney([])).toBe(0);
  });
});

describe("money-client — parita klientského náhľadu so serverovým Decimalom", () => {
  it("grossUnit2 == round2(net×(1+vr/100)) pre všetky ceny 0.01–20.00 × sadzby 10/20/23", () => {
    for (const vr of [10, 20, 23]) {
      for (let c = 1; c <= 2000; c++) {
        const net = c / 100;
        const server = round2(dec(net).times(dec(100).plus(vr).dividedBy(100)));
        expect(grossUnit2(net, vr), `net=${net} vr=${vr}`).toBe(server);
      }
    }
  });

  it("vatOf2 == vatOf pre sumy 0.01–30.00 pri 23 %", () => {
    for (let c = 1; c <= 3000; c++) {
      const amount = c / 100;
      expect(vatOf2(amount, 23), `amount=${amount}`).toBe(vatOf(amount, 23));
    }
  });

  it("lineTotal2/sumMoney2 == lineTotal/sumMoney", () => {
    expect(lineTotal2(0.1, 3)).toBe(lineTotal(0.1, 3));
    expect(lineTotal2(2.62, 7)).toBe(lineTotal(2.62, 7));
    const vals = [1.11, 2.22, 3.33, 0.05, 19.99];
    expect(sumMoney2(vals)).toBe(sumMoney(vals));
  });

  it("cents kvantizácia == Decimal round2 aj na .005 hraniciach", () => {
    // klient dostáva Number(Decimal); toPrecision(15) v cents() obnoví dekadickú hodnotu
    expect(lineTotal2(1.005, 1)).toBe(round2(new Prisma.Decimal("1.005"))); // 1.01
    expect(lineTotal2(2.675, 1)).toBe(round2(new Prisma.Decimal("2.675"))); // 2.68
    expect(lineTotal2(1.0049, 1)).toBe(round2(new Prisma.Decimal("1.0049"))); // 1.00
  });

  it("4-des. snapshoty: náhľad editora == server updateOrder (kanonické 2-des. net)", () => {
    // server (updateOrder): net = round2(snapshot); gross = round2(net×(1+vr/100));
    // klient (order-editor): dostane round2(snapshot) z page.tsx, počíta v centoch.
    const cases: [string, number, number][] = [
      ["2.622", 23, 7], ["2.625", 23, 10], ["1.5045", 23, 3], ["1.0240", 10, 1],
      ["0.9990", 23, 7], ["1.0050", 23, 4], ["2.9949", 0, 9], ["3.3333", 20, 9999],
    ];
    for (const [snap, vr, q] of cases) {
      const netS = round2(new Prisma.Decimal(snap));
      const grossS = round2(dec(netS).times(dec(100).plus(vr).dividedBy(100)));
      const lineS = lineTotal(netS, q);
      const vatS = lineVat(netS, grossS, q);
      const netClient = round2(new Prisma.Decimal(snap)); // page.tsx posiela round2(snapshot)
      expect(lineTotal2(netClient, q), `line ${snap}×${q}`).toBe(lineS);
      expect(grossUnit2(netClient, vr), `gross ${snap}@${vr}%`).toBe(grossS);
      expect(lineTotal2(grossUnit2(netClient, vr) - netClient, q), `vat ${snap}@${vr}%×${q}`).toBe(vatS);
    }
  });
});

describe("vatOf — DPH z poplatkov", () => {
  it("23 % z 5.90 = 1.36 (5.9×0.23 = 1.357 → pol-hore)", () => {
    expect(vatOf(5.9, 23)).toBe(1.36);
  });
  it(".005 hranica: 23 % z 6.50 = 1.495 → 1.50 (float dal 1.49)", () => {
    expect(vatOf(6.5, 23)).toBe(1.5);
  });
  it("nula → nula", () => {
    expect(vatOf(0, 23)).toBe(0);
  });
});
