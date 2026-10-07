import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  compromise: vi.fn(),
  rateLimit: vi.fn(),
  writeAudit: vi.fn(),
  reportError: vi.fn(),
  findVerified: vi.fn(),
  claimGrant: vi.fn(),
  finishGrant: vi.fn(),
  activateImplicit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: mocks.getClaims, updateUser: mocks.updateUser, signOut: mocks.signOut },
  }),
}));
vi.mock("@/lib/password-security", () => ({ passwordCompromiseStatus: mocks.compromise }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, id: string) => `${scope}:${id}`,
}));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/password-setup-grants", () => ({
  findVerifiedPasswordSetupGrant: mocks.findVerified,
  claimPasswordSetupGrant: mocks.claimGrant,
  finishPasswordSetupGrant: mocks.finishGrant,
  activateImplicitPasswordSetupGrant: mocks.activateImplicit,
}));

import { setPasswordFromGrant } from "@/app/(auth)/nastav-heslo/actions";

describe("setPasswordFromGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ ok: true, count: 1 });
    mocks.compromise.mockResolvedValue("clean");
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.writeAudit.mockResolvedValue(undefined);
    mocks.findVerified.mockResolvedValue({
      id: "grant-1",
      userId: "app-user-1",
      companyId: "company-1",
      authId: "auth-user",
    });
    mocks.claimGrant.mockResolvedValue({
      id: "grant-1",
      userId: "app-user-1",
      companyId: "company-1",
      authId: "auth-user",
      attemptId: "attempt-1",
    });
    mocks.finishGrant.mockResolvedValue(true);
    mocks.activateImplicit.mockResolvedValue(true);
  });

  it("rejects an ordinary authenticated session before changing the password", async () => {
    const now = Math.floor(Date.now() / 1000);
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-user", amr: [{ method: "password", timestamp: now }] } },
      error: null,
    });
    mocks.findVerified.mockResolvedValueOnce(null);

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result.ok).toBe(false);
    expect(mocks.compromise).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("atomically claims a verified DB grant, changes the password and globally signs out", async () => {
    const now = Math.floor(Date.now() / 1000);
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-user", amr: [{ method: "recovery", timestamp: now }] } },
      error: null,
    });

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result).toEqual({ ok: true });
    expect(mocks.claimGrant).toHaveBeenCalledOnce();
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "a-strong-and-unique-password" });
    expect(mocks.finishGrant).toHaveBeenCalledWith(expect.objectContaining({ attemptId: "attempt-1" }), true);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: "app-user-1",
      companyId: "company-1",
      action: "PASSWORD_RESET_COMPLETED",
      entityId: "auth-user",
    }));
  });

  it("druhý súbežný pokus bez víťazného claimu nesmie volať updateUser", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "auth-user" } }, error: null });
    mocks.claimGrant.mockResolvedValueOnce(null);

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result.ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.finishGrant).not.toHaveBeenCalled();
  });

  it("pri chybe providera grant spáli a neotvorí ho na opakovanie", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "auth-user" } }, error: null });
    mocks.updateUser.mockResolvedValueOnce({ error: new Error("provider timeout") });

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result.ok).toBe(false);
    expect(mocks.finishGrant).toHaveBeenCalledWith(expect.objectContaining({ attemptId: "attempt-1" }), false);
  });

  it.each(["pwned", "unavailable"])("does not change the password when compromise status is %s", async (status) => {
    const now = Math.floor(Date.now() / 1000);
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-user", amr: [{ method: "recovery", timestamp: now }] } },
      error: null,
    });
    mocks.compromise.mockResolvedValue(status);

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result.ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.claimGrant).not.toHaveBeenCalled();
  });
});
