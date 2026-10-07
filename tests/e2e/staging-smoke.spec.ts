import { expect, test, type APIRequestContext } from "@playwright/test";

const READ_ONLY_PAGES = [
  { path: "/dashboard", title: "Prehľad" },
  { path: "/katalog", title: "Katalóg" },
  { path: "/rychla-objednavka", title: "Rýchla objednávka" },
  { path: "/oblubene", title: "Obľúbené" },
  { path: "/objednavky", title: "Objednávky" },
  { path: "/faktury", title: "Faktúry" },
  { path: "/pouzivatelia", title: "Používatelia" },
  { path: "/kosik", title: "Košík" },
  { path: "/nastavenia", title: "Nastavenia" },
] as const;

async function establishVercelBypass(request: APIRequestContext) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return;
  const response = await request.get("/", {
    headers: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  expect(response.ok(), "Vercel Automation Bypass neudelil anonymnému kontextu prístup").toBe(true);
}

test("staging anonym: chránená stránka presmeruje na prihlásenie", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL });
  try {
    await establishVercelBypass(context.request);
    const page = await context.newPage();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const target = new URL(page.url());
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("next")).toBe("/dashboard");
    await expect(page.getByLabel("Firemný e-mail")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("staging customer: kritické stránky sú dostupné bez zápisu", async ({ page }) => {
  for (const route of READ_ONLY_PAGES) {
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(response, `${route.path} nevrátil HTTP odpoveď`).not.toBeNull();
    expect(response!.status(), `${route.path} vrátil HTTP ${response!.status()}`).toBeLessThan(500);
    expect(new URL(page.url()).pathname, `${route.path} presmerovalo mimo očakávanej stránky`).toBe(route.path);
    await expect(page.locator("main#obsah")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: route.title, exact: true })).toBeVisible();
  }
});

test("staging customer: nemá prístup do staff administrácie", async ({ page }) => {
  await page.goto("/staff", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Prehľad", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigácia administrácie" })).toHaveCount(0);
});

test("staging customer: nemôže stiahnuť interný staff export", async ({ page }) => {
  const response = await page.request.get("/api/staff/export?type=orders", { maxRedirects: 0 });
  expect([303, 307, 308], `Staff export vrátil neočakávané HTTP ${response.status()}`).toContain(response.status());
  const location = response.headers().location;
  expect(location, "Staff export nevrátil bezpečné presmerovanie").toBeTruthy();
  expect(new URL(location!, page.url()).pathname).toBe("/dashboard");
  expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
});
