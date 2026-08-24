import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  createClient: vi.fn(),
  findUnique: vi.fn(),
  getUser: vi.fn(),
  getAal: vi.fn(),
  listFactors: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));

describe("privileged MFA guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-admin" } }, error: null });
    mocks.findUnique.mockResolvedValue({
      id: "admin-1",
      authId: "auth-admin",
      email: "admin@test.invalid",
      role: "ADMIN",
      active: true,
      companyId: null,
      company: null,
    });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: mocks.getUser,
        mfa: {
          getAuthenticatorAssuranceLevel: mocks.getAal,
          listFactors: mocks.listFactors,
        },
      },
    });
  });

  it("fails closed when the AAL lookup returns an error", async () => {
    mocks.getAal.mockResolvedValue({ data: null, error: new Error("AAL unavailable") });

    const { requireAdmin } = await import("@/lib/auth");
    await requireAdmin();

    expect(mocks.redirect).toHaveBeenCalledWith("/mfa");
    expect(mocks.listFactors).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith("mfa.status", expect.any(Error), {});
  });

  it("fails closed when factor enumeration errors even for an AAL2 response", async () => {
    mocks.getAal.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2", currentAuthenticationMethods: [] },
      error: null,
    });
    mocks.listFactors.mockResolvedValue({ data: null, error: new Error("Factors unavailable") });

    const { requireAdmin } = await import("@/lib/auth");
    await requireAdmin();

    expect(mocks.redirect).toHaveBeenCalledWith("/mfa");
    expect(mocks.reportError).toHaveBeenCalledWith("mfa.status", expect.any(Error), {});
  });
});
