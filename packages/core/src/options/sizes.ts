export type DefaultSizeName = "xs" | "sm" | "md" | "lg" | "xl"

// Helper types derive which custom keys are enabled/disabled by boolean config.
type CustomSizeName<CustomSize extends object> = keyof CustomSize & string

type EnabledCustomSizeName<CustomSize extends object> = {
  [Key in CustomSizeName<CustomSize>]: CustomSize[Key] extends true
    ? Key
    : never
}[CustomSizeName<CustomSize>]

type DisabledDefaultSizeName<CustomSize extends object> = {
  [Key in DefaultSizeName]: Key extends keyof CustomSize
    ? CustomSize[Key] extends false
      ? Key
      : never
    : never
}[DefaultSizeName]

export type ResolveSizeName<CustomSize extends object> =
  | Exclude<DefaultSizeName, DisabledDefaultSizeName<CustomSize>>
  | EnabledCustomSizeName<CustomSize>

// Minimal CSS length units accepted by icon `width/height` style parsing.
type CSSLengthUnit =
  | "%"
  | "cap"
  | "ch"
  | "cm"
  | "dvb"
  | "dvh"
  | "dvi"
  | "dvmax"
  | "dvmin"
  | "dvw"
  | "em"
  | "ex"
  | "ic"
  | "in"
  | "lh"
  | "lvb"
  | "lvh"
  | "lvi"
  | "lvmax"
  | "lvmin"
  | "lvw"
  | "mm"
  | "pc"
  | "pt"
  | "px"
  | "Q"
  | "rcap"
  | "rch"
  | "rem"
  | "rex"
  | "ric"
  | "rlh"
  | "svb"
  | "svh"
  | "svi"
  | "svmax"
  | "svmin"
  | "svw"
  | "vb"
  | "vh"
  | "vi"
  | "vmax"
  | "vmin"
  | "vw"

export type CSSSize =
  | "0"
  | "auto"
  | "inherit"
  | "initial"
  | "revert"
  | "revert-layer"
  | "unset"
  | `${number}${CSSLengthUnit}`
  | `calc(${string})`
  | `clamp(${string})`
  | `max(${string})`
  | `min(${string})`
  | `var(${string})`
