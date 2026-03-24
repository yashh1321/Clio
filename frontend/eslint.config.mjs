import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test utility scripts (not app code):
    "test_dompurify.js",
    "test_submit.js",
  ]),
  {
    files: [
      "app/editor/page.tsx",
      "app/api/convert-docx-to-pdf/route.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "varsIgnorePattern": "^_" }],
    },
  },
]);

export default eslintConfig;
