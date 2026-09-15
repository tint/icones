import solid from "rolldown-plugin-solid"
import { defineConfig, type UserConfig } from "tsdown"
const shared: UserConfig = {
  entry: ["src/index.ts"],
  platform: "neutral",
  format: "esm",
  clean: true,
  deps: { neverBundle: [/^@icones\//, /^solid-js(?:\/|$)/] },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
}
export default defineConfig([
  {
    ...shared,
    outDir: "dist/client",
    dts: true,
    plugins: [solid({ solid: { generate: "dom", hydratable: true } })],
  },
  {
    ...shared,
    outDir: "dist/server",
    dts: false,
    plugins: [solid({ solid: { generate: "ssr", hydratable: true } })],
  },
  {
    ...shared,
    outDir: "dist/source",
    dts: false,
    outExtensions: () => ({ js: ".jsx" }),
  },
])
