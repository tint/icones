import { isIconData } from "./sources.ts"
import { registeredName, registeredSources, registryStore } from "./registry.ts"
import { iconLoader, resolve } from "./compiled.ts"
import {
  createIconStore,
  type IconStore,
  type IconStoreOptions,
} from "./store.ts"
import { mergeIconApi } from "./loaders.ts"
import {
  defaultIconAppearance,
  mergeIconAppearance,
  selectIconSource,
  createIconSourceValidator,
  type IconAppearance,
  type IconOptions,
} from "./presentation.ts"
import type { IconLoadState } from "./types.ts"

export type IconScopeOptions = IconAppearance &
  Pick<IconStoreOptions, "sources" | "api"> & { store?: IconStore }
export type IconScope = {
  readonly store: IconStore
  readonly appearance: IconAppearance
}
type ScopeInputs = {
  sources: IconScopeOptions["sources"]
  api: IconScopeOptions["api"]
  parent?: IconStore
  store?: IconStore
}
const inputs = new WeakMap<IconScope, ScopeInputs>()
const defaultScopes = new WeakSet<IconScope>()

/** Explicit scopes isolate SSR requests. Size-only child scopes share the parent's store. */
export function createIconScope(
  options: IconScopeOptions = {},
  parent?: IconScope,
  previous?: IconScope
): IconScope {
  const before = previous && inputs.get(previous)
  const same =
    before &&
    before.sources === options.sources &&
    before.api === options.api &&
    before.parent === parent?.store &&
    before.store === options.store
  const store =
    options.store ??
    (same
      ? previous!.store
      : options.sources === undefined && options.api === undefined && parent
        ? parent.store
        : createIconStore({
            sources:
              options.sources ?? (parent ? undefined : registeredSources),
            parent: parent?.store,
            api: mergeIconApi(parent ? undefined : iconLoader, options.api),
          }))
  const inherited = parent?.appearance ?? defaultIconAppearance
  const scope: IconScope = {
    store,
    appearance: mergeIconAppearance(inherited, options),
  }
  inputs.set(scope, {
    sources: options.sources,
    api: options.api,
    parent: parent?.store,
    store: options.store,
  })
  if (
    parent &&
    defaultScopes.has(parent) &&
    options.sources === undefined &&
    options.api === undefined &&
    options.store === undefined
  )
    defaultScopes.add(scope)
  return scope
}

/** Memoize a provider's store while its presentation options change. */
export function createIconScopeResolver() {
  let previous: IconScope | undefined
  return (options: IconScopeOptions = {}, parent?: IconScope) =>
    (previous = createIconScope(options, parent, previous))
}

export function defaultIconScope(): IconScope {
  const scope: IconScope =
    typeof window === "undefined"
      ? createIconScope()
      : { store: registryStore, appearance: defaultIconAppearance }
  defaultScopes.add(scope)
  return scope
}

const missing: IconLoadState = { status: "missing" }
export type IconController = {
  getState(): IconLoadState
  update(props: IconOptions, scope?: IconScope): void
  subscribe(listener: () => void): () => void
  load(): Promise<IconLoadState>
  destroy(): void
}

/** No subscriptions or requests until subscribe/load. Safe to instantiate during SSR. */
export function createIconController(
  initial: IconOptions,
  initialScope = defaultIconScope()
): IconController {
  let props = initial
  let scope = initialScope
  let store = scope.store
  let ownedStore: IconStore | undefined
  let loader = props.loader
  let sourceStore = scope.store
  let name: string | undefined
  let staticState: IconLoadState | undefined
  let unsubscribe: (() => void) | undefined
  let version = 0
  let destroyed = false
  const listeners = new Set<() => void>()
  const validateSources = createIconSourceValidator()
  const getState = () => staticState ?? (name ? store.getState(name) : missing)

  /** Rebuild selection, owned store and static inline state for latest props/scope. */
  function prepare() {
    validateSources(props)
    if (
      props.loader !== loader ||
      scope.store !== sourceStore ||
      (props.loader && !ownedStore)
    ) {
      ownedStore?.invalidate()
      loader = props.loader
      sourceStore = scope.store
      ownedStore = loader
        ? createIconStore({ parent: scope.store, api: loader })
        : undefined
    }
    store = ownedStore ?? scope.store
    const selected = selectIconSource(props)
    name =
      typeof selected.source === "string"
        ? defaultScopes.has(scope)
          ? registeredName(selected.source)
          : selected.source
        : undefined
    staticState = undefined
    const source = selected.source
    if (typeof source === "string") {
      const compiled = props.loader ? undefined : resolve(source)
      if (compiled) staticState = { status: "loaded", ...compiled }
    } else if (Array.isArray(source))
      staticState = { status: "loaded", data: source, fill: "none" }
    else if (isIconData(source))
      staticState = { status: "loaded", data: source }
  }
  function notify() {
    for (const listener of listeners) listener()
  }

  /** Defer initial fetch until subscription stabilizes and props version still matches. */
  function scheduleLoad() {
    const expected = version
    queueMicrotask(() => {
      if (
        !destroyed &&
        listeners.size &&
        expected === version &&
        !staticState &&
        name &&
        getState().status === "idle"
      )
        void store.load(name).catch(() => {})
    })
  }
  function bind() {
    if (staticState || !name || !listeners.size) return
    unsubscribe = store.subscribe(name, () => {
      notify()
      scheduleLoad()
    })
    scheduleLoad()
  }
  prepare()
  return {
    getState,
    update(next, nextScope = scope) {
      if (destroyed) return
      version++
      unsubscribe?.()
      unsubscribe = undefined
      props = next
      scope = nextScope
      prepare()
      bind()
      notify()
    },
    /** Register render listener and start loading when first listener appears. */
    subscribe(listener) {
      if (destroyed) throw new Error("Icon controller has been destroyed.")
      listeners.add(listener)
      if (listeners.size === 1) bind()
      return () => {
        listeners.delete(listener)
        if (!listeners.size) {
          unsubscribe?.()
          unsubscribe = undefined
        }
      }
    },
    async load() {
      if (!destroyed && !staticState && name) await store.load(name)
      return getState()
    },
    /** Stop subscriptions, drop queued loads and invalidate any inline-owned child store. */
    destroy() {
      destroyed = true
      version++
      unsubscribe?.()
      listeners.clear()
      ownedStore?.invalidate()
    },
  }
}
