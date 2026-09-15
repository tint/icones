import {
  workspaceRoot as root,
  iconsDirectory as defaultDirectory,
} from "../paths.ts"
import path from "node:path"
import { parseArgs } from "node:util"
import { supportedSets, type SupportedSet } from "../import/sources.ts"
import { importOfficialSets } from "../import/official.ts"
import { generateNames } from "../generate/names.ts"

const { values } = parseArgs({
  options: {
    set: { type: "string", multiple: true },
    out: { type: "string" },
    cache: { type: "string" },
    concurrency: { type: "string" },
    snapshot: { type: "string" },
    force: { type: "boolean" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
})
if (values.help) {
  console.log(`Download official SVG sources into paired tuple JSON and single-symbol SVG files.

bun run download:icons --force                       All supported sets
bun run download:icons --set tabler,brand --force    Selected full sets
bun run download:icons --set lucide --dry-run        Inspect counts

Collections: tabler, brand, bootstrap, antd, phosphor, lucide, huge, flag (includes circle)
--out <directory>      Output collection directory (default: packages/icons/)
--cache <directory>    Download cache and recoverable previous generations
--concurrency <1–16>   Parallel SVG conversions/downloads (default: 8)
--snapshot YYYY-MM-DD  Reuse a dated Hugeicons catalog snapshot
--force               Replace selected sets; back up previous data and symbols

Ant Design imports outlined/filled only; twotone is excluded.
All original licenses are retained in packages/icons/<set>/license.txt.`)
} else {
  try {
    const sets = (
      values.set?.flatMap((value) => value.split(",")) ?? [...supportedSets]
    ).map((set) => (set === "huge" ? "hugeicons" : set))
    for (const set of sets)
      if (!(supportedSets as readonly string[]).includes(set))
        throw new Error(`Unsupported set: ${set}`)
    const iconsDir = path.resolve(values.out ?? defaultDirectory)
    await importOfficialSets(sets as SupportedSet[], {
      iconsDir,
      cacheDir: path.resolve(
        values.cache ?? path.join(root, ".cache/official")
      ),
      force: values.force,
      dryRun: values["dry-run"],
      snapshot: values.snapshot,
      concurrency:
        values.concurrency === undefined
          ? undefined
          : Number(values.concurrency),
    })
    if (!values["dry-run"] && iconsDir === defaultDirectory)
      await generateNames(iconsDir)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
