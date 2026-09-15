import {
  isElementData,
  isIconData,
  isIconSet,
  parseIconName,
} from "./sources.ts"
import { iconLoader } from "./compiled.ts"
import { createIconStore } from "./store.ts"
import type { Data, IconLoader, IconSet } from "./types.ts"

export {
  isElementData,
  isIconData,
  isIconSet,
  parseIconName,
  resolveIconSetData,
} from "./sources.ts"

// Explicit application registrations only. Async state lives in the same store engine.
/** Global source registry used by default imports and explicit registrations. */
export const registeredSources: Record<string, Data | IconSet> =
  Object.create(null)
export const registryStore = createIconStore({
  sources: registeredSources,
  api: iconLoader,
})
const sets = new Map<string, IconSet>()

/** Resolve bare icon names to provider-qualified names when registered with a set prefix. */
export function registeredName(name: string) {
  if (Object.hasOwn(registeredSources, name) || name.includes(":")) return name
  const prefix = [...sets.values()]
    .filter((set) => !set.provider)
    .map((set) => set.prefix)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => name.startsWith(prefix + "-"))
  return prefix ? prefix + ":" + name.slice(prefix.length + 1) : name
}

/** Register a single icon payload into the shared registry cache. */
export function addIconData(name: string, data: Data) {
  if (!isIconData(data) && !isElementData(data))
    throw new TypeError(`Icon ${name} must contain an SVG body.`)
  registeredSources[name] = data
  registryStore.invalidate(name)
}

/** Register a full icon set and invalidate matching cached keys for hot updates. */
export function addIconSet(data: IconSet) {
  if (!isIconSet(data))
    throw new TypeError("Icon set must contain a prefix and icons map.")
  sets.set(`${data.provider ?? ""}:${data.prefix}`, data)
  if (!data.provider) registeredSources[data.prefix] = data
  else {
    // Provider-qualified names cannot collide with another provider's set.
    for (const slug of [
      ...Object.keys(data.icons),
      ...Object.keys(data.aliases ?? {}),
    ]) {
      registeredSources[`@${data.provider}:${data.prefix}:${slug}`] = data
    }
  }
  registryStore.invalidate((name) => {
    const parsed = parseIconName(name)
    const direct = registeredSources[name]
    return (
      parsed?.prefix === data.prefix &&
      parsed.provider === (data.provider ?? "") &&
      (!direct || isIconSet(direct))
    )
  })
}

/** Read resolved icon data from registry cache; return null when not found. */
export function resolveIconData(name: string): Data | null {
  return getIconLoadState(name).data ?? null
}
export function getIconLoadState(name: string) {
  return registryStore.getState(registeredName(name))
}
export function subscribeIconData(name: string, listener: () => void) {
  return registryStore.subscribe(registeredName(name), listener)
}

/** Load an icon through a custom loader, while preserving registry-level invalidation. */
export function loadIconData(name: string, loader: IconLoader) {
  const key = registeredName(name)
  return registryStore.load(key, {
    loader: (_key, _parsed, request) =>
      loader(name, parseIconName(name), request),
  })
}

/** Clear one icon or flush all registry sources and set metadata. */
export function clearIconData(name?: string) {
  if (name !== undefined) {
    const key = registeredName(name)
    delete registeredSources[name]
    registryStore.invalidate(key)
    return
  }
  for (const key of Object.keys(registeredSources))
    delete registeredSources[key]
  sets.clear()
  registryStore.invalidate()
}
