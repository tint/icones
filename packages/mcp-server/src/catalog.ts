/* Scan serially to bound file handles; reads within one handle must stay ordered. */
/* eslint-disable no-await-in-loop */
import { constants } from "node:fs"
import { open, readdir, realpath, stat } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import {
  createCatalogIndex,
  type CatalogIcon,
  type CatalogQuery,
} from "@icones/core/catalog"
import {
  manifestEntries,
  readIconManifest,
  type IconManifest,
} from "@icones/core/manifest"
import { readElementData } from "@icones/core/elements"
import { elementDataToIcon } from "@icones/core/svg-data"
import { withIconViewBox } from "@icones/core/svg"

export const maxFileBytes = 1024 * 1024

/** Only deliberate, safe messages are sent to the model; OS paths stay private. */
export class CatalogError extends Error {}

export async function resolveDataDirectory(directory?: string) {
  // The artwork package has no executable root export. Locate its manifest
  // relative to this package, independently of the caller's working directory.
  const root = await realpath(
    directory ??
      path.dirname(
        createRequire(import.meta.url).resolve("@icones/icons/package.json")
      )
  )
  if (!(await stat(root)).isDirectory())
    throw new Error("Icon data directory must be a directory.")
  return root
}

/** A connection-local metadata snapshot; artwork and licenses are read on demand. */
export async function createLocalCatalog(dataDirectory?: string) {
  const root = await resolveDataDirectory(dataDirectory)

  async function readLocal(file: string) {
    // Resolve symlinks and refuse paths outside the configured icon root.
    const resolved = await realpath(path.join(root, file))
    const relative = path.relative(root, resolved)
    if (
      relative === ".." ||
      relative.startsWith(".." + path.sep) ||
      path.isAbsolute(relative)
    )
      throw new CatalogError(
        "Files outside the configured icon directory are not accessible."
      )
    const handle = await open(
      resolved,
      // A substituted FIFO/device must not block before the regular-file check.
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
    )
    try {
      const info = await handle.stat()
      const invalid = () =>
        new CatalogError(
          "Icon source file is not a regular file or exceeds the 1 MiB limit."
        )
      if (!info.isFile() || info.size > maxFileBytes) throw invalid()
      // Bound the read as well as stat: a file can grow while it is being read.
      const buffer = Buffer.alloc(maxFileBytes + 1)
      let length = 0
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(
          buffer,
          length,
          buffer.length - length
        )
        if (!bytesRead) break
        length += bytesRead
      }
      if (length > maxFileBytes) throw invalid()
      return buffer.toString("utf8", 0, length)
    } finally {
      await handle.close()
    }
  }

  const records = new Map<string, CatalogIcon & { file: string }>()
  const manifests = new Map<string, IconManifest>()
  const aliases = new Map<string, { prefix: string; suffix: string }>()
  const directories = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .toSorted((a, b) => a.name.localeCompare(b.name))

  // Only validated manifest entries become readable files. Drawing bodies are
  // deliberately not loaded during startup or metadata searches.
  for (const directory of directories) {
    let content: string
    try {
      content = await readLocal(path.join(directory.name, "manifest.json"))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue
      throw error
    }
    const manifest = readIconManifest(JSON.parse(content), directory.name)
    manifests.set(manifest.prefix, manifest)
    for (const [alias, rule] of Object.entries(manifest.aliases ?? {})) {
      if (aliases.has(alias))
        throw new CatalogError("Duplicate collection alias.")
      aliases.set(alias, { prefix: manifest.prefix, suffix: rule.suffix })
    }
    for (const entry of manifestEntries(manifest)) {
      const name = `${entry.prefix}:${entry.slug}`
      records.set(name, {
        name,
        prefix: entry.prefix,
        category: entry.category,
        variant: entry.variant,
        ...(entry.variantAlias ? { variantAlias: entry.variantAlias } : {}),
        file: `${entry.prefix}/data/${entry.slug}.json`,
      })
    }
  }
  for (const alias of aliases.keys()) {
    if (manifests.has(alias))
      throw new CatalogError("Alias conflicts with a collection name.")
  }

  // Legacy roots have no manifests and use <set>/<category>/<slug>.json.
  // Do not mix unlisted files into a manifest-backed catalog.
  if (!manifests.size) {
    const segment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    for (const directory of directories) {
      const prefix = directory.name
      for (const category of await readdir(path.join(root, prefix), {
        withFileTypes: true,
      })) {
        if (!category.isDirectory()) continue
        for (const file of await readdir(
          path.join(root, prefix, category.name),
          { withFileTypes: true }
        )) {
          if (!file.isFile() || !file.name.endsWith(".json")) continue
          const slug = file.name.slice(0, -5)
          if (
            ![prefix, category.name, slug].every((part) => segment.test(part))
          )
            throw new CatalogError("Invalid legacy icon path.")
          const name = `${prefix}:${slug}`
          if (records.has(name))
            throw new CatalogError("Duplicate legacy icon name.")
          records.set(name, {
            name,
            prefix,
            category: category.name === "data" ? "general" : category.name,
            file: `${prefix}/${category.name}/${file.name}`,
          })
        }
      }
    }
  }

  const catalog = createCatalogIndex([...records.values()], 32, {
    defaultLimit: 60,
    maxLimit: 100,
  })
  const sources = (set: string) =>
    structuredClone(manifests.get(set)?.sources ?? {})

  function resolve(name: string) {
    const direct = records.get(name)
    if (direct) return direct
    const match =
      /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(name)
    const alias = match && aliases.get(match[1]!)
    return alias
      ? records.get(`${alias.prefix}:${match![2]}${alias.suffix}`)
      : undefined
  }

  return {
    async listSets() {
      const page = catalog({ limit: 1 })
      return {
        totalIcons: page.total,
        sets: page.sets.map(({ id, count }) => {
          const collection = catalog({ set: id, limit: 1 })
          return {
            id,
            count,
            categories: collection.categories,
            variants: collection.variants ?? [],
            sources: sources(id),
          }
        }),
      }
    },
    // MCP owns its wire envelope; Core only supplies pure filtering/pagination.
    search: async (query: CatalogQuery = {}) => ({
      version: 1 as const,
      ...catalog(query),
    }),
    async getIcon(name: string, format: "json" | "svg" | "both") {
      const record = resolve(name)
      if (!record)
        throw new CatalogError(
          "Icon not found. Search the catalog for an exact set:name first."
        )
      const data = readElementData(
        JSON.parse(await readLocal(record.file)),
        record.name
      )
      const icon = withIconViewBox(elementDataToIcon(data), record.name)
      const viewBox = `${icon.left ?? 0} ${icon.top ?? 0} ${icon.width ?? 24} ${icon.height ?? 24}`
      return {
        name: record.name,
        requestedName: name,
        set: record.prefix,
        category: record.category,
        ...(record.variant ? { variant: record.variant } : {}),
        ...(record.variantAlias ? { variantAlias: record.variantAlias } : {}),
        viewBox,
        ...(format !== "svg" ? { data } : {}),
        ...(format !== "json"
          ? {
              svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" width="${icon.width ?? 24}" height="${icon.height ?? 24}">${icon.body}</svg>`,
            }
          : {}),
        sources: sources(record.prefix),
        license: { tool: "get_icon_license", set: record.prefix },
      }
    },
    async getLicense(set: string) {
      if (!manifests.has(set) && !catalog({ set, limit: 1 }).total)
        throw new CatalogError(
          "Collection not found. Use list_icon_sets for available set names."
        )
      let license: string
      try {
        license = await readLocal(path.join(set, "license.txt"))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
          throw new CatalogError(
            "No license.txt is available for this collection. Check the original source before reuse."
          )
        throw error
      }
      return {
        set,
        license,
        sources: sources(set),
      }
    },
  }
}
