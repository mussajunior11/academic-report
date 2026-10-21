import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // The integration suites share a single SQLite file with many round trips,
    // so allow more headroom than the 5s default to avoid timeout flakiness.
    testTimeout: 30000,
    hookTimeout: 30000,
    // The integration suites share a single SQLite file, so run files
    // sequentially to avoid write-lock contention and flaky failures.
    fileParallelism: false,
  },
});
