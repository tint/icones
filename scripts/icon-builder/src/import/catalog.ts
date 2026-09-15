import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { toAsciiSlug } from "@icones/core/slug"
import { cachedText, prepareArchive } from "../shared/upstream-cache.ts"
import { officialSources, type SupportedSet } from "./sources.ts"

export type SourceIcon = {
  prefix: SupportedSet
  category: string
  slug: string
  source: string
  load: () => Promise<string>
  preserveStroke?: boolean
}
export function directorySlug(value: string) {
  const slug = toAsciiSlug(value)
  if (!slug) throw new TypeError(`Invalid category: ${value}`)
  return slug
}
export async function walkFiles(
  root: string,
  directory = ""
): Promise<string[]> {
  const entries = await readdir(path.join(root, directory), {
    withFileTypes: true,
  })
  const paths = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? walkFiles(root, path.posix.join(directory, entry.name))
        : entry.isFile()
          ? [path.posix.join(directory, entry.name)]
          : []
    )
  )
  return paths.flat().sort()
}
export function tablerCategory(source: string) {
  return source.match(/^category:\s*(.+)$/m)?.[1]?.trim()
}
export function tablerIdentity(stem: string, style: string) {
  const brand = stem.startsWith("brand-")
  return {
    prefix: brand ? ("brand" as const) : ("tabler" as const),
    slug:
      (brand ? stem.slice(6) : stem) + (style === "filled" ? "-filled" : ""),
  }
}

export async function archiveCatalog(
  prefix: Exclude<SupportedSet, "hugeicons">,
  cacheDir: string
): Promise<SourceIcon[]> {
  const source = prefix === "brand" ? "tabler" : prefix
  const root = await prepareArchive(source, cacheDir)
  const config = officialSources[source]
  const base = `https://github.com/${config.repo}/blob/${config.revision}/`
  const local = (
    relative: string,
    category: string,
    slug: string
  ): SourceIcon => ({
    prefix,
    category,
    slug,
    source: base + relative,
    load: () => readFile(path.join(root, relative), "utf8"),
    preserveStroke: prefix === "flag" || prefix === "circle-flags",
  })
  if (source === "tabler") {
    const outlineCategories = new Map<string, string>()
    for (const file of await readdir(path.join(root, "icons/outline"))) {
      if (!file.endsWith(".svg")) continue
      const category = tablerCategory(
        await readFile(path.join(root, "icons/outline", file), "utf8")
      )
      if (!category) throw new Error(`Missing Tabler category: ${file}`)
      outlineCategories.set(file.slice(0, -4), category)
    }
    const result: SourceIcon[] = []
    for (const style of ["outline", "filled"]) {
      for (const file of await readdir(path.join(root, "icons", style))) {
        if (!file.endsWith(".svg")) continue
        const stem = file.slice(0, -4)
        const identity = tablerIdentity(stem, style)
        if (identity.prefix !== prefix) continue
        const category = outlineCategories.get(stem)
        if (!category)
          throw new Error(`No outline category for filled Tabler icon: ${stem}`)
        result.push(
          local(
            `icons/${style}/${file}`,
            prefix === "brand" ? "logos" : directorySlug(category),
            identity.slug
          )
        )
      }
    }
    return result
  }
  if (source === "bootstrap") {
    const result: SourceIcon[] = []
    for (const file of (await readdir(path.join(root, "icons"))).sort()) {
      if (!file.endsWith(".svg")) continue
      const slug = file.slice(0, -4)
      const metadata = await readFile(
        path.join(root, "docs/content/icons", slug + ".md"),
        "utf8"
      )
      const frontmatter = metadata.match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
      )?.[1]
      if (frontmatter === undefined)
        throw new Error(`Missing Bootstrap metadata: ${file}`)
      const parsed = Bun.YAML.parse(frontmatter) as {
        categories?: unknown
      } | null
      // Some official pages have a null category list or omit it entirely.
      const categories = parsed?.categories ?? []
      if (
        !Array.isArray(categories) ||
        categories.some((item) => typeof item !== "string")
      )
        throw new Error(`Invalid Bootstrap categories: ${file}`)
      result.push(
        local(
          "icons/" + file,
          categories.map(directorySlug).sort()[0] ?? "general",
          slug
        )
      )
    }
    return result
  }
  if (source === "antd") {
    const result: SourceIcon[] = []
    for (const style of officialSources.antd.styles) {
      const directory = `packages/icons-svg/svg/${style}`
      for (const file of (await readdir(path.join(root, directory))).sort()) {
        if (!file.endsWith(".svg")) continue
        // Upstream has no category metadata. Flatten the two folders without
        // colliding: outlined/star.svg -> star, filled/star.svg -> star-filled.
        const slug = file.slice(0, -4) + (style === "filled" ? "-filled" : "")
        result.push(local(`${directory}/${file}`, "general", slug))
      }
    }
    return result
  }
  if (source === "lucide") {
    const result: SourceIcon[] = []
    for (const file of await readdir(path.join(root, "icons"))) {
      if (!file.endsWith(".svg")) continue
      const metadata = JSON.parse(
        await readFile(
          path.join(root, "icons", file.replace(/\.svg$/, ".json")),
          "utf8"
        )
      )
      const categories = metadata.categories
      if (
        !Array.isArray(categories) ||
        !categories.length ||
        categories.some((c) => typeof c !== "string")
      )
        throw new Error(`Missing Lucide category: ${file}`)
      result.push(
        local("icons/" + file, [...categories].sort()[0], file.slice(0, -4))
      )
    }
    return result
  }
  if (source === "phosphor") {
    const categories = await phosphorCategories(cacheDir)
    const result: SourceIcon[] = []
    const files = await Promise.all(
      officialSources.phosphor.styles.map(async (weight) =>
        (await walkFiles(path.join(root, "SVGs", weight))).map(
          (file) => `${weight}/${file}`
        )
      )
    )
    for (const file of files.flat()) {
      if (!file.endsWith(".svg")) continue
      const [weight, filename, ...extra] = file.split("/")
      if (!filename || extra.length)
        throw new Error(`Unexpected Phosphor path: ${file}`)
      const slug = filename.slice(0, -4)
      const name =
        weight === "regular"
          ? slug
          : slug.replace(new RegExp(`-${weight}$`), "")
      // The homepage ZIP calls the regular book-open-user glyph book-user;
      // the fill weight and official core catalog use book-open-user.
      const category = categories.get(
        name === "book-user" ? "book-open-user" : name
      )
      if (!category) throw new Error(`Missing Phosphor category: ${name}`)
      result.push(local("SVGs/" + file, category, slug))
    }
    return result
  }
  return (await walkFiles(path.join(root, "flags")))
    .filter((file) => file.endsWith(".svg"))
    .map((file) => {
      const parts = file.slice(0, -4).split("/")
      if (source === "flag") {
        if (parts.length !== 2 || !["4x3", "1x1"].includes(parts[0]))
          throw new Error(`Unexpected flag path: ${file}`)
        return local(
          "flags/" + file,
          parts[0],
          parts[1] + (parts[0] === "1x1" ? "-square" : "")
        )
      }
      return local(
        "flags/" + file,
        parts.length > 1 ? directorySlug(parts[0]) : "flags",
        directorySlug(parts.join("-"))
      )
    })
}

