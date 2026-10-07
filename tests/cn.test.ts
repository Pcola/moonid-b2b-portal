import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// Vlastné škály z @theme (app/globals.css) musí tailwind-merge poznať — inak cn() zahadzuje
// triedy z iného menného priestoru (napr. farbu textu pri `text-13`).
describe("cn() a vlastné tokeny dizajnového systému v2", () => {
  it("text-13 / text-15 sú veľkosť písma, nie farba", () => {
    expect(cn("bg-info text-info-ink", "text-13")).toBe("bg-info text-info-ink text-13");
    expect(cn("text-white", "text-15")).toBe("text-white text-15");
    expect(cn("text-sm", "text-13")).toBe("text-13");
    expect(cn("text-15", "text-base")).toBe("text-base");
  });

  it("rounded-control / card / panel sa navzájom aj s predvoľbami prebíjajú", () => {
    expect(cn("rounded-xl", "rounded-card")).toBe("rounded-card");
    expect(cn("rounded-control", "rounded-2xl")).toBe("rounded-2xl");
    expect(cn("rounded-panel", "rounded-control")).toBe("rounded-control");
  });

  it("ease-precise prebije predvolenú krivku", () => {
    expect(cn("ease-out", "ease-precise")).toBe("ease-precise");
  });

  it("farebné tokeny v2 (ivory, line-warm, focus) rozpozná bez konfigurácie", () => {
    expect(cn("bg-ivory", "bg-white")).toBe("bg-white");
    expect(cn("border-line-warm", "border-line")).toBe("border-line");
    expect(cn("outline-focus", "outline-brand")).toBe("outline-brand");
  });
});
