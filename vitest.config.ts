import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 40000,
    // testy zdieľajú DB → bežia sekvenčne (žiadny súbeh medzi súbormi)
    fileParallelism: false,
    // guard: integračné testy nesmú bežať proti produkčnej DB (mažú dáta) — viď tests/_setup/db-guard.ts
    setupFiles: ["./tests/_setup/db-guard.ts"],
  },
  // mapuj @/ na koreň projektu (rovnako ako tsconfig paths) + stub "server-only" pre node testy
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) },
      { find: "server-only", replacement: fileURLToPath(new URL("./tests/_stubs/empty.ts", import.meta.url)) },
    ],
  },
});
