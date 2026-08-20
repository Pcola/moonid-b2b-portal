import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // " v slovenskom texte sa renderuje korektne — kozmetické pravidlo vypíname
      "react/no-unescaped-entities": "off",
    },
  },
  // Jednorazové skripty, prototypy, .NET agent, testy a generované súbory nelintujeme.
  globalIgnores([".next/**", "out/**", "build/**", "prototypes/**", "scripts/**", "agent/**", "tests/**", "public/**", "next-env.d.ts"]),
]);

export default eslintConfig;
