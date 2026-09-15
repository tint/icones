import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { toAsciiSlug } from "@icones/core/slug"
import { setTimeout as sleep } from "node:timers/promises"
import { getIconData, quicklyValidateIconSet } from "@iconify/utils"
import type { IconifyJSON } from "@iconify/types"
import { assertIconName, createIconRepository } from "@icones/vite/server"
import {
  collectionEntry,
  supportsCollectionIcon,
} from "@icones/vite/tooling/collections"
import { updateCollectionManifest as updateIconManifest } from "@icones/vite/tooling/collections"
import { iconToElementData } from "@icones/vite/tooling/elements"
import { readIconData } from "@icones/core/icon-data"
import { readElementData } from "@icones/core/elements"
import { writeGeneratedFile } from "../shared/files.ts"
import { saveSymbol } from "../generate/symbols.ts"

export type DownloadSet = {
  prefix: string
  /** Explicit names, or "*" for all visible icons. No inferred style counterparts. */
  icons?: string[] | "*"
  /** Upstream category titles, or their normalized directory names. */
  categories?: string[]
  categoryOverrides?: Record<string, string>
  fallbackCategory?: string
  /** Optional local IconifyJSON file, relative to the configuration file. */
  source?: string
}
export type DownloadConfig = {
  iconsDir?: string
  apiBaseUrl?: string
  sets: DownloadSet[]
}
type Collection = {
  prefix: string
  uncategorized?: string[]
  categories?: Record<string, string[]>
  aliases?: Record<string, string>
  hidden?: string[]
}
type DownloadOptions = {
  iconsDir: string
  sourceDir?: string
  apiBaseUrl?: string
  concurrency?: number
  force?: boolean
  dryRun?: boolean
  fetch?: typeof globalThis.fetch
  log?: (message: string) => void
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  )
}
export function categoryDirectory(value: string) {
  const slug = toAsciiSlug(value)
  if (!slug)
    throw new TypeError(
      `Category needs an explicit ASCII directory override: ${value}`
    )
  return slug
}

export function readDownloadConfig(value: unknown): DownloadConfig {
  if (!record(value) || !Array.isArray(value.sets) || !value.sets.length)
    throw new TypeError("Download config requires a non-empty sets array.")
  for (const key of ["iconsDir", "apiBaseUrl"])
    if (
      value[key] !== undefined &&
      (typeof value[key] !== "string" || !value[key])
    )
      throw new TypeError(`Invalid ${key}.`)
  const prefixes = new Set<string>()
  if (value.dataDir !== undefined)
    throw new TypeError(
      "Use iconsDir for the directory containing collections."
    )
  for (const set of value.sets) {
    if (
      !record(set) ||
      typeof set.prefix !== "string" ||
      !slugPattern.test(set.prefix)
    )
      throw new TypeError("Each download set requires a valid prefix.")
    if (prefixes.has(set.prefix))
      throw new Error(`Duplicate set: ${set.prefix}`)
    prefixes.add(set.prefix)
    if (set.group !== undefined)
      throw new TypeError(
        "group is not supported; use <set>/data/<name>.json and manifest categories."
      )
    if (
      set.icons !== undefined &&
      set.icons !== "*" &&
      (!strings(set.icons) ||
        !set.icons.length ||
        set.icons.some((name) => !slugPattern.test(name)))
    )
      throw new TypeError(`Invalid icon selection for ${set.prefix}.`)
    if (
      set.categories !== undefined &&
      (!strings(set.categories) || !set.categories.length)
    )
      throw new TypeError(`Invalid category selection for ${set.prefix}.`)
    if (set.icons === undefined && set.categories === undefined)
      throw new TypeError(
        `Choose icons, categories, or icons: "*" for ${set.prefix}.`
      )
    if (set.icons === "*" && set.categories !== undefined)
      throw new TypeError(
        `Do not combine all icons and category selection for ${set.prefix}.`
      )
    if (
      set.fallbackCategory !== undefined &&
      (typeof set.fallbackCategory !== "string" ||
        !slugPattern.test(set.fallbackCategory))
    )
      throw new TypeError(`Invalid fallbackCategory for ${set.prefix}.`)
    if (
      set.source !== undefined &&
      (typeof set.source !== "string" || !set.source)
    )
      throw new TypeError(`Invalid source for ${set.prefix}.`)
    if (set.categoryOverrides !== undefined) {
      if (!record(set.categoryOverrides))
        throw new TypeError("Invalid categoryOverrides.")
      for (const [name, category] of Object.entries(set.categoryOverrides)) {
        if (
          !slugPattern.test(name) ||
          typeof category !== "string" ||
          !slugPattern.test(category)
        )
          throw new TypeError(
            `Invalid category override for ${set.prefix}:${name}.`
          )
      }
    }
  }
  return value as DownloadConfig
}

