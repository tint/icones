import {
  createIconApiLoader,
  isSymbolApi,
  mergeIconApi,
  resolveIconApi,
  type IconApi,
  type IconApiConfig,
} from "./loaders.ts"
import { resolveIconSymbol } from "./symbol.ts"
import { parseIconName, toData } from "./sources.ts"
import type { Data, IconLoader, IconLoadState, IconSources } from "./types.ts"

export type IconStoreOptions = {
  sources?: IconSources | readonly IconSources[]
  api?: IconApiConfig
  parent?: IconStore
  /** Serialized per-request data for hydration. Also subject to maxEntries. */
  initialData?: Readonly<Record<string, Data>>
  /** LRU capacity. Active entries and the current snapshot may temporarily exceed it. */
  maxEntries?: number
  ttl?: number
  missingTtl?: number
  concurrency?: number
  timeout?: number
}
type LoadOptions = { force?: boolean; loader?: IconLoader }
export type IconStore = {
  sources: readonly IconSources[]
  api: IconApiConfig | undefined
  getState(name: string): IconLoadState
  load(name: string, options?: LoadOptions): Promise<Data | null>
  retry(name: string): Promise<Data | null>
  invalidate(name?: string | ((name: string) => boolean)): void
  preload(names: readonly string[]): Promise<void>
  snapshot(): Record<string, Data>
  subscribe(name: string, listener: () => void): () => void
}
const idle: IconLoadState = { status: "idle" }
const deferred = Symbol("deferred source")

