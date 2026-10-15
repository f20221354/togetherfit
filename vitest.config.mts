import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      // Runs against a real build; see tests/README.md for the setup.
      { resolve: { alias }, test: { name: "api", include: ["tests/api/**/*.test.ts"], environment: "node", testTimeout: 30_000, fileParallelism: false } },
    ],
  },
});
