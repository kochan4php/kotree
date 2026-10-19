import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Test artefacts are generated, not source: the Playwright HTML report ships
  // minified bundles that would swamp the report and make lint depend on
  // whether a test run happened to leave one behind.
  globalIgnores([
    ".next/**",
    "public/sw.js",
    "public/workbox-*.js",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
