import { defineConfig } from "tsdown"
export default defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  format: "esm",
  dts: true,
  clean: true,
  deps: { neverBundle: [/^@icones\//, /^vue(?:\/|$)/, /^node:/] },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
})
