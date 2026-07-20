import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], include: ["lib/**/*.test.ts", "components/**/*.test.tsx", "scripts/**/*.test.ts"], exclude: ["tests/e2e/**", "node_modules/**"] },
});
