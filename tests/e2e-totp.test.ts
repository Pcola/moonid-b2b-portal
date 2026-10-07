import { describe, expect, it } from "vitest";
import { totp } from "./e2e/totp";

// RFC 6238 Appendix B — SHA-1/Base32 test vectors.
const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("TOTP helper pre Playwright MFA", () => {
  it.each([
    [59, "94287082"],
    [1_111_111_109, "07081804"],
    [1_111_111_111, "14050471"],
    [1_234_567_890, "89005924"],
    [2_000_000_000, "69279037"],
    [20_000_000_000, "65353130"],
  ])("generuje RFC kód pre čas %i", (seconds, expected) => {
    expect(totp(SECRET, seconds * 1000, 8)).toBe(expected);
  });

  it("odmietne neplatný Base32 secret", () => {
    expect(() => totp("not-a-secret!", 0)).toThrow(/Base32/);
  });
});
