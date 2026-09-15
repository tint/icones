import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { ElementData } from "@icones/core/element-types"
import { createIconRepository } from "@icones/vite/server"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"
import { writeGeneratedFile } from "../shared/files.ts"

export async function saveSymbol(
  symbolsDir: string,
  jsonFile: string,
  data: ElementData
) {
  const file = path.join(
    symbolsDir,
    jsonFile.replace("/data/", "/symbols/").replace(/\.json$/, ".svg")
  )
  const name = `${jsonFile.split("/")[0]}:${path.basename(jsonFile, ".json")}`
  const source = createIconSymbolDocument(data, name) + "\n"
  try {
    if ((await readFile(file, "utf8")) === source) return false
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  return writeGeneratedFile(file, source, true)
}

/** Rebuild derived SVG files from local JSON, including application-owned icons. */
export async function generateSymbols(iconsDir: string) {
  const legacyLayout = existsSync(path.join(iconsDir, "data"))
  const repository = createIconRepository(
    legacyLayout ? path.join(iconsDir, "data") : iconsDir
  )
  await repository.ready()
  let generated = 0
  for (const record of repository.records.values()) {
    if (
      await saveSymbol(
        legacyLayout ? path.join(iconsDir, "symbols") : iconsDir,
        record.file,
        await repository.read(record)
      )
    )
      generated++
  }
  return { total: repository.records.size, generated }
}
