import { describe, expect, it } from "vitest";
import { isImplicitPasswordSetupCallback, shouldRefreshSession } from "@/lib/auth-flow";

describe("Supabase auth callback flow", () => {
  it("routes a fragment-based password setup callback to the client page", () => {
    expect(isImplicitPasswordSetupCallback(null, null, "/nastav-heslo")).toBe(true);
  });

  it("does not treat PKCE or token-hash callbacks as implicit", () => {
    expect(isImplicitPasswordSetupCallback("code", null, "/nastav-heslo")).toBe(false);
    expect(isImplicitPasswordSetupCallback(null, "hash", "/nastav-heslo")).toBe(false);
    expect(isImplicitPasswordSetupCallback(null, null, "/dashboard")).toBe(false);
  });

  it("does not refresh stale sessions before the callback exchanges credentials", () => {
    expect(shouldRefreshSession("/auth/callback")).toBe(false);
    expect(shouldRefreshSession("/nastav-heslo")).toBe(true);
    expect(shouldRefreshSession("/dashboard")).toBe(true);
  });
});
