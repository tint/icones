import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { generateNames } from "../generate/names.ts"
import {
  downloadIcons,
  readDownloadConfig,
  type DownloadConfig,
} from "../import/api.ts"

import { iconsDirectory as defaultIconsDirectory } from "../paths.ts"

const { values } = parseArgs({
  options: {
    config: { type: "string" },
    set: { type: "string", multiple: true },
    icons: { type: "string", multiple: true },
    category: { type: "string", multiple: true },
    source: { type: "string" },
    out: { type: "string" },
    api: { type: "string" },
    concurrency: { type: "string" },
    force: { type: "boolean" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
})

if (values.help) {
  console.log(`Download paired <set>/data/<name>.json and <set>/symbols/<name>.svg, indexed by <set>/manifest.json.

	bun run download:api                           Use scripts/icon-builder/config/icons.json
bun run download:api --set tabler               All visible icons in one set
bun run download:api --set tabler,lucide        Multiple sets
bun run download:api --icons tabler:star,lucide:search
bun run download:api --set line-md --category Alerts
bun run download:api --set tabler --source ./tabler.json

--config <file>       Alternative JSON selection config
--out <directory>     Collection root containing <set>/data/ and <set>/symbols/ (default: packages/icons/)
--api <url>           Iconify-compatible download API
--concurrency <1–16>  Parallel data batches (default: 4)
--dry-run            List counts without downloading bodies or writing files
--force              Replace selected existing bodies; preserve their categories

Unselected and custom files are never deleted. Styles are independent names.`)
} else {
  try {
    const prefixes = values.set?.flatMap((value) => value.split(","))
    const names = values.icons?.flatMap((value) => value.split(","))
    if (
      values.config &&
      (prefixes || names || values.category || values.source)
    )
      throw new Error("Use --config or command-line selections, not both.")
    if (prefixes && names) throw new Error("Use --set or --icons, not both.")
    if ((values.category || values.source) && prefixes?.length !== 1)
      throw new Error("--category and --source require exactly one --set.")
    let config: DownloadConfig
    let sourceDir = process.cwd()
    if (prefixes) {
      config = {
        sets: prefixes.map((prefix) => ({
          prefix,
          ...(values.category
            ? { categories: values.category }
            : { icons: "*" as const }),
          source: values.source,
        })),
      }
    } else if (names) {
      const sets = new Map<string, string[]>()
      for (const name of names) {
        const match =
          /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(name)
        if (!match)
          throw new Error(`--icons requires full set:name values: ${name}`)
        const icons = sets.get(match[1]!) ?? []
        icons.push(match[2]!)
        sets.set(match[1]!, icons)
      }
      config = {
        sets: [...sets].map(([prefix, icons]) => ({
          prefix,
          icons,
        })),
      }
    } else {
      const configFile = values.config
        ? path.resolve(values.config)
        : fileURLToPath(new URL("../../config/icons.json", import.meta.url))
      sourceDir = path.dirname(configFile)
      config = readDownloadConfig(
        JSON.parse(await readFile(configFile, "utf8"))
      )
    }
    readDownloadConfig(config)
    const iconsDir = values.out
      ? path.resolve(values.out)
      : config.iconsDir
        ? path.resolve(sourceDir, config.iconsDir)
        : defaultIconsDirectory
    const result = await downloadIcons(config.sets, {
      iconsDir,
      sourceDir,
      apiBaseUrl: values.api ?? config.apiBaseUrl,
      concurrency:
        values.concurrency === undefined
          ? undefined
          : Number(values.concurrency),
      force: values.force,
      dryRun: values["dry-run"],
      log: console.log,
    })
    if (
      !values["dry-run"] &&
      path.resolve(iconsDir) === path.resolve(defaultIconsDirectory)
    )
      await generateNames(iconsDir)
    console.log(
      `${values["dry-run"] ? "Dry run" : "Done"}: ${result.selected} selected, ${result.downloaded} JSON downloaded, ${result.skipped} kept, ${result.symbols} SVG generated/updated${values["dry-run"] ? `, ${result.pending} pending` : ""}. Output: ${iconsDir}`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
