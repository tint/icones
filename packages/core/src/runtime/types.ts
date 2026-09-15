import type { IconData, IconSet } from "../data/icon-data.ts"
export type { IconData, IconSet } from "../data/icon-data.ts"
import type { ElementData } from "../data/element-types.ts"
import type { IconName } from "@icones/names"
export type { IconName, IconSetName, IconNamesBySet } from "@icones/names"
export type {
  ElementData,
  ElementNode,
  ElementChild,
  ElementAttributes,
} from "../data/element-types.ts"

export type Data = IconData | ElementData
// Retain built-in completions, while allowing application-owned source names.
export type Name = IconName | (string & {})

export type RuntimeIcon = {
  data?: Data
  href?: string
  viewBox?: string
  fill?: string
}

export type ParsedIconName = {
  provider: string
  prefix: string
  name: string
}

export type IconLoaderResult = Data | IconSet | null | undefined

export type IconLoader = (
  name: string,
  parsedName: ParsedIconName | null,
  request?: { signal: AbortSignal }
) => IconLoaderResult | Promise<IconLoaderResult>

// referenced means the browser owns loading the external SVG; it is not a load-success signal.
export type IconLoadStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "referenced"
  | "missing"
  | "error"

export type IconLoadState = RuntimeIcon & {
  status: IconLoadStatus
  error?: Error
}

export type IconSource = string | Data

export type IconSources =
  | Readonly<
      Record<
        string,
        Data | IconSet | (() => IconLoaderResult | Promise<IconLoaderResult>)
      >
    >
  | IconLoader