function readCollection(value: unknown, prefix: string): Collection {
  if (!record(value) || value.prefix !== prefix)
    throw new TypeError(`Invalid collection for ${prefix}.`)
  for (const key of ["uncategorized", "hidden"])
    if (
      value[key] !== undefined &&
      (!strings(value[key]) ||
        value[key].some((name) => !slugPattern.test(name)))
    )
      throw new TypeError(`Invalid ${key} in ${prefix}.`)
  if (
    value.categories !== undefined &&
    (!record(value.categories) ||
      Object.values(value.categories).some(
        (names) =>
          !strings(names) || names.some((name) => !slugPattern.test(name))
      ))
  )
    throw new TypeError(`Invalid categories in ${prefix}.`)
  if (
    value.aliases !== undefined &&
    (!record(value.aliases) ||
      Object.entries(value.aliases).some(
        ([alias, parent]) =>
          !slugPattern.test(alias) ||
          typeof parent !== "string" ||
          !slugPattern.test(parent)
      ))
  )
    throw new TypeError(`Invalid aliases in ${prefix}.`)
  return value as Collection
}

function readSet(value: unknown, prefix: string): IconifyJSON {
  const set = quicklyValidateIconSet(value)
  if (!set || set.prefix !== prefix)
    throw new TypeError(`Invalid icon set response for ${prefix}.`)
  return set
}

function selectIcons(selection: DownloadSet, collection: Collection) {
  const categoryEntries = Object.entries(collection.categories ?? {}).sort(
    ([a], [b]) => a.localeCompare(b, "en")
  )
  const categories = new Map<string, string>()
  for (const [title, names] of categoryEntries)
    for (const name of names)
      if (!categories.has(name)) categories.set(name, title)
  const hidden = new Set(collection.hidden ?? [])
  const names = new Set<string>(
    selection.icons === "*"
      ? [...(collection.uncategorized ?? []), ...categories.keys()].filter(
          (name) =>
            !hidden.has(name) && !Object.hasOwn(collection.aliases ?? {}, name)
        )
      : (selection.icons ?? [])
  )
  for (const category of selection.categories ?? []) {
    const entry = categoryEntries.find(
      ([title]) => title === category || categoryDirectory(title) === category
    )
    if (!entry)
      throw new Error(`Unknown category "${category}" in ${selection.prefix}.`)
    for (const name of entry[1]) if (!hidden.has(name)) names.add(name)
  }
  if (!names.size) throw new Error(`No icons selected for ${selection.prefix}.`)
  return [...names].sort().map((slug) => {
    assertIconName(`${selection.prefix}:${slug}`)
    let parent = slug
    const visited = new Set<string>()
    while (
      !categories.has(parent) &&
      collection.aliases?.[parent] &&
      !visited.has(parent)
    ) {
      visited.add(parent)
      parent = collection.aliases[parent]!
    }
    const title = categories.get(parent)
    return {
      slug,
      category:
        selection.categoryOverrides?.[slug] ??
        (title
          ? categoryDirectory(title)
          : (selection.fallbackCategory ?? "general")),
    }
  })
}

