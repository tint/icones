import { readIconSet } from "../data/icon-data.ts"

import {
  isElementData,
  isIconData,
  isIconSet,
  parseIconName,
  resolveIconSetData,
} from "./sources.ts"
import type { IconLoader, IconLoaderResult, ParsedIconName } from "./types.ts"
import {
  mergeSetOptions,
  resolveSetOption,
  type IconSetMap,
  type IconSetOptions,
} from "../options/set-options.ts"

/** Fetch call contract only; runtime-specific properties (e.g. Bun.preconnect) are not required. */
export type IconFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

export type IconRequestOptions = {
  baseUrl?: string
  fetch?: IconFetch
  requestInit?: RequestInit
}

export type IconesIconLoaderOptions = Omit<IconRequestOptions, "baseUrl"> & {
  /** Domain hosting one static deployment per icon set. */
  domain?: string
}

/** Default first-party static icon service used by the framework adapters. */
export const defaultIconServiceDomain = "icones.go-slim.dev"

export type IconApiOptions = IconRequestOptions & {
  default?: never
  type?: "fetch"
  /** Override the complete URL, including query parameters. */
  url?: (name: string, parsed: ParsedIconName | null) => string | URL
  /** Adapt an application-specific response envelope to icon data. */
  transform?: (
    json: unknown,
    name: string
  ) => IconLoaderResult | Promise<IconLoaderResult>
}
export type IconSymbolApiOptions = {
  default?: never
  type: "symbol"
  /** Same-origin protocol endpoint. Defaults to /icons. */
  baseUrl?: string
  /** Pure URL builder; include the single symbol's fragment ID. */
  url?: (name: string, parsed: ParsedIconName | null) => string | URL
  /** Override built-in name-based viewports (24 × 24, or native Flag coordinates). */
  viewBox?: string
}
export type IconFetchApi = false | string | IconApiOptions | IconLoader
export type IconApi = IconFetchApi | IconSymbolApiOptions
/** A shared API or per-set APIs, with `default` for unmatched sets. */
export type IconApiConfig =
  | IconApi
  | (IconSetMap<IconApi> &
      Partial<
        Record<
          Exclude<keyof IconApiOptions | keyof IconSymbolApiOptions, "default">,
          never
        >
      >)

/** Determine whether an API config is a shared map or a direct API value. */
function isIconApiMap(
  api: IconSetOptions<IconApi>
): api is IconSetMap<IconApi> {
  if (typeof api !== "object" || api === null) return false
  // API option keys are reserved so legacy callbacks retain contextual typing.
  if (Object.hasOwn(api, "default")) return true
  return Object.entries(api).some(([key, value]) => {
    switch (key) {
      case "type":
        return value !== undefined && value !== "fetch" && value !== "symbol"
      case "baseUrl":
      case "viewBox":
        return value !== undefined && typeof value !== "string"
      case "url":
      case "fetch":
      case "transform":
        return value !== undefined && typeof value !== "function"
      case "requestInit":
        return (
          value !== undefined && (typeof value !== "object" || value === null)
        )
      default:
        return true
    }
  })
}

export function mergeIconApi(
  parent: IconApiConfig | undefined,
  next: IconApiConfig | undefined
): IconApiConfig | undefined {
  return mergeSetOptions(parent, next, isIconApiMap) as
    | IconApiConfig
    | undefined
}

export function resolveIconApi(
  api: IconApiConfig | undefined,
  name: string
): IconApi | undefined {
  return resolveSetOption(api, parseIconName(name)?.prefix, isIconApiMap)
}

/** Check whether a resolved API entry points to an external symbol sprite. */
export function isSymbolApi(
  api: IconApi | undefined
): api is IconSymbolApiOptions {
  return typeof api === "object" && api.type === "symbol"
}

