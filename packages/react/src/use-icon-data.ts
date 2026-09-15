import React from "react"
import { resolve } from "@icones/core/runtime"
import { iconLoader as defaultIconLoader } from "@icones/core/runtime"

import { useIconLoader } from "./loader-context.ts"
import { IconStoreContext } from "./store-context.ts"
import { createIconStore } from "@icones/core/store"
import {
  registeredSources,
  registeredName,
  registryStore,
  isIconData,
} from "@icones/core/registry"
import type {
  IconLoader,
  IconLoadState,
  IconSource,
  RuntimeIcon,
} from "@icones/core/types"

const staticIdleState: IconLoadState = { status: "idle" }
const staticMissingState: IconLoadState = { status: "missing" }

export function useIconData(source: IconSource, loaderOverride?: IconLoader) {
  const contextLoader = useIconLoader()
  const loader = loaderOverride ?? contextLoader
  const configuredStore = React.useContext(IconStoreContext)
  /** Choose the owning store: scoped store, runtime compile cache, or private child store. */
  const store = React.useMemo(() => {
    if (!loaderOverride && configuredStore) return configuredStore
    if (
      !configuredStore &&
      loader === defaultIconLoader &&
      typeof window !== "undefined"
    )
      return registryStore
    return createIconStore({
      sources: configuredStore ? undefined : registeredSources,
      parent: configuredStore ?? undefined,
      api: loader,
    })
  }, [configuredStore, loader, loaderOverride])
  const dynamicName =
    typeof source === "string"
      ? configuredStore
        ? source
        : registeredName(source)
      : undefined
  const staticIcon = React.useMemo(
    () =>
      typeof source === "string" && loaderOverride
        ? null
        : resolveStaticData(source),
    [loaderOverride, source]
  )

  // Subscribe only for dynamic named icons; inline tuple/object data bypasses store.
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!dynamicName || staticIcon) return () => {}
      return store.subscribe(dynamicName, listener)
    },
    [dynamicName, staticIcon, store]
  )
  const getSnapshot = React.useCallback(() => {
    if (!dynamicName || staticIcon) return staticIdleState
    return store.getState(dynamicName)
  }, [dynamicName, staticIcon, store])
  const dynamicState = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  )
  const ownsStore = store !== configuredStore && store !== registryStore

  React.useEffect(() => {
    // Cleanup only private child stores; shared stores must outlive this component.
    if (!ownsStore || !dynamicName || staticIcon) return
    // Only this hook's private store belongs to this lifecycle. Shared scopes
    // must keep requests alive for their other consumers and preload callers.
    // The loading effect below restarts work after StrictMode's cleanup replay.
    return () => store.invalidate()
  }, [dynamicName, ownsStore, staticIcon, store])

  React.useEffect(() => {
    // Initial eager load for dynamic names that have an external reference URL.
    if (!dynamicName || staticIcon || store.getState(dynamicName).href) return
    void store.load(dynamicName).catch(() => {})
  }, [dynamicName, store, staticIcon])

  React.useEffect(() => {
    // If state is still idle, retry on transition after StrictMode replays.
    if (!dynamicName || staticIcon || dynamicState.status !== "idle") return
    void store.load(dynamicName).catch(() => {})
  }, [dynamicName, dynamicState.status, store, staticIcon])

  // Static sources are always resolved synchronously; dynamic names remain reactive.
  return staticIcon
    ? ({ status: "loaded", ...staticIcon } satisfies IconLoadState)
    : dynamicName
      ? dynamicState
      : staticMissingState
}

function resolveStaticData(source: IconSource): RuntimeIcon | null {
  if (typeof source === "string") {
    return resolve(source) ?? null
  }
  if (Array.isArray(source)) return { data: source, fill: "none" }
  if (isIconData(source)) return { data: source }

  return null
}