/** CLI/build only. No client manifest, dependency on React, or change to unselected files. */
export async function downloadIcons(
  sets: DownloadSet[],
  options: DownloadOptions
) {
  readDownloadConfig({ sets })
  const concurrency = options.concurrency ?? 4
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
    throw new RangeError("concurrency must be between 1 and 16.")
  const base = (options.apiBaseUrl ?? "https://api.iconify.design").replace(
    /\/+$/,
    ""
  )
  const baseUrl = new URL(base)
  if (!/^https?:$/.test(baseUrl.protocol) || baseUrl.search || baseUrl.hash)
    throw new TypeError(
      "API base URL must be an HTTP(S) URL without query or fragment."
    )
  const legacyLayout = existsSync(path.join(options.iconsDir, "data"))
  const repository = createIconRepository(
    legacyLayout ? path.join(options.iconsDir, "data") : options.iconsDir
  )
  const symbolsDir = path.resolve(
    options.iconsDir,
    legacyLayout ? "symbols" : "."
  )
  await repository.ready()
  const summary = {
    selected: 0,
    downloaded: 0,
    skipped: 0,
    pending: 0,
    symbols: 0,
  }
  const log = options.log ?? (() => {})
  const request = async (url: string) => {
    for (let attempt = 0; ; attempt++) {
      const response = await (options.fetch ?? globalThis.fetch)(url, {
        signal: AbortSignal.timeout(30_000),
      })
      if (response.ok) return response.json() as Promise<unknown>
      if (attempt >= 2 || (response.status !== 429 && response.status < 500))
        throw new Error(`Download failed (${response.status}): ${url}`)
      await response.body?.cancel()
      await sleep(500 * 2 ** attempt)
    }
  }
  // One collection at a time: metadata and alias trees are released between sets.
  for (const selection of sets) {
    let source: IconifyJSON | undefined
    let collection: Collection
    if (selection.source) {
      source = readSet(
        JSON.parse(
          await readFile(
            path.resolve(options.sourceDir ?? process.cwd(), selection.source),
            "utf8"
          )
        ),
        selection.prefix
      )
      collection = readCollection(
        {
          prefix: source.prefix,
          uncategorized: Object.keys(source.icons),
          categories: source.categories,
          hidden: Object.keys(source.icons).filter(
            (name) => source!.icons[name]!.hidden
          ),
          aliases: Object.fromEntries(
            Object.entries(source.aliases ?? {}).map(([name, alias]) => [
              name,
              alias.parent,
            ])
          ),
        },
        selection.prefix
      )
    } else {
      collection = readCollection(
        await request(`${base}/collection?prefix=${selection.prefix}`),
        selection.prefix
      )
    }
    const candidates = selectIcons(selection, collection)
    const explicit = new Set(
      Array.isArray(selection.icons) ? selection.icons : []
    )
    const selected = candidates.filter(({ slug }) => {
      if (supportsCollectionIcon(selection.prefix, slug)) return true
      if (explicit.has(slug))
        throw new TypeError(
          `Unsupported collection style: ${selection.prefix}:${slug}`
        )
      return false
    })
    if (!selected.length)
      throw new Error(`No supported icons selected for ${selection.prefix}.`)
    summary.selected += selected.length
    const jobs: {
      slug: string
      file: string
      entry: ReturnType<typeof collectionEntry>
    }[] = []
    for (const { slug, category } of selected) {
      const name = `${selection.prefix}:${slug}`
      const existing = repository.resolve(name)
      const entry = collectionEntry(selection.prefix, category, slug)
      if (existing && !options.force) {
        // A malformed file is not a successful previous download.
        const data = await repository.read(existing)
        if (
          !options.dryRun &&
          (await saveSymbol(symbolsDir, existing.file, data))
        )
          summary.symbols++
        summary.skipped++
        continue
      }
      // Keep existing category placement, including when --force refreshes its body.
      jobs.push({
        slug,
        entry: existing
          ? {
              ...entry,
              category: existing.category,
            }
          : entry,
        file:
          existing?.file ??
          (legacyLayout
            ? `${selection.prefix}/${category}/${slug}.json`
            : `${entry.prefix}/data/${entry.slug}.json`),
      })
    }
    summary.pending += jobs.length
    log(
      `${selection.prefix}: selected ${selected.length}, ${options.dryRun ? "would download" : "pending"} ${jobs.length}, kept ${selected.length - jobs.length}.`
    )
    if (options.dryRun) continue
    const batches: (typeof jobs)[] = []
    for (const job of jobs) {
      const current = batches.at(-1)
      if (
        !current ||
        current.length >= 50 ||
        current.reduce(
          (length, item) => length + item.slug.length + 1,
          job.slug.length
        ) > 1500
      )
        batches.push([job])
      else current.push(job)
    }
    let next = 0
    let completed = 0
    let failed = false
    const workers = Array.from(
      { length: Math.min(concurrency, batches.length) },
      async () => {
        try {
          while (!failed && next < batches.length) {
            const batch = batches[next++]!
            const data =
              source ??
              readSet(
                await request(
                  `${base}/${selection.prefix}.json?icons=${batch.map(({ slug }) => slug).join(",")}`
                ),
                selection.prefix
              )
            // Validate the complete batch before writing; never save an empty 404 response.
            const results = batch.map((job) => {
              const icon = getIconData(data, job.slug)
              if (!icon)
                throw new Error(`Missing icon: ${selection.prefix}:${job.slug}`)
              return {
                ...job,
                icon: iconToElementData(readIconData(icon, job.slug)),
              }
            })
            for (const result of results) {
              const saved = await writeGeneratedFile(
                path.join(repository.root, result.file),
                JSON.stringify(result.icon, null, 2) + "\n",
                options.force ?? false
              )
              if (saved) summary.downloaded++
              else summary.skipped++
              const savedData = saved
                ? result.icon
                : readElementData(
                    JSON.parse(
                      await readFile(
                        path.join(repository.root, result.file),
                        "utf8"
                      )
                    ),
                    result.slug
                  )
              if (await saveSymbol(symbolsDir, result.file, savedData))
                summary.symbols++
              if (!legacyLayout)
                await updateIconManifest(repository.root, result.entry)
            }
            completed += batch.length
            log(`${selection.prefix}: processed ${completed}/${jobs.length}.`)
          }
        } catch (error) {
          failed = true
          throw error
        }
      }
    )
    const results = await Promise.allSettled(workers)
    const failure = results.find((result) => result.status === "rejected")
    if (failure?.status === "rejected") throw failure.reason
  }
  return summary
}
