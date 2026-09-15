import { defineConfig } from "tsdown"
export default defineConfig({
  entry: ["src/index.ts", "src/types.ts"],
  platform: "neutral",
  dts: true,
  clean: true,
  deps: { neverBundle: [/^@icones\//, /^astro(?:\/|$)/, /\.astro$/] },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
  copy: [{ from: "src/Icon.astro", to: "dist" }],
})
