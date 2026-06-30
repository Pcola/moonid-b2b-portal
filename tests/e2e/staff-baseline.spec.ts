import { test } from "@playwright/test";
import { coldWarm } from "./helpers";

/** Nedeštruktívny baseline staff stránok (read-only). */
const PAGES: { name: string; path: string }[] = [
  { name: "Staff home", path: "/staff" },
  { name: "Staff objednavky", path: "/staff/objednavky" },
  { name: "Staff katalog", path: "/staff/katalog" },
  { name: "Staff zakaznici", path: "/staff/zakaznici" },
  { name: "Staff cenniky", path: "/staff/cenniky" },
  { name: "Staff faktury", path: "/staff/faktury" },
  { name: "Staff ziadosti", path: "/staff/ziadosti" },
];

test("staff authed baseline (TTFB/load)", async ({ page }) => {
  const rows = [];
  for (const p of PAGES) rows.push(await coldWarm(page, p.name, p.path));
  // eslint-disable-next-line no-console
  console.log("\n=== STAFF AUTHED BASELINE (ms, live) ===");
  // eslint-disable-next-line no-console
  console.table(rows);
});
