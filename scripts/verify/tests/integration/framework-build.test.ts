import { expect, test } from "bun:test"
import { build } from "vite"

for (const framework of ["vue", "svelte", "solidjs", "vanilla"]) {
  test(
    framework + " production consumer compiles and extracts both static icons",
    async () => {
      const root = new URL(
        "../../../../packages/" + framework + "/",
        import.meta.url
      ).pathname
      const result = await build({
        configFile: root + "vite.config.ts",
        root: root + "playground",
        logLevel: "silent",
        build: { write: false, minify: false },
      })
      const outputs = (Array.isArray(result) ? result : [result]).flatMap(
        (output) => {
          if (!("output" in output)) throw new Error("Unexpected watch build")
          return output.output
        }
      )
      const symbols = outputs.filter(
        (output) => output.type === "asset" && output.fileName.endsWith(".svg")
      )
      expect(symbols.length).toBe(2)
      expect(symbols.some((output) => output.fileName.includes("/star-"))).toBe(
        true
      )
      expect(
        symbols.some((output) => output.fileName.includes("/heart-"))
      ).toBe(true)
      const code = outputs
        .filter((output) => output.type === "chunk")
        .map((output) => output.code)
        .join("\n")
      expect(code).toContain("registerStatic")
      expect(code).not.toContain("MyButton")
      expect(code).not.toContain("node:fs")
    },
    30_000
  )
}
