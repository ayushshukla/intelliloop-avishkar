import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Match the deterministic Windows runner policy used by unit tests.
    fileParallelism: false,
    // Real filesystem, Git and SQLite integration can exceed Vitest's
    // five-second default on a loaded Windows host without being hung.
    testTimeout: 30_000,
    include: ["apps/api/test/**/*.test.ts"],
    reporters: ["default"]
  }
});
