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

// Bez explicitného cieľa testujeme iba lokálny server. Produkcia nesmie byť bezpečnostne
// neviditeľným defaultom, pretože niektoré E2E scenáre zapisujú do košíka/objednávok.
const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";

if (process.env.GITHUB_ACTIONS === "true") {
  const target = new URL(BASE);
  const isMoonidPreview =
    /^moonid-b2b-portal-[a-z0-9]+-lukasslobodnik7-7499s-projects\.vercel\.app$/i.test(target.hostname);
  if (target.protocol !== "https:" || !isMoonidPreview) {
    throw new Error(`CI E2E odmieta neočakávaný cieľ: ${target.origin}`);
  }
}

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
      name: "customer-smoke",
      dependencies: ["setup"],
      testMatch: /staging-smoke\.spec\.ts/,
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
