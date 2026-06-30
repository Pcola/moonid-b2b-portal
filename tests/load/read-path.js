// k6 load test — VEREJNÁ read-path + health. Spustenie: k6 run tests/load/read-path.js
//
// Prečo len verejné cesty: autentifikované stránky a server actions (košík,
// objednávka) bežia cez @supabase/ssr cookie + Next-Action protokol, ktoré sa
// v k6 nedajú spoľahlivo replikovať — write-path/E2E rieši Playwright
// (tests/e2e/order-flow.spec.ts). Tu meriame súbežnosť na čítacej ceste.
//
// POZOR (free tier): Supabase/Vercel free beží na ZDIEĽANOM compute. Veľký
// stress test meria aj šum susedov a môže ťa rate-limitnúť. Drž sa reálnej
// B2B mierky (jednotky–desiatky VU), nie hľadania stropu.

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://moonid-b2b-portal.vercel.app";
const ttfb = new Trend("ttfb_ms", true);

export const options = {
  scenarios: {
    smoke: { executor: "constant-vus", vus: 1, duration: "30s", tags: { phase: "smoke" } },
    peak: {
      executor: "ramping-vus",
      startTime: "35s",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 }, // rozbeh na ~10 súbežných dílerov
        { duration: "1m", target: 10 }, // udrž
        { duration: "20s", target: 0 }, // dobeh
      ],
      tags: { phase: "peak" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1 % chýb
    "http_req_duration{phase:smoke}": ["p(95)<1500"], // warm baseline cieľ
    "http_req_duration{phase:peak}": ["p(95)<3000"], // pod záťažou
  },
};

const PATHS = ["/", "/produkty", "/api/health"];

export default function () {
  for (const p of PATHS) {
    const res = http.get(`${BASE}${p}`, { tags: { path: p } });
    ttfb.add(res.timings.waiting);
    check(res, { "status 200": (r) => r.status === 200 });
    sleep(1);
  }
}
