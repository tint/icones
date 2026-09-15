import { defineConfig } from "tsdown"
export default defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  format: "esm",
  dts: true,
  clean: true,
  deps: { neverBundle: [/^@icones\//, /^react(?:\/|$)/, /^node:/] },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
})
