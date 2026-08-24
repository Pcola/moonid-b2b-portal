import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  createRecovery: vi.fn(),
  sendEmail: vi.fn(),
  writeAudit: vi.fn(),
  reportError: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/internal-auth-admin", () => ({ createInternalRecoveryLink: mocks.createRecovery }));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  rateLimitKey: (scope: string, value: string) => `${scope}:${value}`,
  clientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/site-url", () => ({ SITE_URL: "https://staging.moonid.test" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { requestPasswordReset } from "@/app/(auth)/actions";

describe("scanner-safe obnova hesla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ ok: true, count: 1 });
  });

  it("neexistujúci účet neprezradí a nevydá recovery token", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);

    await expect(requestPasswordReset("nobody@test.invalid")).resolves.toBeUndefined();
    expect(mocks.createRecovery).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("pošle iba fragmentový recovery odkaz cez centrálne doručenie", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: "user-1",
      authId: "auth-1",
      email: "user@test.invalid",
      active: true,
      companyId: "company-1",
      company: { active: true },
    });
    mocks.createRecovery.mockResolvedValueOnce({
      authId: "auth-1",
      url: "https://staging.moonid.test/potvrdit-pristup#token_hash=secret&type=recovery",
      createdAuthUser: false,
    });
    mocks.sendEmail.mockResolvedValueOnce({ ok: true });

    await requestPasswordReset("USER@test.invalid");

    expect(mocks.createRecovery).toHaveBeenCalledWith("user@test.invalid");
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@test.invalid",
      text: expect.stringContaining("/potvrdit-pristup#token_hash="),
    }));
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "PASSWORD_RESET_REQUESTED" }));
  });

  it("pri odlišnom provider authId link fail-closed neodošle", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: "user-1",
      authId: "auth-original",
      email: "user@test.invalid",
      active: true,
      companyId: null,
      company: null,
    });
    mocks.createRecovery.mockResolvedValueOnce({
      authId: "auth-other",
      url: "https://staging.moonid.test/potvrdit-pristup#token_hash=secret&type=recovery",
      createdAuthUser: false,
    });

    await requestPasswordReset("user@test.invalid");

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith(
      "auth.passwordReset.identityMismatch",
      expect.any(Error),
      { action: "reset_withheld" },
    );
  });
});
