import type { IconSource } from "@icones/core/resource-types"
import { sources as tablerSources } from "../../../../packages/icons/tabler/manifest.json"
import tabler from "../../../../packages/icons/tabler/license.txt?raw"
import { sources as brandSources } from "../../../../packages/icons/brand/manifest.json"
import brand from "../../../../packages/icons/brand/license.txt?raw"
import { sources as bootstrapSources } from "../../../../packages/icons/bootstrap/manifest.json"
import bootstrap from "../../../../packages/icons/bootstrap/license.txt?raw"
import { sources as antdSources } from "../../../../packages/icons/antd/manifest.json"
import antd from "../../../../packages/icons/antd/license.txt?raw"
import { sources as phosphorSources } from "../../../../packages/icons/phosphor/manifest.json"
import phosphor from "../../../../packages/icons/phosphor/license.txt?raw"
import { sources as lucideSources } from "../../../../packages/icons/lucide/manifest.json"
import lucide from "../../../../packages/icons/lucide/license.txt?raw"
import { sources as hugeSources } from "../../../../packages/icons/huge/manifest.json"
import huge from "../../../../packages/icons/huge/license.txt?raw"
import { sources as flagSources } from "../../../../packages/icons/flag/manifest.json"
import flag from "../../../../packages/icons/flag/license.txt?raw"

const collections: Record<
  string,
  { sources: Record<string, IconSource>; license: string }
> = {
  tabler: { sources: tablerSources, license: tabler },
  brand: { sources: brandSources, license: brand },
  bootstrap: { sources: bootstrapSources, license: bootstrap },
  antd: { sources: antdSources, license: antd },
  phosphor: { sources: phosphorSources, license: phosphor },
  lucide: { sources: lucideSources, license: lucide },
  huge: { sources: hugeSources, license: huge },
  flag: { sources: flagSources, license: flag },
}

export function getIconSource(prefix: string, variant?: string) {
  if (
    !["hugeicons", "circle-flags"].includes(prefix) &&
    !Object.hasOwn(collections, prefix)
  )
    return undefined
  const collection =
    collections[
      prefix === "hugeicons"
        ? "huge"
        : prefix === "circle-flags"
          ? "flag"
          : prefix
    ]
  if (!collection) return undefined
  const sourceKey =
    prefix === "circle-flags" || (prefix === "flag" && variant === "circle")
      ? "circle-flags"
      : prefix === "huge"
        ? "hugeicons"
        : prefix
  const source =
    collection.sources[sourceKey] ?? Object.values(collection.sources)[0]
  if (!source) return undefined
  return formatSource(source, collection.license, sourceKey)
}

/** Keep every upstream notice, including both sources in the merged Flag set. */
export function getCollectionSources(prefix: string) {
  if (!Object.hasOwn(collections, prefix)) return []
  const collection = collections[prefix]!
  return Object.entries(collection.sources).map(([id, source]) =>
    formatSource(source, collection.license, id)
  )
}

function formatSource(source: IconSource, combined: string, sourceKey: string) {
  const licenseText = combined.startsWith("===== ")
    ? (combined
        .split("===== " + sourceKey + " =====\n\n")[1]
        ?.split("\n\n===== ")[0] ?? combined)
    : combined
  return {
    id: sourceKey,
    url: source.url,
    revision: source.revision ?? String(source.snapshot ?? ""),
    notice: source.distributionNotice,
    licenseText,
    licenseName:
      licenseText.split(/\r?\n/)[0]?.replace(/^#\s*/, "") ?? "See source",
    importedAt: source.importedAt?.slice(0, 10) ?? "",
  }
}
