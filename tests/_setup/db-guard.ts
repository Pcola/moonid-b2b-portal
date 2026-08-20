/**
 * Guard: integračné testy robia `deleteMany` a spotrebúvajú OrderCounter — NESMÚ bežať proti
 * produkčnej DB. Príčina existencie: pri go-live audite (docs/GO_LIVE_AUDIT_2026-07-25.md, B9)
 * sa zistilo, že `vitest` nemal žiadny env override, takže lokálne spustenia mierili na
 * produkčný Supabase projekt a spálili ~312 čísel objednávok.
 *
 * DÔLEŽITÉ: vitest .env súbory NEnačítava, ale Prisma Client si `.env` načíta sám. Guard preto
 * musí zistiť *efektívnu* URL rovnako ako Prisma — teda aj z `.env` na disku, nielen z
 * process.env (inak by nič nechytil a bol by falošnou istotou).
 *
 * Poradie:
 *   1. TEST_DATABASE_URL (z process.env alebo .env.test) → nastaví sa do process.env, čo má
 *      u Prismy prednosť pred `.env` súborom.
 *   2. Efektívna URL sa skontroluje proti zoznamu produkčných identifikátorov.
 *   3. Produkčná DB je bez výnimky odmietnutá. CI aj lokálny vývoj musia použiť samostatný,
 *      obnoviteľný Postgres/Supabase branch.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Produkčné identifikátory, ktoré v testovacom connection stringu nemajú čo robiť.
const PROD_MARKERS = ["gckvseqlaxydsbutsjhm"];

/** Minimalistický .env parser (bez závislosti na dotenv). */
function parseEnvFile(file: string): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {}; // súbor nemusí existovať (CI)
  }
}

const envTest = parseEnvFile(".env.test");
// Prisma číta `.env`; Next.js navyše `.env.local` — pozeráme obe, aby guard nič neprehliadol.
const envFiles = { ...parseEnvFile(".env"), ...parseEnvFile(".env.local") };

const testUrl = process.env.TEST_DATABASE_URL || envTest.TEST_DATABASE_URL;
if (testUrl) {
  // process.env má u Prismy prednosť pred .env súborom → týmto sa testy prepnú na testovaciu DB
  process.env.DATABASE_URL = testUrl;
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL || envTest.TEST_DIRECT_URL || testUrl;
}

/** Efektívna URL, s ktorou sa Prisma reálne pripojí. */
const effective = process.env.DATABASE_URL || envFiles.DATABASE_URL || "";
const hitsProd = PROD_MARKERS.some((m) => effective.includes(m));

if (hitsProd) {
  throw new Error(
    [
      "",
      "╔═══════════════════════════════════════════════════════════════════════╗",
      "║  TESTY ZASTAVENÉ: DATABASE_URL mieri na PRODUKČNÚ databázu.           ║",
      "╚═══════════════════════════════════════════════════════════════════════╝",
      "",
      "Integračné testy mažú dáta (deleteMany) a spotrebúvajú čísla objednávok.",
      "",
      "Rieš jedným z týchto spôsobov:",
      "  1) Odporúčané — vytvor si testovaciu DB a do .env.test pridaj:",
      "       TEST_DATABASE_URL=postgresql://…   (samostatný Supabase projekt/branch alebo lokálny Postgres)",
      "Detail: docs/GO_LIVE_AUDIT_2026-07-25.md, blocker B9.",
      "",
    ].join("\n")
  );
}
