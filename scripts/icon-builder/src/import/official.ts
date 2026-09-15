import { mkdir, mkdtemp, readFile, rename, stat } from "node:fs/promises"
import path from "node:path"
import { svgToElementData } from "@icones/vite/tooling/elements"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"
import {
  collectionEntry,
  supportsCollectionIcon,
  createCollectionManifest as createIconManifest,
  serializeCollectionManifest as serializeManifest,
} from "@icones/vite/tooling/collections"
import { type IconManifest } from "@icones/core/manifest"
import { writeGeneratedFile } from "../shared/files.ts"
import {
  archiveCatalog,
  phosphorMetadataRevision,
  type SourceIcon,
} from "./catalog.ts"
import { hugeiconsCatalog, parallel } from "./hugeicons.ts"
import { officialSources, supportedSets, type SupportedSet } from "./sources.ts"
import { cachedText, prepareArchive } from "../shared/upstream-cache.ts"

export function validateCatalog(
  prefix: SupportedSet,
  icons: readonly SourceIcon[]
) {
  if (!supportedSets.includes(prefix))
    throw new Error(`Unsupported set: ${prefix}`)
  if (!icons.length) throw new Error(`Empty catalog: ${prefix}`)
  const names = new Set<string>()
  for (const icon of icons) {
    if (
      icon.prefix !== prefix ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon.slug) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon.category)
    )
      throw new Error(
        `Invalid icon path: ${icon.prefix}/${icon.category}/${icon.slug}`
      )
    if (names.has(icon.slug))
      throw new Error(`Duplicate icon: ${prefix}:${icon.slug}`)
    if (!supportsCollectionIcon(prefix, icon.slug))
      throw new TypeError(
        `Unsupported collection style: ${prefix}:${icon.slug}`
      )
    names.add(icon.slug)
  }
}

