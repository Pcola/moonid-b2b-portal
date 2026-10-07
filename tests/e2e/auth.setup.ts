import { test as setup, expect, type Page } from "@playwright/test";
import { stableTotp } from "./totp";

/**
 * Prihlási oba testovacie účty cez reálny login formulár (client-side
 * supabase.auth.signInWithPassword) a uloží session (cookies) do storageState,
 * ktorý potom používajú dealer/staff projekty. Beží raz pred ostatnými testami.
 */
async function establishVercelBypass(page: Page) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return;

  // Hlavičku posielame jednorazovo iba na Vercel origin. Globálne extraHTTPHeaders by ju
  // posielali aj cross-origin Supabase požiadavkám a zbytočne by prezradili CI credential.
  const response = await page.request.get("/", {
    headers: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  expect(response.ok(), "Vercel Automation Bypass neudelil prístup k Preview deploymentu").toBe(true);
}

async function login(page: Page, email: string, password: string, state: string, next: string, mfaSecret?: string) {
  await establishVercelBypass(page);
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Firemný e-mail").fill(email);
  await page.getByLabel("Heslo").fill(password);
  await page.getByRole("button", { name: "Prihlásiť sa" }).click();
  // Úspech prvého faktora = odchod z /login. Privilegované účty potom musia prejsť MFA.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/login/);

  const afterPassword = new URL(page.url()).pathname;
  if (afterPassword === "/mfa/setup") {
    throw new Error("E2E staff účet ešte nemá zaregistrované MFA. Najprv ho aktivujte v staging portáli.");
  }
  if (afterPassword === "/mfa") {
    expect(mfaSecret, "E2E_STAFF_TOTP_SECRET chýba pre povinné staff MFA").toBeTruthy();
    await page.getByLabel("Overovací kód").fill(await stableTotp(mfaSecret!));
    await page.getByRole("button", { name: "Overiť a pokračovať" }).click();
    await page.waitForURL((url) => url.pathname === next, { timeout: 30_000 });
  }

  await expect(page).toHaveURL(new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`));
  await page.context().storageState({ path: state });
}

setup("authenticate dealer", async ({ page }) => {
  const email =
    process.env.E2E_CUSTOMER_ADMIN_EMAIL || process.env.E2E_CUSTOMER_EMAIL || process.env.E2E_DEALER_EMAIL;
  const password =
    process.env.E2E_CUSTOMER_ADMIN_PASSWORD ||
    process.env.E2E_CUSTOMER_PASSWORD ||
    process.env.E2E_DEALER_PASSWORD;
  expect(
    email,
    "E2E_CUSTOMER_ADMIN_EMAIL/E2E_CUSTOMER_EMAIL/E2E_DEALER_EMAIL chýba (.env.test alebo GitHub Secret)",
  ).toBeTruthy();
  expect(password, "E2E_CUSTOMER_ADMIN_PASSWORD/E2E_CUSTOMER_PASSWORD/E2E_DEALER_PASSWORD chýba").toBeTruthy();
  await login(page, email!, password!, "tests/e2e/.auth/dealer.json", "/dashboard");
});

setup("authenticate staff", async ({ page }) => {
  const email = process.env.E2E_STAFF_EMAIL;
  const password = process.env.E2E_STAFF_PASSWORD;
  const mfaSecret = process.env.E2E_STAFF_TOTP_SECRET;
  if (!email && !password && !mfaSecret) {
    setup.skip(true, "Staff E2E credentials nie sú nakonfigurované.");
    return;
  }
  expect(email, "E2E_STAFF_EMAIL chýba").toBeTruthy();
  expect(password, "E2E_STAFF_PASSWORD chýba").toBeTruthy();
  expect(mfaSecret, "E2E_STAFF_TOTP_SECRET chýba").toBeTruthy();
  await login(page, email!, password!, "tests/e2e/.auth/staff.json", "/staff", mfaSecret!);
});
