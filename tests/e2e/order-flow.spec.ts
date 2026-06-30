import { test, expect } from "@playwright/test";

/**
 * DEŠTRUKTÍVNE: vytvorí REÁLNU objednávku v produkčnej DB a pošle e-mail staffu
 * (STAFF_NOTIFY_EMAIL). Pohoda sync sa nespustí inline (status LOKALNA), ale
 * objednávka ostane v histórii. Preto je test default VYPNUTÝ.
 *
 * Spustenie (vedome):
 *   PowerShell:  $env:E2E_PLACE_ORDER="1"; npx playwright test --project=dealer order-flow
 *   Bash:        E2E_PLACE_ORDER=1 npx playwright test --project=dealer order-flow
 */
const ENABLED = process.env.E2E_PLACE_ORDER === "1";

test.describe("dealer: odoslanie objednávky (DESTRUCTIVE)", () => {
  test.skip(!ENABLED, "Nastav E2E_PLACE_ORDER=1 — vytvára reálnu objednávku + e-mail staffu.");

  test("katalog → kosik → odoslat objednavku", async ({ page }) => {
    await page.goto("/katalog");
    await page.getByRole("button", { name: "Do košíka" }).first().click();
    await page.getByText("Pridané ✓").first().waitFor({ timeout: 15_000 });

    await page.goto("/kosik");
    // ak firma nemá uloženú adresu, formulár pýta novú
    const street = page.getByPlaceholder("Ulica a číslo *");
    if (await street.isVisible().catch(() => false)) {
      await street.fill("Testovacia 1");
      await page.getByPlaceholder("Mesto *").fill("Nové Zámky");
      await page.getByPlaceholder("PSČ *").fill("94001");
    }

    const t0 = Date.now();
    await page.getByRole("button", { name: "Odoslať objednávku" }).click();
    await expect(page.getByText(/Objednávka .* prijatá/)).toBeVisible({ timeout: 30_000 });
    // eslint-disable-next-line no-console
    console.log(`\ncreateOrder (full submit, write path): ${Date.now() - t0} ms`);
  });
});
