import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  compromise: vi.fn(),
  rateLimit: vi.fn(),
  writeAudit: vi.fn(),
  reportError: vi.fn(),
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

import { setPasswordFromGrant } from "@/app/(auth)/nastav-heslo/actions";

describe("setPasswordFromGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ ok: true, count: 1 });
    mocks.compromise.mockResolvedValue("clean");
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.writeAudit.mockResolvedValue(undefined);
  });

  it("rejects an ordinary authenticated session before changing the password", async () => {
    const now = Math.floor(Date.now() / 1000);
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-user", amr: [{ method: "password", timestamp: now }] } },
      error: null,
    });

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result.ok).toBe(false);
    expect(mocks.compromise).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it.each(["invite", "recovery"])("accepts a recent %s grant and globally signs out", async (method) => {
    const now = Math.floor(Date.now() / 1000);
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-user", amr: [{ method, timestamp: now }] } },
      error: null,
    });

    const result = await setPasswordFromGrant("a-strong-and-unique-password");

    expect(result).toEqual({ ok: true });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "a-strong-and-unique-password" });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PASSWORD_RESET_COMPLETED", entityId: "auth-user" }));
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
  });
});
