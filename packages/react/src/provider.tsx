import React from "react"

import { IconLoaderContext, useIconLoader } from "./loader-context.ts"
import type { IconLoader } from "@icones/core/types"
import { IconConfig } from "./config.tsx"

export function IconProvider({
  children,
  loader,
}: React.PropsWithChildren<{ loader?: IconLoader }>) {
  const parentLoader = useIconLoader()
  // Nest loader context and visual defaults through IconConfig scope.
  return (
    <IconLoaderContext.Provider value={loader ?? parentLoader}>
      <IconConfig api={loader}>{children}</IconConfig>
    </IconLoaderContext.Provider>
  )
}
