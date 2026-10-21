import nextConfig from "eslint-config-next";
import globals from "globals";

const config = [
  { ignores: [".next/**", ".lane/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
  ...nextConfig,
  {
    files: ["scripts/**/*.mjs", ".claude/**/*.mjs", "*.config.{mjs,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
];

export default config;
