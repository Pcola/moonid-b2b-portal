import { test as setup, expect, type Page } from "@playwright/test";

/**
 * Prihlási oba testovacie účty cez reálny login formulár (client-side
 * supabase.auth.signInWithPassword) a uloží session (cookies) do storageState,
 * ktorý potom používajú dealer/staff projekty. Beží raz pred ostatnými testami.
 */
async function login(page: Page, email: string, password: string, state: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Firemný e-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Prihlásiť sa" }).click();
  // úspech = odchod z /login (router.replace(next))
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: state });
}

setup("authenticate dealer", async ({ page }) => {
  const email = process.env.E2E_DEALER_EMAIL;
  const password = process.env.E2E_DEALER_PASSWORD;
  expect(email, "E2E_DEALER_EMAIL chýba (.env.test alebo GitHub Secret)").toBeTruthy();
  expect(password, "E2E_DEALER_PASSWORD chýba").toBeTruthy();
  await login(page, email!, password!, "tests/e2e/.auth/dealer.json", "/dashboard");
});

setup("authenticate staff", async ({ page }) => {
  const email = process.env.E2E_STAFF_EMAIL;
  const password = process.env.E2E_STAFF_PASSWORD;
  expect(email, "E2E_STAFF_EMAIL chýba").toBeTruthy();
  expect(password, "E2E_STAFF_PASSWORD chýba").toBeTruthy();
  await login(page, email!, password!, "tests/e2e/.auth/staff.json", "/staff");
});
