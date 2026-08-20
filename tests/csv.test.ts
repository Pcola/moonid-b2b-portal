import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("staff CSV export hardening", () => {
  it.each([
    "=HYPERLINK(\"https://attacker.invalid\")",
    "+cmd|' /C calc'!A0",
    "-2+3+cmd|' /C calc'!A0",
    "@SUM(1+1)",
    " \t=WEBSERVICE(\"https://attacker.invalid\")",
    "＝HYPERLINK(\"https://attacker.invalid\")",
  ])("neutralizes formula-like text: %s", (value) => {
    expect(csvCell(value).replace(/^"|"$/g, "")).toMatch(/^'/);
  });

  it("preserves ordinary values and RFC 4180 escaping", () => {
    expect(csvCell("Moonid s.r.o.")).toBe("Moonid s.r.o.");
    expect(csvCell('Firma; "SK"')).toBe('"Firma; ""SK"""');
  });

  it("emits BOM, semicolon columns and CRLF rows", () => {
    expect(toCsv(["Názov"], [["=1+1"]])).toBe("\uFEFFNázov\r\n'=1+1");
  });
});
