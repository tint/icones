import React from "react"
import { IconConfig as SizeConfig } from "./size-config"
import type { CSSSize, ResolveSizeName } from "@icones/core/sizes"
import type { IconAppearance, IconSizeValues } from "@icones/core/presentation"
import { mergeIconApi } from "@icones/core/loaders"

// Augment CustomSize in @icones/react to configure your own presets.
import type { CustomSize } from "./index.ts"
import {
  createIconStore,
  type IconStore,
  type IconStoreOptions,
} from "@icones/core/store"
import { useIconLoader } from "./loader-context.ts"
import { IconStoreContext } from "./store-context.ts"

export type SizeName = ResolveSizeName<CustomSize>
export type Size = SizeName | CSSSize | number
export type IconConfig = Omit<IconAppearance<Size>, "sizeValues"> & {
  sizeValues?: IconSizeValues<SizeName>
  sources?: IconStoreOptions["sources"]
  api?: IconStoreOptions["api"]
  store?: IconStore
}

export function IconConfig({
  children,
  sources,
  api,
  store,
  ...sizes
}: React.PropsWithChildren<IconConfig>) {
  const parent = React.useContext(IconStoreContext)
  const loader = useIconLoader()
  // Reuse parent store when inheriting sources/api; create a new store only when needed.
  const resolved = React.useMemo(() => {
    if (store) return store
    if (sources === undefined && api === undefined) return parent
    return createIconStore({
      sources,
      parent: parent ?? undefined,
      api: mergeIconApi(parent ? undefined : loader, api),
    })
  }, [api, loader, parent, sources, store])
  return (
    <SizeConfig {...sizes}>
      <IconStoreContext.Provider value={resolved}>
        {children}
      </IconStoreContext.Provider>
    </SizeConfig>
  )
}

export type { CSSSize } from "@icones/core/sizes"
