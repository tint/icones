import type { Snippet } from "svelte"
import type { SVGAttributes } from "svelte/elements"
import type { IconOptions, IconScope, IconScopeOptions } from "@icones/core"

export type IconProps = IconOptions &
  Omit<
    SVGAttributes<SVGSVGElement>,
    keyof IconOptions | "children" | "innerHTML"
  > & {
    scope?: IconScope
    fallback?: Snippet | string
  }
export type IconConfigProps = IconScopeOptions & { children?: Snippet }
