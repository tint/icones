import React from "react"

import { iconLoader as defaultIconLoader } from "@icones/core/runtime"
import type { IconLoader } from "@icones/core/types"

export const IconLoaderContext =
  React.createContext<IconLoader>(defaultIconLoader)

/** Access the nearest icon loader override; default is @icones/core runtime loader. */
export function useIconLoader() {
  return React.useContext(IconLoaderContext)
}
