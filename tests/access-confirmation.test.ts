import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mocks.verifyOtp } }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { confirmAccessLink } from "@/app/(auth)/potvrdit-pristup/actions";

describe("vedomé potvrdenie jednorazového prístupového odkazu", () => {
  beforeEach(() => vi.clearAllMocks());

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
    mocks.verifyOtp.mockResolvedValueOnce({ error: null });
    const tokenHash = "valid-looking-token-hash-123456";

    await confirmAccessLink({ tokenHash, type: "invite" });

    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: tokenHash, type: "invite" });
    expect(mocks.redirect).toHaveBeenCalledWith("/nastav-heslo");
  });
});