async function exists(file: string) {
  try {
    await stat(file)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

/** Publish only a fully converted set. Retain the previous generation for recovery. */
export async function publishSet(
  stage: string,
  iconsDir: string,
  backup: string,
  prefix: SupportedSet | "huge"
) {
  if (prefix !== "huge" && !supportedSets.includes(prefix))
    throw new Error(`Unsupported set: ${prefix}`)
  if (await exists(path.join(stage, prefix, "manifest.json"))) {
    const destination = path.join(iconsDir, prefix)
    const saved = path.join(backup, prefix)
    await mkdir(iconsDir, { recursive: true })
    await mkdir(backup, { recursive: true })
    const hadOld = await exists(destination)
    if (hadOld) await rename(destination, saved)
    try {
      await rename(path.join(stage, prefix), destination)
    } catch (error) {
      if (hadOld) await rename(saved, destination)
      throw error
    }
    return
  }
  const moved: {
    old: string
    saved: string
    installed: boolean
    hadOld: boolean
  }[] = []
  try {
    for (const kind of ["data", "symbols"]) {
      const old = path.join(iconsDir, kind, prefix)
      const saved = path.join(backup, kind, prefix)
      await mkdir(path.dirname(old), { recursive: true })
      await mkdir(path.dirname(saved), { recursive: true })
      const hadOld = await exists(old)
      if (hadOld) await rename(old, saved)
      const entry = { old, saved, installed: false, hadOld }
      moved.push(entry)
      await rename(path.join(stage, kind, prefix), old)
      entry.installed = true
    }
  } catch (error) {
    for (const entry of moved.reverse()) {
      if (entry.installed) await rename(entry.old, entry.saved + ".incomplete")
      if (entry.hadOld) await rename(entry.saved, entry.old)
    }
    throw error
  }
}

export async function importOfficialSets(
  sets: readonly SupportedSet[],
  options: {
    iconsDir: string
    cacheDir: string
    force?: boolean
    dryRun?: boolean
    concurrency?: number
    snapshot?: string
    log?: (message: string) => void
  }
) {
  const log = options.log ?? console.log
  if (!sets.length || sets.some((set) => !supportedSets.includes(set)))
    throw new Error("Choose supported icon sets.")
  const concurrency = options.concurrency ?? 8
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
    throw new Error("Concurrency must be an integer between 1 and 16.")
  const snapshot = options.snapshot ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot))
    throw new Error("Invalid Hugeicons snapshot date.")
  const iconsDir = path.resolve(options.iconsDir)
  const cacheDir = path.resolve(options.cacheDir)
  if (
    cacheDir === iconsDir ||
    cacheDir.startsWith(iconsDir + path.sep) ||
    iconsDir.startsWith(cacheDir + path.sep)
  )
    throw new Error("Cache and output directories must not overlap.")
  await mkdir(cacheDir, { recursive: true })
  const stage = options.dryRun
    ? ""
    : await mkdtemp(path.join(cacheDir, "import-"))
  const backup = path.join(stage, "previous")
  const collections = new Map<
    string,
    { manifest: IconManifest; licenses: Map<string, string> }
  >()
  const selected = new Set(sets)
  // Flag is published as one collection, including both upstreams.
  if (selected.has("flag") || selected.has("circle-flags")) {
    selected.add("flag")
    selected.add("circle-flags")
  }
  const results = []
  for (const prefix of selected) {
    if (
      !options.dryRun &&
      !options.force &&
      (await exists(
        path.join(iconsDir, collectionEntry(prefix, "general", "sample").prefix)
      ))
    )
      throw new Error(
        `${prefix} already exists. Use --force to replace it with a recoverable backup.`
      )
    const icons =
      prefix === "hugeicons"
        ? await hugeiconsCatalog(cacheDir, snapshot, log)
        : await archiveCatalog(prefix, cacheDir)
    validateCatalog(prefix, icons)
    const counts = {
      icons: icons.length,
      categories: new Set(icons.map((icon) => icon.category)).size,
    }
    if (options.dryRun) {
      log(`${prefix}: ${counts.icons} icons / ${counts.categories} categories`)
      results.push({ prefix, ...counts })
      continue
    }
    let license: string
    let source: Record<string, unknown>
    if (prefix === "hugeicons") {
      const licenseUrl =
        "https://raw.githubusercontent.com/hugeicons/hugeicons/b2462ece29de25fff2cc716da4452d6ada210c7e/LICENSE.md"
      license = await cachedText(
        licenseUrl,
        path.join(cacheDir, "hugeicons-license-b2462ece.txt")
      )
      source = {
        url: "https://hugeicons.com/icons/stroke-rounded",
        snapshot,
        style: "stroke-rounded",
        licenseUrl,
      }
    } else {
      const origin = prefix === "brand" ? "tabler" : prefix
      const config = officialSources[origin]
      const root = await prepareArchive(origin, cacheDir)
      license = await readFile(path.join(root, config.license), "utf8")
      source = {
        url: `https://github.com/${config.repo}`,
        revision: config.revision,
        ...("archivePath" in config ? { archivePath: config.archivePath } : {}),
        ...(prefix === "phosphor"
          ? { metadataRevision: phosphorMetadataRevision }
          : {}),
      }
    }
    const outputPrefix = collectionEntry(prefix, "general", "sample").prefix
    let collection = collections.get(outputPrefix)
    if (!collection) {
      collection = {
        manifest: createIconManifest(outputPrefix),
        licenses: new Map(),
      }
      collections.set(outputPrefix, collection)
    }
    collection.licenses.set(prefix, license)
    collection.manifest.sources ??= {}
    collection.manifest.sources[prefix] = {
      url: String(source.url),
      ...source,
      ...counts,
      importedAt: new Date().toISOString(),
    }
    for (const icon of icons) {
      const entry = collectionEntry(prefix, icon.category, icon.slug)
      const categories = (collection.manifest.variants[entry.variant] ??= {})
      const files = (categories[entry.category] ??= { json: [], svg: [] })
      files.json.push(entry.slug + ".json")
      files.svg.push(entry.slug + ".svg")
    }
    let completed = 0
    await parallel(icons, concurrency, async (icon) => {
      try {
        const data = svgToElementData(await icon.load(), icon.preserveStroke)
        const entry = collectionEntry(prefix, icon.category, icon.slug)
        await Promise.all([
          writeGeneratedFile(
            path.join(stage, entry.prefix, "data", entry.slug + ".json"),
            JSON.stringify(data, null, 2) + "\n",
            true
          ),
          writeGeneratedFile(
            path.join(stage, entry.prefix, "symbols", entry.slug + ".svg"),
            createIconSymbolDocument(data, `${entry.prefix}:${entry.slug}`) +
              "\n",
            true
          ),
        ])
        completed++
        if (completed % 500 === 0 || completed === icons.length)
          log(`${prefix}: ${completed}/${icons.length}`)
      } catch (error) {
        throw new Error(
          `${prefix}:${icon.slug}: ${error instanceof Error ? error.message : error}`,
          { cause: error }
        )
      }
    })
    results.push({ prefix, ...counts })
    log(
      `Published ${prefix}: ${counts.icons} icons / ${counts.categories} categories`
    )
  }
  if (!options.dryRun) {
    for (const [prefix, { manifest, licenses }] of collections) {
      await writeGeneratedFile(
        path.join(stage, prefix, "manifest.json"),
        serializeManifest(manifest),
        true
      )
      const text = [...licenses]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([source, license]) =>
          licenses.size === 1 ? license : `===== ${source} =====\n\n${license}`
        )
        .join("\n\n")
      await writeGeneratedFile(
        path.join(stage, prefix, "license.txt"),
        text,
        true
      )
      await publishSet(stage, iconsDir, backup, prefix as SupportedSet | "huge")
    }
    log(`Previous sets (if any) are recoverable at ${backup}`)
  }
  return results
}