/** One store per SSR request or client application. Snapshot reads never run loaders. */
export function createIconStore(options: IconStoreOptions = {}): IconStore {
  // Validate numeric options first so invalid values fail fast at construction.
  for (const key of [
    "maxEntries",
    "concurrency",
    "timeout",
    "ttl",
    "missingTtl",
  ] as const) {
    const value = options[key]
    if (value === undefined) continue
    const minimum = key === "ttl" || key === "missingTtl" ? 0 : 1
    if (
      !Number.isFinite(value) ||
      value < minimum ||
      ((key === "maxEntries" || key === "concurrency") &&
        !Number.isInteger(value))
    )
      throw new RangeError(`Invalid icon store ${key}: ${value}`)
  }
  const local: readonly IconSources[] = options.sources
    ? Array.isArray(options.sources)
      ? options.sources
      : [options.sources as IconSources]
    : []
  const inherited = options.parent
  const delegate = options.api === undefined ? inherited : undefined
  const sources = [...local, ...(inherited?.sources ?? [])]
  const activeSources = delegate ? local : sources
  const api = mergeIconApi(inherited?.api, options.api)
  // Cache one loader per resolved API entry to reuse keepalive HTTP settings.
  const loaders = new Map<IconApi | undefined, IconLoader>()
  const loader: IconLoader = (name, parsed, request) => {
    const selected = resolveIconApi(api, name)
    let selectedLoader = loaders.get(selected)
    if (!selectedLoader) {
      selectedLoader = createIconApiLoader(
        isSymbolApi(selected) ? false : selected
      )
      loaders.set(selected, selectedLoader)
    }
    return selectedLoader(name, parsed, request)
  }
  const reference = (name: string) => {
    const selected = resolveIconApi(api, name)
    return isSymbolApi(selected) ? resolveIconSymbol(selected, name) : null
  }
  const maxEntries = Math.max(1, options.maxEntries ?? 512)
  const concurrency = Math.max(1, options.concurrency ?? 8)
  const states = new Map<string, { state: IconLoadState; expires: number }>()
  const requests = new Map<
    string,
    { promise: Promise<Data | null>; controller: AbortController }
  >()
  const listeners = new Map<string, Set<() => void>>()
  const queue: (() => void)[] = []
  let running = 0
  // Preload and cache initialData so first render can skip async resolution.
  for (const [name, data] of Object.entries(options.initialData ?? {})) {
    const resolved = toData(data, name)
    if (resolved)
      cache(name, { status: "loaded", data: resolved }, options.ttl ?? 300_000)
  }
  /** Drop unreferenced cache entries when the in-memory budget is exceeded. */
  function trim(current?: string) {
    for (const name of states.keys()) {
      if (states.size <= maxEntries) break
      if (name !== current && !listeners.has(name) && !requests.has(name))
        states.delete(name)
    }
  }
  /** Record state and expiration for stable reads during a render tick. */
  function cache(name: string, state: IconLoadState, ttl = Infinity) {
    states.delete(name)
    states.set(name, { state, expires: Date.now() + ttl })
    // Keep a synchronous result stable until its consumer can subscribe, even
    // when other mounted icons already occupy the entire cache capacity.
    trim(name)
    return state
  }
  function publish(name: string, state: IconLoadState, ttl = Infinity) {
    cache(name, state, ttl)
    listeners.get(name)?.forEach((listener) => listener())
  }
  /** Read one source entry by full name or by set fallback when name is namespaced. */
  function sourceValue(source: Exclude<IconSources, IconLoader>, name: string) {
    const parsed = parseIconName(name)
    const key = Object.hasOwn(source, name)
      ? name
      : name.includes(":")
        ? (parsed?.prefix ?? "")
        : ""
    return Object.hasOwn(source, key) ? source[key] : undefined
  }
  /** Probe all active sources and return deferred marker when async callbacks appear. */
  function probe(name: string) {
    for (const source of activeSources) {
      if (typeof source === "function") return deferred
      const value = sourceValue(source, name)
      if (typeof value === "function") return deferred
      const data = toData(value, name)
      if (data) return data
    }
    return null
  }
  /** Resolve current state from cache/probe/delegate/reference without mutating listeners. */
  function getState(name: string): IconLoadState {
    const cached = states.get(name)
    if (cached) {
      states.delete(name)
      states.set(name, cached)
      return cached.state
    }
    let data: ReturnType<typeof probe>
    try {
      data = probe(name)
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause))
      return cache(name, { status: "error", error }, 0)
    }
    if (data === deferred) return idle
    if (!data) {
      if (delegate) return delegate.getState(name)
      const symbol = reference(name)
      if (!symbol) return idle
      return cache(name, { status: "referenced", ...symbol })
    }
    return cache(name, { status: "loaded", data })
  }
  /** Resolve icon data from active sources in order, supporting sync and async sources. */
  async function resolveSources(name: string, signal: AbortSignal) {
    for (const source of activeSources) {
      signal.throwIfAborted()
      const value =
        typeof source === "function"
          ? await source(name, parseIconName(name), { signal })
          : sourceValue(source, name)
      const data = toData(
        typeof value === "function" ? await value() : value,
        name
      )
      if (data) return data
    }
    return null
  }
  /** Clear cache, requests and subscribers for one key or a predicate match set. */
  function invalidate(name?: string | ((name: string) => boolean)) {
    const names =
      typeof name !== "string"
        ? new Set([...states.keys(), ...requests.keys(), ...listeners.keys()])
        : new Set([name])
    for (const key of names) {
      if (typeof name === "function" && !name(key)) continue
      const request = requests.get(key)
      requests.delete(key)
      request?.controller.abort()
      states.delete(key)
      listeners.get(key)?.forEach((listener) => listener())
    }
  }
  function load(
    name: string,
    loadOptions: LoadOptions = {}
  ): Promise<Data | null> {
    if (loadOptions.force) invalidate(name)
    const pending = requests.get(name)
    if (pending) return pending.promise
    const state = getState(name)
    // Linked symbols can render immediately without triggering a fetch step.
    if (state.href && !loadOptions.loader) return Promise.resolve(null)
    const cached = states.get(name)
    if (delegate && !cached && probe(name) === null && !loadOptions.loader)
      return delegate.load(name, loadOptions)
    if (!loadOptions.force && (!cached || cached.expires > Date.now())) {
      if (state.data) return Promise.resolve(state.data)
      if (state.status === "missing") return Promise.resolve(null)
    }
    if (
      delegate &&
      state.status !== "error" &&
      probe(name) === null &&
      !loadOptions.loader
    )
      return delegate.load(name, loadOptions)
    const controller = new AbortController()
    const request = {
      controller,
      promise: null as unknown as Promise<Data | null>,
    }
    requests.set(name, request)
    request.promise = new Promise<Data | null>((resolve, reject) => {
      let started = false
      const run = () => {
        if (controller.signal.aborted) return
        started = true
        running++
        const timer = setTimeout(
          () => controller.abort(new Error(`Icon request timed out: ${name}`)),
          options.timeout ?? 15_000
        )
        const abort = () => reject(controller.signal.reason)
        controller.signal.addEventListener("abort", abort, { once: true })
        void (async () => {
          try {
            const data = await resolveSources(name, controller.signal)
            controller.signal.throwIfAborted()
            resolve(
              data ??
                (delegate && !loadOptions.loader
                  ? await delegate.load(name, loadOptions)
                  : toData(
                      await (loadOptions.loader ?? loader)(
                        name,
                        parseIconName(name),
                        { signal: controller.signal }
                      ),
                      name
                    ))
            )
          } catch (error) {
            reject(error)
          }
        })()
        // Release a slot even when a custom loader ignores cancellation.
        void request.promise
          .finally(() => {
            clearTimeout(timer)
            controller.signal.removeEventListener("abort", abort)
            running--
            queue.shift()?.()
          })
          .catch(() => {})
      }
      controller.signal.addEventListener(
        "abort",
        () => {
          if (started) return
          const index = queue.indexOf(run)
          if (index >= 0) queue.splice(index, 1)
          reject(controller.signal.reason)
        },
        { once: true }
      )
      // Defer scheduling to allow repeated load calls in the same tick to coalesce.
      queueMicrotask(() => {
        if (controller.signal.aborted) return
        if (running < concurrency) run()
        else queue.push(run)
      })
    })
      .then((data) => {
        const symbol = !data && !loadOptions.loader ? reference(name) : null
        if (requests.get(name) === request)
          publish(
            name,
            data
              ? { status: "loaded", data }
              : symbol
                ? { status: "referenced", ...symbol }
                : { status: "missing" },
            data ? (options.ttl ?? 300_000) : (options.missingTtl ?? 30_000)
          )
        return data
      })
      .catch((cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause))
        if (requests.get(name) === request)
          publish(name, { status: "error", error }, 0)
        throw error
      })
      .finally(() => {
        if (requests.get(name) === request) requests.delete(name)
        trim()
      })
    publish(name, { status: "loading" })
    return request.promise
  }
  return {
    sources,
    api,
    getState,
    load,
    retry: (name) => load(name, { force: true }),
    invalidate,
    async preload(names) {
      await Promise.all(names.map((name) => load(name)))
    },
    snapshot() {
      // Merge parent snapshot entries with locally loaded data for hydration handoff.
      const parentData = Object.entries(delegate?.snapshot() ?? {}).filter(
        ([name]) => {
          try {
            return probe(name) === null
          } catch {
            return false
          }
        }
      )
      return Object.fromEntries([
        ...parentData,
        ...[...states].flatMap(([name, { state }]) =>
          state.data ? [[name, state.data] as const] : []
        ),
      ])
    },
    subscribe(name, listener) {
      const subscribers = listeners.get(name) ?? new Set<() => void>()
      listeners.set(name, subscribers)
      subscribers.add(listener)
      const unsubscribeParent = delegate?.subscribe(name, listener)
      return () => {
        unsubscribeParent?.()
        subscribers.delete(listener)
        if (!subscribers.size) listeners.delete(name)
        trim()
      }
    },
  }
}
export { toData } from "./sources.ts"
