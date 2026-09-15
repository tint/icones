import React from "react"
import {
  defaultIconAppearance,
  mergeIconAppearance,
  type IconAppearance,
} from "@icones/core/presentation"

type InternalIconConfig = IconAppearance<string | number>

const IconConfigContext = React.createContext<InternalIconConfig>({
  defaultSize: defaultIconAppearance.defaultSize,
  strokeWidth: defaultIconAppearance.strokeWidth,
  absoluteStrokeWidth: defaultIconAppearance.absoluteStrokeWidth,
})

export function IconConfig({
  children,
  sizeValues,
  defaultSize,
  strokeWidth,
  absoluteStrokeWidth,
}: React.PropsWithChildren<InternalIconConfig>) {
  const parentConfig = React.useContext(IconConfigContext)
  // Merge with parent config so child components can override per subtree only.
  const config = React.useMemo<InternalIconConfig>(
    () =>
      mergeIconAppearance(parentConfig, {
        sizeValues,
        defaultSize,
        strokeWidth,
        absoluteStrokeWidth,
      }),
    [absoluteStrokeWidth, defaultSize, parentConfig, sizeValues, strokeWidth]
  )

  return (
    <IconConfigContext.Provider value={config}>
      {children}
    </IconConfigContext.Provider>
  )
}

export function useIconConfig() {
  return React.useContext(IconConfigContext)
}
