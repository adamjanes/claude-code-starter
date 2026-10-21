import nextConfig from "eslint-config-next";
import globals from "globals";

import local from "./eslint-rules/index.mjs";

const config = [
  { ignores: [".next/**", ".lane/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
  ...nextConfig,
  {
    files: ["scripts/**/*.mjs", ".claude/**/*.mjs", "eslint-rules/**/*.mjs", "*.config.{mjs,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    plugins: { local },
    rules: {
      "local/comment-length": "error",
      "local/no-narrating-comments": "error",
    },
  },
];

export default config;
