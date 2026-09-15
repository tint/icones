import React from "react"
import type { IconStore } from "@icones/core/store"

/** Internal registry for component tree scope stores. */
export const IconStoreContext = React.createContext<IconStore | undefined>(
  undefined
)
