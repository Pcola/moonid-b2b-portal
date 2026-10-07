import { describe, expect, it } from "vitest";
import { scrubPii } from "@/lib/sentry-scrub";

describe("scrubPii", () => {
  it("odstráni query capability aj z request URL", () => {
    const event = scrubPii({
      request: {
        url: "https://staging.test/nastav-heslo?grant=secret#access_token=bearer",
        query_string: "grant=secret",
        headers: { cookie: "secret", authorization: "Bearer secret" },
      },
    });

    expect(event.request.url).toBe("https://staging.test/nastav-heslo");
    expect(event.request.query_string).toBeUndefined();
    expect(event.request.headers.cookie).toBeUndefined();
    expect(event.request.headers.authorization).toBeUndefined();
  });
});

