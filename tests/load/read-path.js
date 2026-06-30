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
//
// !! OVERENÉ NA TOMTO WEBE: Vercel má bot-mitigáciu — pri náraze requestov
// z jednej IP vráti HTML "Vercel Security Checkpoint" namiesto appky (a meral
// by si challenge stránku, nie portál + môže ťa dočasne zablokovať). Preto:
//   - testuj radšej PREVIEW/staging deployment, NIE surovú produkciu, alebo
//   - nastav Vercel "Protection Bypass for Automation" a spusti s tokenom:
//       k6 run -e BYPASS_TOKEN=xxxxx tests/load/read-path.js
//   - skript dolu kontroluje, či odpoveď nie je checkpoint (fail fast).

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://moonid-b2b-portal.vercel.app";
const BYPASS = __ENV.BYPASS_TOKEN || ""; // Vercel protection-bypass (voliteľné)
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
const headers = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

export default function () {
  for (const p of PATHS) {
    const res = http.get(`${BASE}${p}`, { tags: { path: p }, headers });
    ttfb.add(res.timings.waiting);
    check(res, {
      "status 200": (r) => r.status === 200,
      // ak meriame challenge stránku, výsledky sú bezcenné — zachyť to
      "not bot-challenge": (r) => !String(r.body).includes("Vercel Security Checkpoint"),
    });
    sleep(1);
  }
}
