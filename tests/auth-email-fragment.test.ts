import { describe, expect, it } from "vitest";
import { isPasswordSetupFragment } from "@/lib/auth-email-fragment";

describe("isPasswordSetupFragment", () => {
  it.each(["invite", "recovery"])("accepts a complete %s session", (type) => {
    expect(
      isPasswordSetupFragment(`#access_token=access&refresh_token=refresh&type=${type}`),
    ).toBe(true);
  });

  it.each([
    "",
    "#type=invite",
    "#access_token=access&type=invite",
    "#access_token=access&refresh_token=refresh&type=signup",
    "?access_token=access&refresh_token=refresh&type=invite",
  ])("rejects an incomplete or unrelated fragment: %s", (hash) => {
    expect(isPasswordSetupFragment(hash)).toBe(false);
  });
});

