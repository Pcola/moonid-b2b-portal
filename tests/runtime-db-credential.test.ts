import { describe, expect, it } from "vitest";

import { parseStagingRuntimeCredential } from "../scripts/security/runtime-db-credential";

const testPassword = "x".repeat(40);
const validUrl =
  `postgresql://moonid_app_staging.booeaeyyyitlmuxixjfy:${testPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require`;

describe("staging runtime database credential", () => {
  it("accepts only the expected least-privilege transaction-pooler URL", () => {
    expect(parseStagingRuntimeCredential(validUrl)).toEqual({
      password: testPassword,
      role: "moonid_app_staging",
    });
  });

  it.each([
    validUrl.replace("moonid_app_staging", "postgres"),
    validUrl.replace("booeaeyyyitlmuxixjfy", "gckvseqlaxydsbutsjhm"),
    validUrl.replace(":6543", ":5432"),
    validUrl.replace("pgbouncer=true", "pgbouncer=false"),
    validUrl.replace("connection_limit=1", "connection_limit=10"),
    validUrl.replace("sslmode=require", "sslmode=disable"),
  ])("rejects an unsafe or unexpected URL", (url) => {
    expect(() => parseStagingRuntimeCredential(url)).toThrow();
  });

  it("decodes a percent-encoded password without logging or returning the URL", () => {
    const encoded = validUrl.replace(
      testPassword,
      `${"y".repeat(32)}%40%23%3F_-`,
    );
    expect(parseStagingRuntimeCredential(encoded).password).toBe(
      `${"y".repeat(32)}@#?_-`,
    );
  });
});
