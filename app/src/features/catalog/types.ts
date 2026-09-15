import type { CatalogIcon as ProtocolIcon } from "./protocol.ts"

export type CatalogIcon = ProtocolIcon & { slug: string }
export type CatalogCategory = { id: string; category: string }
// Membership rules only; catalog facets derive their order from actual IDs.
export const flagVariants = ["1x1", "4x3", "circle"] as const

const excludedSets: string[] = JSON.parse(
  import.meta.env?.VITE_ICON_EXCLUDED_COLLECTIONS ?? "[]"
)
export const publicSets = (
  [
    "tabler",
    "brand",
    "bootstrap",
    "antd",
    "phosphor",
    "lucide",
    "huge",
    "flag",
  ] as const
).filter((set) => !excludedSets.includes(set))

/** Browser groups can combine collections without renaming their source data. */
export function mergeCatalogSets(
  sets: readonly { id: string; count: number }[]
) {
  const counts = new Map<string, number>()
  for (const set of sets) {
    const id =
      set.id === "circle-flags"
        ? "flag"
        : set.id === "hugeicons"
          ? "huge"
          : set.id
    if ((publicSets as readonly string[]).includes(id))
      counts.set(id, (counts.get(id) ?? 0) + set.count)
  }
  return publicSets.flatMap((id) =>
    counts.has(id) ? [{ id, count: counts.get(id)! }] : []
  )
}
export function categoryLabel(value: string) {
  return value.replace(
    /(^|-)([a-z])/g,
    (_, before: string, letter: string) =>
      (before ? " " : "") + letter.toUpperCase()
  )
}

/** Sort/filter with the canonical ID; the server/static catalog supplies its alias. */
export function catalogVariantLabel(variant: string, alias?: string) {
  return categoryLabel(alias ?? variant)
}
export function groupIcons(icons: readonly ProtocolIcon[]) {
  const groups = new Map<
    string,
    { category: CatalogCategory; icons: CatalogIcon[] }
  >()
  for (const icon of icons) {
    const isCircleFlag = icon.prefix === "circle-flags"
    const id = isCircleFlag
      ? "flag/circle"
      : `${icon.prefix}/${icon.variant ? icon.variant + "/" : ""}${icon.category}`
    const group = groups.get(id) ?? {
      category: {
        id,
        // Flag variants are selected in the toolbar, not repeated as categories.
        category:
          (icon.prefix === "flag" &&
            ["flags", "1x1", "4x3"].includes(icon.category)) ||
          isCircleFlag
            ? "Flag"
            : `${categoryLabel(icon.prefix)} · ${categoryLabel(icon.category)}`,
      },
      icons: [],
    }
    group.icons.push({ ...icon, slug: icon.name.slice(icon.prefix.length + 1) })
    groups.set(id, group)
  }
  return [...groups.values()].sort((a, b) =>
    a.category.id.localeCompare(b.category.id)
  )
}