/** Build a fetch-based icon loader from API option object, URL or callback. */
export function createIconApiLoader(api: IconFetchApi = false): IconLoader {
  if (api === false) return () => null
  if (typeof api === "function") return api
  const options = typeof api === "string" ? { baseUrl: api } : api
  // Explicit fetch configurations use the local collection protocol by default.
  // No configuration ever implies a third-party endpoint.
  const baseUrl = trimTrailingSlash(options.baseUrl ?? "/icons")
  return async (name, parsed, request) => {
    if (!options.url && (!name.includes(":") || !parsed || parsed.provider))
      return null
    const resolved = parsed ?? parseIconName(name)
    const url = options.url
      ? options.url(name, parsed)
      : `${baseUrl}/${encodeURIComponent(resolved!.prefix)}.json?icons=${encodeURIComponent(resolved!.name)}`
    const response = await (options.fetch ?? globalThis.fetch)(url, {
      ...options.requestInit,
      signal:
        request?.signal && options.requestInit?.signal
          ? AbortSignal.any([request.signal, options.requestInit.signal])
          : (request?.signal ?? options.requestInit?.signal),
    })
    if (response.status === 404) return null
    if (!response.ok)
      throw new Error(`Unable to load icon ${name} (${response.status}).`)
    const json: unknown = await response.json()
    const result = options.transform
      ? await options.transform(json, name)
      : parseLoaderResult(json, name)
    // Keep only the requested icon, even if the endpoint returns a whole set.
    return !options.url && isIconSet(result)
      ? resolveIconSetData(result, name)
      : result
  }
}

export type FileIconLoaderOptions = {
  baseUrl?: string
  extension?: string
  fetch?: IconFetch
}

/** Opt in to mirrored static assets: <base>/<set>/data/<slug>.json. */
export function createStaticIconLoader(
  options: IconRequestOptions | string = {}
): IconLoader {
  const normalized =
    typeof options === "string" ? { baseUrl: options } : options
  const base = trimTrailingSlash(normalized.baseUrl ?? "/icons")
  const load = createIconApiLoader({
    ...normalized,
    url: (_name, parsed) =>
      `${base}/${encodeURIComponent(parsed!.prefix)}/data/${encodeURIComponent(parsed!.name)}.json`,
  })
  return (name, parsed, request) => {
    const resolved = parsed ?? parseIconName(name)
    const segment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (
      !name.includes(":") ||
      !resolved ||
      resolved.provider ||
      !segment.test(resolved.prefix) ||
      !segment.test(resolved.name)
    )
      return null
    return load(name, resolved, request)
  }
}

/** Load <set>:<name> from https://<set>.<domain>/data/<name>.json. */
export function createIconesIconLoader(
  options: IconesIconLoaderOptions = {}
): IconLoader {
  const domain = options.domain ?? defaultIconServiceDomain
  if (
    domain.length > 253 ||
    !domain.includes(".") ||
    domain
      .split(".")
      .some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  )
    throw new TypeError(`Invalid icon service domain: ${domain}`)
  const load = createIconApiLoader({
    fetch: options.fetch,
    requestInit: options.requestInit,
    url: (_name, parsed) =>
      `https://${parsed!.prefix}.${domain}/data/${encodeURIComponent(parsed!.name)}.json`,
  })
  return (name, parsed, request) => {
    const resolved = parsed ?? parseIconName(name)
    const segment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (
      !name.includes(":") ||
      !resolved ||
      resolved.provider ||
      !segment.test(resolved.prefix) ||
      !segment.test(resolved.name)
    )
      return null
    return load(name, resolved, request)
  }
}

export function createFileIconLoader(
  options: FileIconLoaderOptions | string = {}
): IconLoader {
  const normalizedOptions =
    typeof options === "string" ? { baseUrl: options } : options
  const baseUrl = trimTrailingSlash(normalizedOptions.baseUrl ?? "/icons")
  const extension = normalizedOptions.extension ?? ".json"
  const request = normalizedOptions.fetch ?? globalThis.fetch

  return async (name, _parsed, context) => {
    const response = await request(
      `${baseUrl}/${encodeURIComponent(name)}${extension}`,
      { signal: context?.signal }
    )

    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Unable to load icon ${name} (${response.status}).`)
    }

    return parseLoaderResult(await response.json(), name)
  }
}

/** Unconfigured adapters fall back to the first-party per-collection service. */
export const defaultIconLoader: IconLoader = createIconesIconLoader()

/** Validate file/network responses and keep only supported payload shapes. */
function parseLoaderResult(value: unknown, name: string): IconLoaderResult {
  if (isElementData(value)) return value
  if (isIconData(value)) return value
  if (isIconSet(value)) {
    return readIconSet(value)
  }

  throw new Error(`Icon data file for ${name} is invalid.`)
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}
