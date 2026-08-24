import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  listFactors: vi.fn(),
  deleteFactor: vi.fn(),
}));

vi.mock("@/lib/site-url", () => ({ SITE_URL: "https://staging.moonid.test" }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        generateLink: mocks.generateLink,
        getUserById: mocks.getUserById,
        updateUserById: mocks.updateUserById,
        mfa: {
          listFactors: mocks.listFactors,
          deleteFactor: mocks.deleteFactor,
        },
      },
    },
  }),
}));

import {
  createInternalInviteLink,
  ExternalAuthBanError,
  resetInternalAuthMfa,
  setInternalAuthBlocked,
} from "@/lib/internal-auth-admin";

describe("Supabase administrácia interných identít", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it("vytvorí cross-browser invite callback bez hesla alebo listUsers lookupu", async () => {
    mocks.generateLink.mockResolvedValueOnce({
      data: { user: { id: "auth-1" }, properties: { hashed_token: "token/hash" } },
      error: null,
    });

    const result = await createInternalInviteLink("staff@moonid.test");

    expect(result).toEqual({
      authId: "auth-1",
      url: "https://staging.moonid.test/potvrdit-pristup#token_hash=token%2Fhash&type=invite",
      createdAuthUser: true,
    });
    expect(mocks.generateLink).toHaveBeenCalledTimes(1);
    expect(mocks.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "invite", email: "staff@moonid.test" }));
  });

  it("pri existujúcej Auth identite použije recovery response namiesto stránkovaného listUsers", async () => {
    mocks.generateLink
      .mockResolvedValueOnce({ data: null, error: new Error("already exists") })
      .mockResolvedValueOnce({
        data: { user: { id: "auth-existing" }, properties: { hashed_token: "recovery-token" } },
        error: null,
      });

    const result = await createInternalInviteLink("existing@moonid.test");

    expect(result.createdAuthUser).toBe(false);
    expect(result.authId).toBe("auth-existing");
    expect(result.url).toContain("type=recovery");
    expect(mocks.generateLink.mock.calls.map(([value]) => value.type)).toEqual(["invite", "recovery"]);
  });

  it("provider chybu neprizná ako úspešnú pozvánku", async () => {
    mocks.generateLink
      .mockResolvedValueOnce({ data: null, error: new Error("invite failed") })
      .mockResolvedValueOnce({ data: null, error: new Error("recovery failed") });

    await expect(createInternalInviteLink("broken@moonid.test")).rejects.toThrow("could not be generated");
  });

  it("vlastný Auth ban označí časovo viazaným ownership markerom", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
    mocks.getUserById.mockResolvedValueOnce({
      data: { user: { id: "auth-1", banned_until: null, app_metadata: { retained: "yes" } } },
      error: null,
    });
    mocks.updateUserById.mockResolvedValueOnce({ data: { user: { id: "auth-1" } }, error: null });

    const result = await setInternalAuthBlocked("auth-1", true);
    const expectedUntil = new Date(Date.now() + 876_000 * 60 * 60 * 1000).toISOString();

    expect(result).toEqual({ managedBan: true, externalBan: false });
    expect(mocks.updateUserById).toHaveBeenCalledWith("auth-1", {
      ban_duration: "876000h",
      app_metadata: {
        retained: "yes",
        moonid_lifecycle_ban: { version: 1, expectedUntil },
      },
    });
  });

  it("nezruší nezávislý Supabase security ban", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
    mocks.getUserById.mockResolvedValueOnce({
      data: {
        user: {
          id: "auth-1",
          banned_until: "2026-08-24T13:00:00.000Z",
          app_metadata: {},
        },
      },
      error: null,
    });

    await expect(setInternalAuthBlocked("auth-1", false)).rejects.toBeInstanceOf(ExternalAuthBanError);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("nezruší ani manuálne pozmenený ban, keď v metadata ostal starý marker", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
    mocks.getUserById.mockResolvedValueOnce({
      data: {
        user: {
          id: "auth-1",
          banned_until: "2126-08-24T13:00:00.000Z",
          app_metadata: {
            moonid_lifecycle_ban: { version: 1, expectedUntil: "2126-08-24T12:00:00.000Z" },
          },
        },
      },
      error: null,
    });

    await expect(setInternalAuthBlocked("auth-1", false)).rejects.toBeInstanceOf(ExternalAuthBanError);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("MFA reset odstráni všetky faktory a provider partial failure vyhodí chybu", async () => {
    mocks.listFactors.mockResolvedValueOnce({
      data: { factors: [{ id: "factor-1" }, { id: "factor-2" }] },
      error: null,
    });
    mocks.deleteFactor
      .mockResolvedValueOnce({ data: { id: "factor-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("provider failure") });

    await expect(resetInternalAuthMfa("auth-1")).rejects.toThrow("could not be removed");
    expect(mocks.deleteFactor).toHaveBeenNthCalledWith(1, { userId: "auth-1", id: "factor-1" });
    expect(mocks.deleteFactor).toHaveBeenNthCalledWith(2, { userId: "auth-1", id: "factor-2" });
  });
});
