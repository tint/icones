import { createCatalogIndex, type CatalogOptions } from "@icones/core/catalog"
import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import {
  readIconManifest,
  manifestEntries,
  type IconManifest,
} from "@icones/core/manifest"
import { readElementData } from "@icones/core/elements"
import type { ElementData } from "@icones/core/element-types"
import type {
  CatalogIcon,
  CatalogResult,
  CatalogQuery,
} from "@icones/core/catalog"

export type IconRecord = CatalogIcon & { file: string }
export interface IconRepositoryOptions {
  /** Parsed, immutable JSON bodies retained in an LRU. Default: 128; 0 disables. */
  maxEntries?: number
  /** Filter results retained across pagination. Default: 32; 0 disables. */
  maxQueries?: number
  /** Optional query policies; filesystem indexing does not prescribe gallery behavior. */
  catalog?: CatalogOptions
  /** Build tools may infer metadata for flat legacy files without a manifest. */
  legacyVariant?: (
    prefix: string,
    category: string,
    slug: string
  ) => string | undefined
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}

export function assertIconName(name: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
    throw new TypeError(`Invalid icon name: ${name}`)
}

/** Index collection manifests without reading icon bodies; legacy data roots remain readable. */
export function createIconRepository(
  directory = "icons",
  {
    maxEntries = 128,
    maxQueries = 32,
    catalog: catalogOptions,
    legacyVariant,
  }: IconRepositoryOptions = {}
) {
  for (const [name, value] of Object.entries({ maxEntries, maxQueries })) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError(`Invalid repository ${name}: ${value}`)
  }
  const root = path.resolve(directory)
  const records = new Map<string, IconRecord>()
  const files = new Map<string, IconRecord>()
  const manifests = new Map<string, IconManifest>()
  const aliases = new Map<string, { prefix: string; suffix: string }>()
  let indexing: Promise<void> | undefined
  let refreshing: Promise<void> | undefined
  let catalogIndex: ReturnType<typeof createCatalogIndex> | undefined
  let generation = 0
  let initialized = false
  const bodies = new Map<string, { signature: string; data: ElementData }>()
  const pending = new Map<
    string,
    { signature: string; promise: Promise<ElementData> }
  >()
  function clearCache() {
    generation++
    catalogIndex = undefined
    bodies.clear()
    pending.clear()
  }
  function add(record: IconRecord) {
    const existing = records.get(record.name)
    if (existing && existing.file !== record.file)
      throw new Error(`Duplicate icon JSON: ${record.name}`)
    records.set(record.name, record)
    files.set(record.file, record)
    catalogIndex = undefined
    bodies.delete(record.file)
    pending.delete(record.file)
    return record
  }
  async function scan(
    directory: string,
    found: Map<string, IconRecord>,
    parts: string[] = []
  ) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return
      throw error
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && parts.length < 2)
        await scan(path.join(directory, entry.name), found, [
          ...parts,
          entry.name,
        ])
      else if (
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        parts.length === 2
      ) {
        const name = `${parts[0]}:${entry.name.slice(0, -5)}`
        assertIconName(name)
        if (parts.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)))
          throw new TypeError(`Invalid icon directory: ${parts.join("/")}`)
        if (found.has(name)) throw new Error(`Duplicate icon JSON: ${name}`)
        found.set(name, {
          name,
          prefix: parts[0]!,
          category: parts[1] === "data" ? "general" : parts[1]!,
          ...(parts[1] === "data"
            ? {
                variant: legacyVariant?.(
                  parts[0]!,
                  "general",
                  entry.name.slice(0, -5)
                ),
              }
            : {}),
          file: [...parts, entry.name].join("/"),
        })
      }
    }
  }
  function ready() {
    return (indexing ??= (async () => {
      const found = new Map<string, IconRecord>()
      const nextManifests = new Map<string, IconManifest>()
      const nextAliases = new Map<string, { prefix: string; suffix: string }>()
      let directories: import("node:fs").Dirent[]
      try {
        directories = await readdir(root, { withFileTypes: true })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        directories = []
      }
      for (const directory of directories) {
        if (!directory.isDirectory()) continue
        let content: string
        try {
          content = await readFile(
            path.join(root, directory.name, "manifest.json"),
            "utf8"
          )
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue
          throw error
        }
        const manifest = readIconManifest(JSON.parse(content), directory.name)
        nextManifests.set(manifest.prefix, freeze(manifest))
        for (const [alias, rule] of Object.entries(manifest.aliases ?? {})) {
          if (nextAliases.has(alias))
            throw new TypeError(`Duplicate collection alias: ${alias}`)
          nextAliases.set(alias, {
            prefix: manifest.prefix,
            suffix: rule.suffix,
          })
        }
        for (const entry of manifestEntries(manifest)) {
          const name = `${entry.prefix}:${entry.slug}`
          found.set(name, {
            name,
            prefix: entry.prefix,
            category: entry.category,
            variant: entry.variant,
            ...(entry.variantAlias ? { variantAlias: entry.variantAlias } : {}),
            file: `${entry.prefix}/data/${entry.slug}.json`,
          })
        }
      }
      for (const alias of nextAliases.keys())
        if (nextManifests.has(alias))
          throw new TypeError(`Alias conflicts with collection: ${alias}`)
      if (!nextManifests.size) await scan(root, found)
      // Preserve records explicitly added before the first ready() call.
      if (!initialized) {
        for (const record of records.values()) {
          const existing = found.get(record.name)
          if (existing && existing.file !== record.file)
            throw new Error(`Duplicate icon JSON: ${record.name}`)
          if (!existing) found.set(record.name, record)
        }
      }
      // Commit only a complete scan; a failed scan never exposes a partial catalog.
      records.clear()
      files.clear()
      manifests.clear()
      aliases.clear()
      for (const [prefix, manifest] of nextManifests)
        manifests.set(prefix, manifest)
      for (const [alias, rule] of nextAliases) aliases.set(alias, rule)
      for (const record of found.values()) {
        records.set(record.name, record)
        files.set(record.file, record)
      }
      clearCache()
      initialized = true
    })().catch((error) => {
      indexing = undefined
      throw error
    }))
  }
  async function read(record: IconRecord) {
    const revision = generation
    const file = path.join(root, record.file)
    // ctime and inode also detect same-size edits with a restored mtime/replacements.
    const info = await stat(file, { bigint: true })
    const signature = `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`
    // A refresh that overtook stat must not let this older read repopulate the cache.
    if (revision !== generation) return parse()
    const cached = bodies.get(record.file)
    if (cached?.signature === signature) {
      bodies.delete(record.file)
      bodies.set(record.file, cached)
      return cached.data
    }
    bodies.delete(record.file)
    const running = pending.get(record.file)
    if (running?.signature === signature) return running.promise
    const job = {
      signature,
      promise: parse()
        .then((data) => {
          if (
            revision === generation &&
            pending.get(record.file) === job &&
            maxEntries > 0
          ) {
            bodies.set(record.file, { signature, data })
            if (bodies.size > maxEntries)
              bodies.delete(bodies.keys().next().value!)
          }
          return data
        })
        .finally(() => {
          if (pending.get(record.file) === job) pending.delete(record.file)
        }),
    }
    pending.set(record.file, job)
    return job.promise

    async function parse() {
      return freeze(
        readElementData(JSON.parse(await readFile(file, "utf8")), record.name)
      )
    }
  }
  async function catalog(query: CatalogQuery = {}): Promise<CatalogResult> {
    await ready()
    catalogIndex ??= createCatalogIndex(
      [...records.values()],
      maxQueries,
      catalogOptions
    )
    return catalogIndex(query)
  }
  function resolve(name: string) {
    const direct = records.get(name)
    if (direct) return direct
    const [prefix, slug] = name.split(":")
    const alias = aliases.get(prefix!)
    return alias && slug
      ? records.get(`${alias.prefix}:${slug}${alias.suffix}`)
      : undefined
  }
  function symbolFile(record: IconRecord, symbolsDir?: string) {
    return record.file.startsWith(record.prefix + "/data/")
      ? path.join(
          root,
          record.file.replace("/data/", "/symbols/").replace(/\.json$/, ".svg")
        )
      : path.join(
          symbolsDir ?? path.join(root, "../symbols"),
          record.file.replace(/\.json$/, ".svg")
        )
  }
  return {
    root,
    records,
    files,
    manifests,
    resolve,
    symbolFile,
    add,
    ready,
    read,
    catalog,
    refresh() {
      return (refreshing ??= (async () => {
        await indexing
        clearCache()
        indexing = undefined
        await ready()
      })().finally(() => {
        refreshing = undefined
      }))
    },
    async get(name: string) {
      await ready()
      const record = resolve(name)
      return record ? read(record) : null
    },
  }
}
export type IconRepository = ReturnType<typeof createIconRepository>
