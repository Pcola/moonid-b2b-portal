import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  getClaims: vi.fn(),
  signOut: vi.fn(),
  activateNative: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mocks.verifyOtp, getClaims: mocks.getClaims, signOut: mocks.signOut } }),
}));
vi.mock("@/lib/password-setup-grants", () => ({ activateNativePasswordSetupGrant: mocks.activateNative }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { confirmAccessLink } from "@/app/(auth)/potvrdit-pristup/actions";

describe("vedomé potvrdenie jednorazového prístupového odkazu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.activateNative.mockResolvedValue(true);
  });

  it("odmietne neúplný vstup bez kontaktovania Supabase", async () => {
    await expect(confirmAccessLink({ tokenHash: "short", type: "invite" })).resolves.toEqual({
      ok: false,
      error: "Prístupový odkaz je neplatný alebo neúplný.",
    });
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("neplatný alebo spotrebovaný token nezaloží reláciu", async () => {
    mocks.verifyOtp.mockResolvedValueOnce({ error: new Error("expired") });
    const tokenHash = "valid-looking-token-hash-123456";

    await expect(confirmAccessLink({ tokenHash, type: "recovery" })).resolves.toEqual({
      ok: false,
      error: "Prístupový odkaz je neplatný alebo vypršal. Požiadajte správcu o nový.",
    });
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: tokenHash, type: "recovery" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("token vymení až po explicitnom POST a pokračuje na nastavenie hesla", async () => {
    mocks.verifyOtp.mockResolvedValueOnce({ data: { session: { access_token: "verified-access-token" } }, error: null });
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: "a633b737-baed-484a-b118-75db4238ce90", session_id: "6633b737-baed-484a-b118-75db4238ce91" } },
      error: null,
    });
    const tokenHash = "valid-looking-token-hash-123456";

    await confirmAccessLink({ tokenHash, type: "invite" });

    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: tokenHash, type: "invite" });
    expect(mocks.getClaims).toHaveBeenCalledWith("verified-access-token");
    expect(mocks.activateNative).toHaveBeenCalledWith({
      authId: "a633b737-baed-484a-b118-75db4238ce90",
      sessionId: "6633b737-baed-484a-b118-75db4238ce91",
      purpose: "INVITE",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/nastav-heslo");
  });

  it("pri zlyhaní DB aktivácie lokálne odstráni novú recovery reláciu", async () => {
    mocks.verifyOtp.mockResolvedValueOnce({ data: { session: { access_token: "verified-access-token" } }, error: null });
    mocks.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: "a633b737-baed-484a-b118-75db4238ce90", session_id: "6633b737-baed-484a-b118-75db4238ce91" } },
      error: null,
    });
    mocks.activateNative.mockResolvedValueOnce(false);

    await expect(confirmAccessLink({
      tokenHash: "valid-looking-token-hash-123456",
      type: "recovery",
    })).resolves.toEqual({
      ok: false,
      error: "Prístup sa nepodarilo bezpečne potvrdiť. Požiadajte správcu o nový odkaz.",
    });

    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
