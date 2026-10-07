import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAccessStaffPortal, canManageCommerceSettings, canManageInternalUsers, canManagePriceTiers, canViewAuditLog } from "@/lib/permissions";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("interné RBAC oprávnenia", () => {
  it("ADMIN zdedí celý staff portál, zákaznícke roly nie", () => {
    expect(canAccessStaffPortal("ADMIN")).toBe(true);
    expect(canAccessStaffPortal("STAFF")).toBe(true);
    expect(canAccessStaffPortal("CUSTOMER_ADMIN")).toBe(false);
    expect(canAccessStaffPortal("CUSTOMER_USER")).toBe(false);
  });

  it("cenové úrovne môže meniť iba ADMIN", () => {
    expect(canManagePriceTiers("ADMIN")).toBe(true);
    expect(canManagePriceTiers("STAFF")).toBe(false);
    expect(canManagePriceTiers("CUSTOMER_ADMIN")).toBe(false);
    expect(canManagePriceTiers("CUSTOMER_USER")).toBe(false);
  });

  it("globálne obchodné nastavenia môže meniť iba ADMIN", () => {
    expect(canManageCommerceSettings("ADMIN")).toBe(true);
    expect(canManageCommerceSettings("STAFF")).toBe(false);
    expect(canManageCommerceSettings("CUSTOMER_ADMIN")).toBe(false);
    expect(canManageCommerceSettings("CUSTOMER_USER")).toBe(false);
  });

  it("audit log môže čítať iba ADMIN", () => {
    expect(canViewAuditLog("ADMIN")).toBe(true);
    expect(canViewAuditLog("STAFF")).toBe(false);
    expect(canViewAuditLog("CUSTOMER_ADMIN")).toBe(false);
    expect(canViewAuditLog("CUSTOMER_USER")).toBe(false);
  });

  it("interné kontá môže spravovať iba ADMIN", () => {
    expect(canManageInternalUsers("ADMIN")).toBe(true);
    expect(canManageInternalUsers("STAFF")).toBe(false);
    expect(canManageInternalUsers("CUSTOMER_ADMIN")).toBe(false);
    expect(canManageInternalUsers("CUSTOMER_USER")).toBe(false);
  });
});

/**
 * Tripwire, nie dôkaz správnosti: kontroluje, že cenotvorné cesty stále siahajú na ADMIN
 * hranicu. Predtým boli všetky pod requireStaff, takže ADMIN-only cenotvorba
 * (/staff/cenniky → requireAdmin) sa dala obísť cez produkt, cez zmenu úrovne zákazníka
 * alebo cez založenie firmy rovno na zľavovej úrovni.
 */
describe("cenotvorba je ADMIN-only na všetkých cestách", () => {
  it("per-produkt zmluvné ceny vyžadujú requireAdmin", () => {
    const src = read("app/staff/produkty/actions.ts");
    expect(src).toMatch(/export async function setProductPrices[\s\S]*?await requireAdmin\(\)/);
  });

  it("basePrice a vatRate na produkte sú za canManagePriceTiers", () => {
    const src = read("app/staff/produkty/actions.ts");
    expect(src).toContain("canManagePriceTiers(staff.role)");
    expect(src).toMatch(/if \(!mayPrice && \(baseChanged \|\| vatChanged\)\)/);
  });

  it("zmena cenovej úrovne zákazníka je za canManagePriceTiers", () => {
    const src = read("app/staff/zakaznici/[id]/actions.ts");
    expect(src).toMatch(/tier\.id !== company\.priceTierId && !canManagePriceTiers\(staff\.role\)/);
  });

  it("zakladanie firmy neumožní STAFFu priradiť zľavovú úroveň", () => {
    const src = read("app/staff/zakaznici/actions.ts");
    expect(src).toContain("canManagePriceTiers(staff.role)");
    expect(src).toContain("baseline");
  });

  it("navigácia staffu berie rozhodnutie z lib/permissions, nie z natvrdo napísanej roly", () => {
    const src = read("components/staff/staff-shell.tsx");
    expect(src).toContain("gate: canManageInternalUsers");
    expect(src).toContain("gate: canViewAuditLog");
    expect(src).not.toContain('role !== "ADMIN") return null');
  });
});
