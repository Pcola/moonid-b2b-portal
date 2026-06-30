import { test } from "@playwright/test";
import { coldWarm } from "./helpers";

/**
 * Nedeštruktívny baseline autentifikovaných (dealer) stránok na živom webe.
 * Meria TTFB (cold prvý hit / warm druhý hit) a load. Nič nezapisuje do DB
 * okrem testovacieho košíka (add-to-cart je vratné, neodosiela objednávku).
 */
const PAGES: { name: string; path: string }[] = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Katalog", path: "/katalog" },
  { name: "Katalog ?stock=1", path: "/katalog?stock=1" },
  { name: "Objednavky", path: "/objednavky" },
  { name: "Faktury", path: "/faktury" },
  { name: "Kosik", path: "/kosik" },
  { name: "Nastavenia", path: "/nastavenia" },
];

test("dealer authed baseline (TTFB/load)", async ({ page }) => {
  const rows = [];
  for (const p of PAGES) rows.push(await coldWarm(page, p.name, p.path));
  // eslint-disable-next-line no-console
  console.log("\n=== DEALER AUTHED BASELINE (ms, live) ===");
  // eslint-disable-next-line no-console
  console.table(rows);
});

test("dealer: add-to-cart server action latency", async ({ page }) => {
  await page.goto("/katalog");
  const btn = page.getByRole("button", { name: "Do košíka" }).first();
  await btn.waitFor({ timeout: 15_000 });
  const t0 = Date.now();
  await btn.click();
  await page.getByText("Pridané ✓").first().waitFor({ timeout: 15_000 });
  // eslint-disable-next-line no-console
  console.log(`\naddToCart server action round-trip: ${Date.now() - t0} ms`);
});