export const phosphorMetadataRevision =
  "2b75f3ad12b420c9504ef05df8d2564a28f8500e"
async function phosphorCategories(cacheDir: string) {
  const base = `https://raw.githubusercontent.com/phosphor-icons/core/${phosphorMetadataRevision}/src/`
  const folder = path.join(
    cacheDir,
    `phosphor-catalog-${phosphorMetadataRevision}`
  )
  const [source, types] = await Promise.all([
    cachedText(base + "icons.ts", path.join(folder, "icons.ts")),
    cachedText(base + "types.ts", path.join(folder, "types.ts")),
  ])
  return parsePhosphorCategories(source, types)
}
export function parsePhosphorCategories(source: string, types: string) {
  // Treat upstream TypeScript as data. Do not import or execute downloaded code.
  const enumSource = types.match(/enum IconCategory\s*\{([\s\S]*?)\}/)?.[1]
  if (!enumSource) throw new Error("Missing Phosphor category enum.")
  const labels = new Map(
    [...enumSource.matchAll(/([A-Z_]+)\s*=\s*"([^"]+)"/g)].map((m) => [
      m[1],
      directorySlug(m[2]),
    ])
  )
  const categories = new Map<string, string>()
  for (const match of source.matchAll(
    /\bname:\s*"([^"]+)"[\s\S]*?\bcategories:\s*\[([^\]]*)\]/g
  )) {
    const names = [...match[2].matchAll(/IconCategory\.([A-Z_]+)/g)].map((m) =>
      labels.get(m[1])
    )
    if (!names.length || names.some((name) => !name))
      throw new Error(`Invalid Phosphor category: ${match[1]}`)
    categories.set(match[1], (names as string[]).sort()[0])
  }
  if (!categories.size) throw new Error("Empty Phosphor catalog.")
  return categories
}
