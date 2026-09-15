import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  platform: "node",
  format: "esm",
  dts: true,
  clean: true,
  deps: {
    neverBundle: [
      /^@icones\//,
      /^@modelcontextprotocol\//,
      /^zod(?:\/|$)/,
      /^node:/,
    ],
  },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
})
