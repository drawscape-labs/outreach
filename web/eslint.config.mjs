import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  globalIgnores([
    ".next/**",
    ".next-dev/**",
    "node_modules/**",
    "prisma/migrations/**"
  ]),
  nextCoreWebVitals
]);
