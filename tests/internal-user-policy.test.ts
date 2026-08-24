import { describe, expect, it } from "vitest";
import { internalTargetError, internalTransitionError, isInternalRole, normalizeInternalEmail } from "@/lib/internal-user-policy";

const base = {
  actorId: "admin-1",
  targetId: "staff-1",
  currentRole: "STAFF" as const,
  currentActive: true,
  nextRole: "STAFF" as const,
  nextActive: true,
  activeAdminCount: 2,
};

describe("politika interných účtov", () => {
  it("rozlišuje iba interné roly", () => {
    expect(isInternalRole("STAFF")).toBe(true);
    expect(isInternalRole("ADMIN")).toBe(true);
    expect(isInternalRole("CUSTOMER_ADMIN")).toBe(false);
    expect(isInternalRole("CUSTOMER_USER")).toBe(false);
  });

  it("normalizuje interný e-mail pred Auth aj DB operáciou", () => {
    expect(normalizeInternalEmail("  Admin.User+Moonid@GMAIL.COM ")).toBe("admin.user+moonid@gmail.com");
  });

  it("odmietne zákaznícke aj nekonzistentné konto priradené k firme", () => {
    expect(internalTargetError(null)).toBe("Interné konto neexistuje.");
    expect(internalTargetError({ role: "CUSTOMER_ADMIN", companyId: "company-1" })).toContain("nie je platným interným");
    expect(internalTargetError({ role: "ADMIN", companyId: "company-1" })).toContain("nie je platným interným");
    expect(internalTargetError({ role: "STAFF", companyId: null })).toBeNull();
  });

  it("blokuje vlastnú deaktiváciu", () => {
    expect(internalTransitionError({
      ...base,
      actorId: "admin-1",
      targetId: "admin-1",
      currentRole: "ADMIN",
      nextRole: "ADMIN",
      nextActive: false,
    })).toBe("Vlastné konto nemôžete deaktivovať.");
  });

  it("blokuje vlastnú demóciu", () => {
    expect(internalTransitionError({
      ...base,
      actorId: "admin-1",
      targetId: "admin-1",
      currentRole: "ADMIN",
      nextRole: "STAFF",
    })).toBe("Vlastnému kontu nemôžete odobrať rolu administrátora.");
  });

  it("nedovolí deaktivovať ani degradovať posledného aktívneho admina", () => {
    expect(internalTransitionError({
      ...base,
      currentRole: "ADMIN",
      nextRole: "ADMIN",
      nextActive: false,
      activeAdminCount: 1,
    })).toBe("Musí zostať aspoň jeden aktívny administrátor.");

    expect(internalTransitionError({
      ...base,
      currentRole: "ADMIN",
      nextRole: "STAFF",
      activeAdminCount: 1,
    })).toBe("Musí zostať aspoň jeden aktívny administrátor.");
  });

  it("povolí bezpečné zmeny, keď ostáva ďalší aktívny admin", () => {
    expect(internalTransitionError({
      ...base,
      currentRole: "ADMIN",
      nextRole: "STAFF",
      activeAdminCount: 2,
    })).toBeNull();
    expect(internalTransitionError({ ...base, nextRole: "ADMIN" })).toBeNull();
    expect(internalTransitionError({ ...base, nextActive: false })).toBeNull();
  });

  it("odmietne zákaznícke konto aj pri podvrhnutom volaní server action", () => {
    expect(internalTransitionError({
      ...base,
      currentRole: "CUSTOMER_ADMIN",
      nextRole: "STAFF",
    })).toBe("Týmto formulárom možno spravovať iba interné kontá.");
  });
});
