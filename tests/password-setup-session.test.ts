import { describe, expect, it } from "vitest";
import { hasRecentPasswordSetupGrant, PASSWORD_SETUP_GRANT_MAX_AGE_SEC } from "@/lib/password-setup-session";

describe("hasRecentPasswordSetupGrant", () => {
  const now = 2_000_000_000;

  it.each(["invite", "recovery"])("accepts a recent timestamped %s grant", (method) => {
    expect(hasRecentPasswordSetupGrant({ amr: [{ method, timestamp: now - 30 }] }, now)).toBe(true);
  });

  it.each([
    { label: "normal password session", claims: { amr: [{ method: "password", timestamp: now }] } },
    { label: "MFA session", claims: { amr: [{ method: "totp", timestamp: now }] } },
    { label: "purpose-ambiguous OTP session", claims: { amr: [{ method: "otp", timestamp: now }] } },
    { label: "magic-link login session", claims: { amr: [{ method: "magiclink", timestamp: now }] } },
    { label: "old recovery", claims: { amr: [{ method: "recovery", timestamp: now - PASSWORD_SETUP_GRANT_MAX_AGE_SEC - 1 }] } },
    { label: "future invite", claims: { amr: [{ method: "invite", timestamp: now + 61 }] } },
    { label: "untimestamped RFC AMR", claims: { amr: ["recovery"] } },
    { label: "missing AMR", claims: { sub: "user" } },
  ])("rejects $label", ({ claims }) => {
    expect(hasRecentPasswordSetupGrant(claims, now)).toBe(false);
  });
});
