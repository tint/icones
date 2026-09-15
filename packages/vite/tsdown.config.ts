import { defineConfig } from "tsdown"
export default defineConfig({
  entry: [
    "src/index.ts",
    "src/server/index.ts",
    "src/tooling/index.ts",
    "src/tooling/elements.ts",
    "src/tooling/symbol.ts",
    "src/tooling/collections.ts",
  ],
  platform: "node",
  format: "esm",
  dts: true,
  clean: true,
  deps: { neverBundle: [/^@icones\//, /^react(?:\/|$)/, /^node:/] },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
})
