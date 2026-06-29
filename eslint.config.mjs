import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // jednorazové skripty, prototypy, .NET agent, testy a generované súbory nelintujeme
    ignores: [".next/**", "node_modules/**", "prototypes/**", "scripts/**", "agent/**", "tests/**", "public/**", "next-env.d.ts"],
  },
  {
    rules: {
      // " v slovenskom texte sa renderuje korektne — kozmetické pravidlo vypíname
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
