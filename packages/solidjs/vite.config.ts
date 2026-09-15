import { fileURLToPath } from "node:url"
import solid from "vite-plugin-solid"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import { icones } from "@icones/vite"
export default defineConfig({
  root: "./playground",
  plugins: [
    icones({
      mode: "symbol",
      dataDir: fileURLToPath(new URL("../icons", import.meta.url)),
      emitData: false,
      fallbackToApi: false,
    }),
    solid(),
  ],
  test: {
    root: ".",
    include: ["tests/icon.test.ts", "tests/icon.test.tsx"],
    browser: {
      enabled: true,
      provider: playwright({ launchOptions: { channel: "chrome" } }),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
  },
})
