import type { Page } from "@playwright/test";

export type Timing = { ttfb: number; dcl: number; load: number; bytes: number };

/** Odmeria jednu navigáciu cez Navigation Timing API (responseStart = TTFB). */
export async function measure(page: Page, path: string): Promise<Timing> {
  await page.goto(path, { waitUntil: "load" });
  return page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return {
      ttfb: Math.round(n.responseStart),
      dcl: Math.round(n.domContentLoadedEventEnd),
      load: Math.round(n.loadEventEnd),
      bytes: n.transferSize || 0,
    };
  });
}

/** Dva hity za sebou → cold (prvý hit route) vs warm (znovupoužitie). Riadok pre console.table. */
export async function coldWarm(page: Page, name: string, path: string) {
  const cold = await measure(page, path);
  const warm = await measure(page, path);
  return {
    page: name,
    coldTTFB: cold.ttfb,
    warmTTFB: warm.ttfb,
    warmLoad: warm.load,
    KB: Math.round(warm.bytes / 1024),
  };
}
