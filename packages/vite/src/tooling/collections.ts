import {
  createIconManifest,
  serializeManifest,
  type ManifestEntry,
  type IconManifest,
} from "@icones/core/manifest"
import { updateIconManifest } from "../server/manifest.ts"

type CollectionStyles = {
  outline: { alias: string }
  solid?: { alias: string; pattern: RegExp }
}

/** Current collection contracts, not a universal list of possible icon styles. */
export const collectionStyles: Readonly<Record<string, CollectionStyles>> = {
  tabler: {
    outline: { alias: "outline" },
    solid: { alias: "filled", pattern: /-filled$/ },
  },
  brand: {
    outline: { alias: "outline" },
    solid: { alias: "filled", pattern: /-filled$/ },
  },
  bootstrap: {
    outline: { alias: "outline" },
    // Upstream places fill both at the end and inside names, e.g. person-fill-add.
    solid: { alias: "fill", pattern: /(?:^|-)fill(?:-|$)/ },
  },
  antd: {
    outline: { alias: "outlined" },
    solid: { alias: "filled", pattern: /-filled$/ },
  },
  phosphor: {
    outline: { alias: "regular" },
    solid: { alias: "fill", pattern: /-fill$/ },
  },
  lucide: { outline: { alias: "outline" } },
  huge: { outline: { alias: "stroke-rounded" } },
}

/** Allowed shapes/aspect ratios, not a presentation order. */
const flagVariants = new Set(["1x1", "4x3", "circle"])

/** Reject excluded weights instead of accidentally classifying them as outline. */
export function supportsCollectionIcon(prefix: string, slug: string) {
  if (prefix === "phosphor") return !/-(bold|duotone|light|thin)$/.test(slug)
  if (prefix === "antd") return !slug.endsWith("-twotone")
  return true
}

/** Naming conventions are used only at import time; readers use the manifest. */
export function collectionEntry(
  prefix: string,
  category: string,
  slug: string
): ManifestEntry {
  if (prefix === "circle-flags")
    return {
      prefix: "flag",
      category,
      slug: slug + "-circle",
      variant: "circle",
    }
  if (prefix === "flag")
    return {
      prefix,
      category: category === "1x1" || category === "4x3" ? "flags" : category,
      slug,
      variant: slug.endsWith("-circle")
        ? "circle"
        : slug.endsWith("-square")
          ? "1x1"
          : "4x3",
    }
  if (prefix === "hugeicons") prefix = "huge"
  if (!supportsCollectionIcon(prefix, slug))
    throw new TypeError(`Unsupported collection style: ${prefix}:${slug}`)
  const styles = Object.hasOwn(collectionStyles, prefix)
    ? collectionStyles[prefix]
    : undefined
  // Unknown collections retain the generic group; never infer styles from global suffixes.
  const variant = styles?.solid?.pattern.test(slug) ? "solid" : "outline"
  return {
    prefix,
    category,
    slug,
    variant,
    variantAlias: styles?.[variant]?.alias ?? variant,
  }
}

export function createCollectionManifest(prefix: string): IconManifest {
  // Initialize a fresh empty manifest with versioning and known aliases.
  return {
    ...createIconManifest(prefix),
    ...(Object.hasOwn(collectionStyles, prefix)
      ? {
          variantAliases: Object.fromEntries(
            Object.entries(collectionStyles[prefix]!).map(
              ([variant, style]) => [variant, style.alias]
            )
          ),
        }
      : {}),
    ...(prefix === "flag"
      ? { aliases: { "circle-flags": { suffix: "-circle" } } }
      : {}),
    ...(prefix === "huge" ? { aliases: { hugeicons: { suffix: "" } } } : {}),
  }
}

export function serializeCollectionManifest(manifest: IconManifest) {
  for (const variant of Object.keys(manifest.variants))
    assertCollectionVariant(manifest.prefix, variant)
  return serializeManifest(manifest)
}

export function updateCollectionManifest(root: string, entry: ManifestEntry) {
  assertCollectionVariant(entry.prefix, entry.variant)
  const styles = Object.hasOwn(collectionStyles, entry.prefix)
    ? collectionStyles[entry.prefix]
    : undefined
  return updateIconManifest(
    root,
    {
      ...entry,
      ...(styles
        ? { variantAlias: styles[entry.variant as "outline" | "solid"]!.alias }
        : {}),
    },
    {
      create: createCollectionManifest,
    }
  )
}

function assertCollectionVariant(prefix: string, variant: string) {
  const styles = Object.hasOwn(collectionStyles, prefix)
    ? collectionStyles[prefix]
    : undefined
  const supported =
    prefix === "flag"
      ? flagVariants.has(variant)
      : variant === "outline" ||
        (variant === "solid" && (!styles || !!styles.solid))
  if (!supported)
    throw new TypeError(`Unsupported collection variant: ${prefix}/${variant}`)
}
