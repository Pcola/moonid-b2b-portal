import { describe, expect, it } from "vitest";

import { parseStagingRuntimeCredential } from "../scripts/security/runtime-db-credential";

const validUrl =
  "postgresql://moonid_app_staging.booeaeyyyitlmuxixjfy:abcdefghijklmnopqrstuvwxyz0123456789_-@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

describe("staging runtime database credential", () => {
  it("accepts only the expected least-privilege transaction-pooler URL", () => {
    expect(parseStagingRuntimeCredential(validUrl)).toEqual({
      password: "abcdefghijklmnopqrstuvwxyz0123456789_-",
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
      "abcdefghijklmnopqrstuvwxyz0123456789_-",
      "abcdefghijklmnopqrstuvwxyz012345%40%23%3F_-",
    );
    expect(parseStagingRuntimeCredential(encoded).password).toBe(
      "abcdefghijklmnopqrstuvwxyz012345@#?_-",
    );
  });
});
