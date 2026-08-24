import { describe, expect, it } from "vitest";
import { canAccessStaffPortal, canManageCommerceSettings, canManageInternalUsers, canManagePriceTiers, canViewAuditLog } from "@/lib/permissions";

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
