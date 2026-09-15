import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
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
  ],
})
