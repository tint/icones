import { isIconData, isIconSet, resolveSetIcon } from "../data/icon-data.ts"
export { isIconData, isIconSet } from "../data/icon-data.ts"
import { isElementData } from "../data/elements.ts"
export { isElementData } from "../data/elements.ts"

import type {
  IconSet,
  ParsedIconName,
  Data,
  IconLoaderResult,
} from "./types.ts"

/** Resolve an icon name from a full icon set payload when prefix/provider match. */
export function resolveIconSetData(data: IconSet, name: string) {
  const parsedName = parseIconName(name)
  const iconName =
    parsedName &&
    parsedName.prefix === data.prefix &&
    parsedName.provider === (data.provider ?? "")
      ? parsedName.name
      : name

  return resolveSetIcon(data, iconName)
}

/** Parse user icon refs and keep provider-aware prefix/name fields. */
export function parseIconName(value: string): ParsedIconName | null {
  const parts = value.split(":")
  let provider = ""
  if (value.startsWith("@")) provider = parts.shift()!.slice(1)
  else if (parts.length === 3) provider = parts.shift()!
  if (parts.length === 1) {
    // Retain the legacy dashed spelling; bare names are never fetched implicitly.
    const dash = parts[0].indexOf("-")
    if (dash <= 0) return null
    parts.splice(0, 1, parts[0].slice(0, dash), parts[0].slice(dash + 1))
  }
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { provider, prefix: parts[0], name: parts[1] }
}

/** Convert loaded results from loaders into a canonical runtime data shape. */
export function toData(value: IconLoaderResult, name: string): Data | null {
  if (value == null) return null
  if (isElementData(value) || isIconData(value)) return value
  if (isIconSet(value)) return resolveIconSetData(value, name)
  throw new TypeError(`Invalid icon data for ${name}.`)
}
