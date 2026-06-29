import { describe, it, expect } from "vitest";
import { nextStatus, canCancel, isFinal, stepIndex, type OrderStatus } from "@/lib/orders/transition";

describe("stavový automat objednávky", () => {
  it("nextStatus posúva dopredným tokom", () => {
    expect(nextStatus("PRIJATA")).toBe("POTVRDENA");
    expect(nextStatus("POTVRDENA")).toBe("PRIPRAVUJE");
    expect(nextStatus("PRIPRAVUJE")).toBe("NA_CESTE");
    expect(nextStatus("NA_CESTE")).toBe("DORUCENA");
  });

  it("nextStatus z finálnych stavov je null", () => {
    expect(nextStatus("DORUCENA")).toBeNull();
    expect(nextStatus("STORNO")).toBeNull();
  });

  it("canCancel len kým nie je na ceste/doručená/stornovaná", () => {
    expect(canCancel("PRIJATA")).toBe(true);
    expect(canCancel("POTVRDENA")).toBe(true);
    expect(canCancel("PRIPRAVUJE")).toBe(true);
    expect(canCancel("NA_CESTE")).toBe(false);
    expect(canCancel("DORUCENA")).toBe(false);
    expect(canCancel("STORNO")).toBe(false);
  });

  it("isFinal pre DORUCENA a STORNO", () => {
    expect(isFinal("DORUCENA")).toBe(true);
    expect(isFinal("STORNO")).toBe(true);
    expect(isFinal("PRIJATA")).toBe(false);
    expect(isFinal("NA_CESTE")).toBe(false);
  });

  it("stepIndex: poradie v stepperi, STORNO mimo toku (-1)", () => {
    expect(stepIndex("PRIJATA")).toBe(0);
    expect(stepIndex("DORUCENA")).toBe(4);
    expect(stepIndex("STORNO")).toBe(-1);
  });

  it("celý dopredný tok dosiahne finálny stav za 4 kroky", () => {
    let s: OrderStatus = "PRIJATA";
    let steps = 0;
    while (true) {
      const n = nextStatus(s);
      if (!n) break;
      s = n; steps++;
    }
    expect(s).toBe("DORUCENA");
    expect(steps).toBe(4);
  });
});
