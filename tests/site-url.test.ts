import { afterEach, describe, expect, it, vi } from "vitest";

async function siteUrl() {
  vi.resetModules();
  return (await import("@/lib/site-url")).SITE_URL;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("SITE_URL", () => {
  it("uses the stable branch URL for preview deployments", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "moonid-git-staging.example.vercel.app");
    vi.stubEnv("VERCEL_URL", "moonid-random-deployment.example.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "portal.example.sk");

    await expect(siteUrl()).resolves.toBe("https://moonid-git-staging.example.vercel.app");
  });

  it("falls back to the generated deployment URL when no branch URL exists", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    vi.stubEnv("VERCEL_URL", "moonid-random-deployment.example.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "portal.example.sk");

    await expect(siteUrl()).resolves.toBe("https://moonid-random-deployment.example.vercel.app");
  });

  it("requires an explicit public URL for production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "portal.example.sk");

    await expect(siteUrl()).rejects.toThrow("NEXT_PUBLIC_SITE_URL is required");
  });

  it("uses the explicit URL when configured", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portal.example.sk/path");

    await expect(siteUrl()).resolves.toBe("https://portal.example.sk");
  });
});
