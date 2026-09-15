import type { HTMLAttributes } from "astro/types"
import type { IconOptions, IconScope, IconScopeOptions } from "@icones/core"

export type IconProps = IconOptions &
  Omit<HTMLAttributes<"svg">, keyof IconOptions | "set:html" | "set:text"> & {
    scope?: IconScope
    config?: IconScopeOptions
    fallback?: string
  }
