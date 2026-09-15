import { variantAliases as tabler } from "../../../../packages/icons/tabler/manifest.json"
import { variantAliases as brand } from "../../../../packages/icons/brand/manifest.json"
import { variantAliases as bootstrap } from "../../../../packages/icons/bootstrap/manifest.json"
import { variantAliases as antd } from "../../../../packages/icons/antd/manifest.json"
import { variantAliases as phosphor } from "../../../../packages/icons/phosphor/manifest.json"
import { variantAliases as lucide } from "../../../../packages/icons/lucide/manifest.json"
import { variantAliases as huge } from "../../../../packages/icons/huge/manifest.json"

// Share generated metadata with URL compatibility; no second list of source styles.
const aliases: Record<string, Partial<Record<"outline" | "solid", string>>> = {
  tabler,
  brand,
  bootstrap,
  antd,
  phosphor,
  lucide,
  huge,
}

/** Accept old bookmarks/upstream names at the website boundary, then use canonical IDs. */
export function normalizeCatalogVariant(set: string, variant = "outline") {
  if (set === "flag") return variant
  const styles = Object.hasOwn(aliases, set) ? aliases[set]! : undefined
  if (!styles) return variant === "solid" ? "solid" : "outline"
  if (Object.hasOwn(styles, variant)) return variant
  // Phosphor used "filled" before its source spelling ("fill") became metadata.
  if (set === "phosphor" && variant === "filled") return "solid"
  return (
    Object.entries(styles).find(([, alias]) => alias === variant)?.[0] ??
    "outline"
  )
}
