import { useSyncExternalStore } from "react"
import {
  defaultPackageManager,
  isPackageManager,
  type PackageManager,
} from "./package-install.ts"

export const packageManagerStorageKey = "icones-package-manager"

function readPreference(
  target: Window,
  fallback = defaultPackageManager
): PackageManager {
  try {
    const value = target.localStorage.getItem(packageManagerStorageKey)
    if (isPackageManager(value)) return value
  } catch {
    return fallback
  }
  return defaultPackageManager
}

function createStore(target: Window) {
  let value = readPreference(target)
  const listeners = new Set<() => void>()
  function update(next: PackageManager) {
    if (value === next) return
    value = next
    for (const listener of listeners) listener()
  }
  function onStorage(event: StorageEvent) {
    if (event.key !== packageManagerStorageKey && event.key !== null) return
    try {
      if (event.storageArea && event.storageArea !== target.localStorage) return
    } catch {
      return
    }
    update(readPreference(target))
  }
  return {
    getSnapshot: () => value,
    subscribe(listener: () => void) {
      if (!listeners.size) {
        value = readPreference(target, value)
        target.addEventListener("storage", onStorage)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (!listeners.size) target.removeEventListener("storage", onStorage)
      }
    },
    setManager(next: PackageManager) {
      if (!isPackageManager(next)) return
      try {
        target.localStorage.setItem(packageManagerStorageKey, next)
      } catch {
        /* Keep the in-memory choice. */
      }
      update(next)
    },
  }
}

const stores = new WeakMap<Window, ReturnType<typeof createStore>>()
const serverStore = {
  getSnapshot: () => defaultPackageManager,
  subscribe: () => () => {},
  setManager: (_manager: PackageManager) => {},
}

export function usePackageManager() {
  let store: ReturnType<typeof createStore> = serverStore
  if (typeof window !== "undefined") {
    if (!stores.has(window)) stores.set(window, createStore(window))
    store = stores.get(window)!
  }
  const manager = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    serverStore.getSnapshot
  )
  return { manager, setManager: store.setManager }
}
