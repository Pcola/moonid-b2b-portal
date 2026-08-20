import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TERMS_SECTIONS, TERMS_SHA256, TERMS_TEXT, TERMS_VERSION } from "@/lib/terms";

describe("kanonický snapshot obchodných podmienok", () => {
  it("hash zodpovedá presnému UTF-8 textu", () => {
    expect(createHash("sha256").update(TERMS_TEXT, "utf8").digest("hex")).toBe(TERMS_SHA256);
    expect(TERMS_SHA256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("serializovaný snapshot obsahuje rovnakú verziu a všetky verejne renderované sekcie", () => {
    expect(TERMS_TEXT).toContain(`Verzia ${TERMS_VERSION}`);
    for (const [index, section] of TERMS_SECTIONS.entries()) {
      expect(TERMS_TEXT).toContain(`${index + 1}. ${section.title}`);
      for (const paragraph of section.paragraphs) expect(TERMS_TEXT).toContain(paragraph);
    }
  });
});
