import path from "node:path"
import { parseArgs } from "node:util"
import { generateSymbols } from "../generate/symbols.ts"

import { iconsDirectory as defaultIconsDirectory } from "../paths.ts"

const { values } = parseArgs({
  options: { out: { type: "string" }, help: { type: "boolean", short: "h" } },
})
if (values.help) {
  console.log(
    "bun run generate:symbols [--out ./packages/icons]\nGenerate <set>/symbols/*.svg from <set>/data/*.json using each collection manifest."
  )
} else {
  try {
    const iconsDir = values.out
      ? path.resolve(values.out)
      : defaultIconsDirectory
    const result = await generateSymbols(iconsDir)
    console.log(
      `${result.total} JSON icons, ${result.generated} symbols generated/updated. Output: ${iconsDir}`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
