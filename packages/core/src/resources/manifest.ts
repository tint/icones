import type { IconManifest, ManifestEntry } from "./types.ts"
export type { IconSource, IconManifest, ManifestEntry } from "./types.ts"

const segment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

export function readIconManifest(
  value: unknown,
  prefix?: string
): IconManifest {
  // Validate versioned manifest schema before any downstream catalog reads.
  if (
    !object(value) ||
    value.version !== 1 ||
    typeof value.prefix !== "string" ||
    !segment.test(value.prefix) ||
    (prefix !== undefined && value.prefix !== prefix) ||
    !object(value.variants)
  )
    throw new TypeError(`Invalid icon manifest: ${prefix ?? "unknown"}`)
  const names = new Set<string>()
  if (value.variantAliases !== undefined) {
    if (
      !object(value.variantAliases) ||
      Object.entries(value.variantAliases).some(
        ([variant, alias]) =>
          !["outline", "solid"].includes(variant) ||
          typeof alias !== "string" ||
          !segment.test(alias)
      ) ||
      new Set(Object.values(value.variantAliases)).size !==
        Object.keys(value.variantAliases).length
    )
      throw new TypeError("Invalid manifest variant aliases.")
  }
  for (const [variant, categories] of Object.entries(value.variants)) {
    if (!segment.test(variant) || !object(categories))
      throw new TypeError("Invalid manifest variant.")
    for (const [category, files] of Object.entries(categories)) {
      if (
        !segment.test(category) ||
        !object(files) ||
        !Array.isArray(files.json) ||
        !Array.isArray(files.svg)
      )
        throw new TypeError("Invalid manifest category.")
      const json = files.json as unknown[]
      const svg = files.svg as unknown[]
      if (json.length !== svg.length)
        throw new TypeError("Manifest JSON/SVG inventory must match.")
      const symbols = new Set(svg)
      for (const file of json) {
        if (
          typeof file !== "string" ||
          !file.endsWith(".json") ||
          !segment.test(file.slice(0, -5))
        )
          throw new TypeError("Manifest filenames must be flat icon slugs.")
        const slug = file.slice(0, -5)
        if (names.has(slug))
          throw new TypeError(
            `Duplicate manifest icon: ${value.prefix}:${slug}`
          )
        if (!symbols.delete(slug + ".svg"))
          throw new TypeError(`Missing manifest symbol: ${slug}`)
        names.add(slug)
      }
      if (symbols.size)
        throw new TypeError("Invalid manifest symbol inventory.")
    }
  }
  if (value.aliases !== undefined) {
    if (!object(value.aliases)) throw new TypeError("Invalid manifest aliases.")
    for (const [alias, rule] of Object.entries(value.aliases))
      if (
        !segment.test(alias) ||
        alias === value.prefix ||
        !object(rule) ||
        typeof rule.suffix !== "string" ||
        (rule.suffix !== "" && !/^-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.suffix))
      )
        throw new TypeError("Invalid manifest alias rule.")
  }
  if (
    value.sources !== undefined &&
    (!object(value.sources) ||
      Object.entries(value.sources).some(
        ([key, source]) =>
          !segment.test(key) ||
          !object(source) ||
          typeof source.url !== "string"
      ))
  )
    throw new TypeError("Invalid manifest sources.")
  return value as IconManifest
}

export function manifestEntries(manifest: IconManifest): ManifestEntry[] {
  // Expand compact manifest variant/category groups into normalized record rows.
  return Object.entries(manifest.variants).flatMap(([variant, categories]) =>
    Object.entries(categories).flatMap(([category, files]) =>
      files.json.map((file) => ({
        prefix: manifest.prefix,
        slug: file.slice(0, -5),
        variant,
        ...(Object.hasOwn(manifest.variantAliases ?? {}, variant)
          ? {
              variantAlias:
                manifest.variantAliases![variant as "outline" | "solid"],
            }
          : {}),
        category,
      }))
    )
  )
}

export function createIconManifest(prefix: string): IconManifest {
  return { version: 1, prefix, variants: Object.create(null) }
}

export function addManifestEntry(manifest: IconManifest, entry: ManifestEntry) {
  if (
    manifest.prefix !== entry.prefix ||
    ![entry.prefix, entry.slug, entry.variant, entry.category].every((part) =>
      segment.test(part)
    ) ||
    (entry.variantAlias !== undefined &&
      (!["outline", "solid"].includes(entry.variant) ||
        !segment.test(entry.variantAlias)))
  )
    throw new TypeError("Invalid manifest entry.")
  if (entry.variantAlias !== undefined) {
    manifest.variantAliases = {
      ...manifest.variantAliases,
      [entry.variant]: entry.variantAlias,
    }
  }
  // Updating an icon can move its metadata without moving its files.
  for (const categories of Object.values(manifest.variants)) {
    for (const files of Object.values(categories)) {
      files.json = files.json.filter((file) => file !== entry.slug + ".json")
      files.svg = files.svg.filter((file) => file !== entry.slug + ".svg")
    }
  }
  const categories = Object.hasOwn(manifest.variants, entry.variant)
    ? manifest.variants[entry.variant]!
    : (manifest.variants[entry.variant] = Object.create(null))
  const files = Object.hasOwn(categories, entry.category)
    ? categories[entry.category]!
    : (categories[entry.category] = { json: [], svg: [] })
  files.json.push(entry.slug + ".json")
  files.svg.push(entry.slug + ".svg")
}

export function serializeManifest(
  manifest: IconManifest,
  variantOrder: readonly string[] = []
) {
  // Stable output ordering keeps diffs minimal and ensures deterministic caching.
  const order = variantOrder
  const variants = Object.fromEntries(
    Object.entries(manifest.variants)
      .sort(
        ([a], [b]) =>
          (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) -
            (order.indexOf(b) < 0 ? 99 : order.indexOf(b)) || a.localeCompare(b)
      )
      .map(([variant, categories]) => [
        variant,
        Object.fromEntries(
          Object.entries(categories)
            .filter(([, files]) => files.json.length)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, files]) => [
              category,
              { json: [...files.json].sort(), svg: [...files.svg].sort() },
            ])
        ),
      ])
      .filter(([, categories]) => Object.keys(categories).length)
  )
  return (
    JSON.stringify(
      readIconManifest({
        ...manifest,
        variants,
        ...(manifest.variantAliases
          ? {
              variantAliases: Object.fromEntries(
                Object.entries(manifest.variantAliases).sort(([a], [b]) =>
                  a.localeCompare(b)
                )
              ),
            }
          : {}),
      }),
      null,
      2
    ) + "\n"
  )
}
