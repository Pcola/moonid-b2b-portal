import { describe, expect, it } from "vitest";
import { canManagePriceTiers } from "@/lib/permissions";

describe("interné RBAC oprávnenia", () => {
  it("cenové úrovne môže meniť iba ADMIN", () => {
    expect(canManagePriceTiers("ADMIN")).toBe(true);
    expect(canManagePriceTiers("STAFF")).toBe(false);
    expect(canManagePriceTiers("CUSTOMER_ADMIN")).toBe(false);
    expect(canManagePriceTiers("CUSTOMER_USER")).toBe(false);
  });
});
