import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The supported Windows 11 baseline serializes files to avoid a
    // vite-node temporary SSR-cache race while retaining per-file isolation.
    fileParallelism: false,
    include: [
      "packages/contracts/test/**/*.test.ts",
      "packages/domain/test/**/*.test.ts",
      "packages/demo-fixtures/test/**/*.test.ts",
      "apps/web/test/**/*.test.tsx"
    ],
    reporters: ["default"]
  }
});
