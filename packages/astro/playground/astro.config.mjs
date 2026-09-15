import { defineConfig } from "astro/config"
import { fileURLToPath } from "node:url"
import { iconify } from "@icones/vite"

export default defineConfig({
  vite: {
    plugins: [
      iconify({
        mode: process.env.ICONES_TEST_MODE === "symbol" ? "symbol" : "svg",
        dataDir: fileURLToPath(new URL("../../icons", import.meta.url)),
        emitData: false,
        fallbackToApi: false,
      }),
    ],
  },
})
