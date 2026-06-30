import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// Načítaj .env.test (gitignored — reálne testovacie heslá) bez extra závislosti.
try {
  for (const line of readFileSync(".env.test", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* .env.test nemusí existovať v CI — premenné prídu z GitHub Secrets */
}

const BASE = process.env.E2E_BASE_URL || "https://moonid-b2b-portal.vercel.app";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1, // jeden worker — nezahltíme free-tier a nekolidujeme na zdieľanom test účte
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "dealer",
      dependencies: ["setup"],
      testMatch: /(perf-baseline|order-flow)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/dealer.json" },
    },
    {
      name: "staff",
      dependencies: ["setup"],
      testMatch: /staff-baseline\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/staff.json" },
    },
  ],
});
