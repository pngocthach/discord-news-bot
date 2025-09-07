import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/setupTests.ts"],
  },
  resolve: {
    alias: {
      "#": new URL("./src/", import.meta.url).pathname,
    },
  },
});
