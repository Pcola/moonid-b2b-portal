import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  userFindFirst: vi.fn(),
  companyFindUnique: vi.fn(),
  inviteUser: vi.fn(),
  compromise: vi.fn(),
  rateLimit: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  writeAudit: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mocks.userFindFirst },
    company: { findUnique: mocks.companyFindUnique },
  },
}));
vi.mock("@/lib/invite", () => ({ inviteUser: mocks.inviteUser }));
vi.mock("@/lib/password-security", () => ({ passwordCompromiseStatus: mocks.compromise }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, id: string) => `${scope}:${id}`,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    },
  }),
}));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(), STAFF_NOTIFY: "staff@test.invalid" }));
vi.mock("@/lib/internal-user-policy", () => ({ normalizeInternalEmail: (email: string) => email.trim().toLowerCase() }));
vi.mock("@/lib/user-lifecycle-errors", () => ({ isLastCustomerAdminConstraint: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { changeOwnPassword, inviteMember } from "@/app/(portal)/nastavenia/actions";

const currentUser = {
  id: "db-user",
  authId: "auth-user",
  email: "owner@example.test",
  role: "CUSTOMER_ADMIN",
  companyId: "company-a",
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(currentUser);
  mocks.rateLimit.mockResolvedValue({ ok: true, count: 1 });
  mocks.compromise.mockResolvedValue("clean");
  mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "auth-user" } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.writeAudit.mockResolvedValue(undefined);
  mocks.companyFindUnique.mockResolvedValue({ name: "Company A" });
});

describe("changeOwnPassword", () => {
  it("requires the current password before updating", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });

    const result = await changeOwnPassword({ currentPassword: "wrong", newPassword: "new-unique-password-123" });

    expect(result).toEqual({ ok: false, error: "Súčasné heslo je nesprávne." });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("passes the current password to Supabase, audits, and revokes all sessions", async () => {
    const result = await changeOwnPassword({ currentPassword: "old-password", newPassword: "new-unique-password-123" });

    expect(result).toEqual({ ok: true });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      current_password: "old-password",
      password: "new-unique-password-123",
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PASSWORD_CHANGED", entityId: "db-user" }));
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
});

describe("inviteMember enumeration resistance", () => {
  it("scopes the preliminary lookup to the actor's company and maps foreign conflicts to a generic error", async () => {
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.inviteUser.mockResolvedValue({ ok: false, error: "Tento e-mail už patrí inej firme." });

    const result = await inviteMember({ email: "target@example.test" });

    expect(mocks.userFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: "company-a" }),
    }));
    expect(result).toEqual({
      ok: false,
      error: "Pozvánku sa nepodarilo spracovať. Skontrolujte zoznam členov firmy alebo skúste neskôr.",
    });
  });

  it("still gives a useful message for a member already visible inside the same company", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "existing-member" });

    const result = await inviteMember({ email: "member@example.test" });

    expect(result.error).toContain("členom vašej firmy");
    expect(mocks.inviteUser).not.toHaveBeenCalled();
  });
});
