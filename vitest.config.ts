import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 40000,
    // testy zdieľajú DB → bežia sekvenčne (žiadny súbeh medzi súbormi)
    fileParallelism: false,
  },
});
