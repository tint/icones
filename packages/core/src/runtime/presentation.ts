import { renderSvgData } from "../svg/data.ts"
import { elementDataToIcon } from "../data/elements.ts"
import { isElementData, isIconData, parseIconName } from "./sources.ts"
import {
  configurableStrokeBody,
  replaceSvgIds,
  getIconViewBox,
  withIconViewBox,
} from "../svg/index.ts"
import type { CSSSize, DefaultSizeName } from "../options/sizes.ts"
import type {
  Data,
  IconLoader,
  IconLoadState,
  IconSource,
  Name,
} from "./types.ts"
import {
  mergeSetOptions,
  ownValue,
  resolveSetOption,
  type IconSetMap,
  type IconSetOptions,
} from "../options/set-options.ts"

export type { IconSetMap, IconSetOptions } from "../options/set-options.ts"

export type IconSize = DefaultSizeName | CSSSize | number
export type IconDefaultSize<Size extends string | number = IconSize> =
  IconSetOptions<Size>
export type IconSizePresets<Preset extends string = string> = Readonly<
  Partial<Record<Preset, string | number>>
>
export type IconSizeValues<Preset extends string = string> = IconSetOptions<
  IconSizePresets<Preset>
>
export type IconSourceProps =
  | { name: Name; data?: never; icon?: never }
  | { data: Data; name?: Name; icon?: never }
  | { icon: Name | Data; name?: never; data?: never }

export type IconPresentation<Size extends string | number = IconSize> = {
  size?: Size
  width?: string | number
  height?: string | number
  color?: string
  fill?: string
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
  rotate?: number
  hFlip?: boolean
  vFlip?: boolean
  altIcon?: Name | Data
  altName?: Name
  /** Inline alternative artwork; takes priority over altName. */
  altData?: Data
  showAlt?: boolean
  /** An explicit per-icon loader takes priority over collected static names. */
  loader?: IconLoader
  "aria-label"?: string
  "aria-hidden"?: boolean | "true" | "false"
  role?: string
}
export type IconOptions<Size extends string | number = IconSize> =
  IconSourceProps & IconPresentation<Size>
export type IconAppearance<Size extends string | number = IconSize> = {
  /** Presets shared by all sets, or per-set presets merged over `default`. */
  sizeValues?: IconSizeValues
  /** A shared size, or set-specific sizes with an optional `default` fallback. */
  defaultSize?: IconDefaultSize<Size>
  strokeWidth?: IconSetOptions<number>
  absoluteStrokeWidth?: IconSetOptions<boolean>
}
export const defaultIconAppearance = {
  sizeValues: { xs: 12, sm: 16, md: 20, lg: 24, xl: 28 },
  defaultSize: "md",
  strokeWidth: 1.5,
  absoluteStrokeWidth: false,
} as const

/** Child maps merge by set; a scalar replaces every inherited size. */
export function mergeIconDefaultSize<Size extends string | number>(
  parent: IconDefaultSize<Size> | undefined,
  next: IconDefaultSize<Size> | undefined
): IconDefaultSize<Size> | undefined {
  return mergeSetOptions(parent, next)
}

function sourceSet(source: IconSource) {
  return typeof source === "string" ? parseIconName(source)?.prefix : undefined
}

function isSizeValuesMap(
  values: IconSizeValues
): values is IconSetMap<IconSizePresets> {
  return Object.values(values).some(
    (value) => typeof value === "object" && value !== null
  )
}

/** Preset dictionaries merge by key, both globally and within each set. */
export function mergeIconSizeValues(
  parent: IconSizeValues | undefined,
  next: IconSizeValues | undefined
): IconSizeValues | undefined {
  if (next === undefined) return parent
  if (!parent) return next
  if (!isSizeValuesMap(parent) && !isSizeValuesMap(next)) {
    return { ...parent, ...next }
  }
  const inherited = isSizeValuesMap(parent) ? parent : { default: parent }
  const overrides = isSizeValuesMap(next) ? next : { default: next }
  const result = { ...inherited }
  for (const [set, values] of Object.entries(overrides)) {
    if (values !== undefined)
      Object.defineProperty(result, set, {
        value: { ...ownValue(inherited, set), ...values },
        enumerable: true,
        configurable: true,
        writable: true,
      })
  }
  return result
}

export function mergeIconAppearance<Size extends string | number>(
  parent: IconAppearance<Size>,
  next: IconAppearance<Size>
): IconAppearance<Size> {
  return {
    sizeValues: mergeIconSizeValues(parent.sizeValues, next.sizeValues),
    defaultSize: mergeIconDefaultSize(parent.defaultSize, next.defaultSize),
    strokeWidth: mergeSetOptions(parent.strokeWidth, next.strokeWidth),
    absoluteStrokeWidth: mergeSetOptions(
      parent.absoluteStrokeWidth,
      next.absoluteStrokeWidth
    ),
  }
}

/** Resolve a size preset from either shared map or per-set defaults. */
function resolveSizeValue(
  values: IconSizeValues | undefined,
  size: string,
  set: string | undefined
) {
  if (!values) return undefined
  if (!isSizeValuesMap(values)) return ownValue(values, size)
  return (
    ownValue(ownValue(values, set), size) ??
    ownValue(ownValue(values, "default"), size)
  )
}

/** Runtime prop names used to keep component-only options off the SVG element. */
export const iconOptionKeys = [
  "name",
  "data",
  "icon",
  "size",
  "width",
  "height",
  "color",
  "fill",
  "strokeWidth",
  "absoluteStrokeWidth",
  "rotate",
  "hFlip",
  "vFlip",
  "altIcon",
  "altName",
  "altData",
  "showAlt",
  "loader",
  "aria-label",
  "aria-hidden",
  "role",
] as const

type IconSelectionProps = IconSourceProps &
  Pick<IconPresentation, "altIcon" | "altName" | "altData" | "showAlt">

/** Keep selection pure: rendering the already-selected source must not warn again. */
export function selectIconSource(props: IconSelectionProps) {
  const alternative = props.altData ?? props.altIcon ?? props.altName
  if (props.showAlt && alternative != null) {
    return {
      source: alternative,
      name: props.altData != null ? props.altName : undefined,
    }
  }
  return {
    source: props.data ?? props.icon ?? props.name ?? "",
    name: props.data != null ? props.name : undefined,
  }
}

function validateInlineData(value: unknown, prop: "data" | "altData") {
  if (value != null && !Array.isArray(value) && !isIconData(value))
    throw new TypeError(
      `[icones] "${prop}" must contain a single icon's data. Register collections with "sources" and select an icon with "${prop === "data" ? "name" : "altName"}".`
    )
}

/** Validate new data references; report each conflict once until resolved, per instance. */
export function createIconSourceValidator() {
  let primaryConflict = false
  let alternativeConflict = false
  let previousData: Data | undefined
  let previousAltData: Data | undefined
  return (props: IconSelectionProps) => {
    if (props.data !== previousData) validateInlineData(props.data, "data")
    if (props.altData !== previousAltData)
      validateInlineData(props.altData, "altData")
    previousData = props.data
    previousAltData = props.altData
    const primary = props.name != null && props.data != null
    const alternative = props.altName != null && props.altData != null
    if (primary && !primaryConflict)
      console.error(
        '[icones] "name" and "data" were both provided. "data" takes priority; pass only one of them.'
      )
    if (alternative && !alternativeConflict)
      console.error(
        '[icones] "altName" and "altData" were both provided. "altData" takes priority; pass only one of them.'
      )
    primaryConflict = primary
    alternativeConflict = alternative
  }
}

export type IconRenderResult = {
  attributes: Record<string, string | number | boolean | undefined>
  body: string
  style: Record<string, string | number | undefined>
  available: boolean
}

function numericLength(value: string | number) {
  // Accepts `px` and numeric-only values; unknown units fall back to NaN.
  return typeof value === "number"
    ? value
    : /^\d+(\.\d+)?(px)?$/.test(value)
      ? Number.parseFloat(value)
      : NaN
}

/**
 * Pure SVG rendering shared by framework adapters.
 * `instanceId` must be stable across server and client hydration.
 */
export function renderIcon(
  state: IconLoadState,
  props: IconOptions<string | number>,
  config: IconAppearance<string | number> = defaultIconAppearance,
  instanceId = "icon"
): IconRenderResult {
  const { source, name } = selectIconSource(props)
  const set = sourceSet(source)
  const sourceName = typeof source === "string" ? source : undefined
  const size =
    props.size ??
    resolveSetOption(config.defaultSize, set) ??
    defaultIconAppearance.defaultSize
  const sizeValue =
    typeof size === "number"
      ? size
      : (resolveSizeValue(config.sizeValues, size, set) ??
        ownValue<string | number>(defaultIconAppearance.sizeValues, size) ??
        size)
  const width =
    props.size === undefined ? (props.width ?? sizeValue) : sizeValue
  const height =
    props.size === undefined ? (props.height ?? sizeValue) : sizeValue
  const rawData = state.data
  // If data is tuple format, promote semi-transparent entries first for consistent layering.
  const tuples = isElementData(rawData)
  let data = tuples
    ? elementDataToIcon(
        [
          ...rawData.filter(([, attrs]) => attrs.opacity !== undefined),
          ...rawData.filter(([, attrs]) => attrs.opacity === undefined),
        ],
        props.fill ?? state.fill ?? "none"
      )
    : rawData
  if (data) data = withIconViewBox(data, sourceName)
  if (state.href) {
    const [left, top, w, h] = (state.viewBox ?? getIconViewBox(sourceName))
      .split(" ")
      .map(Number)
    const href = state.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    // Symbol-backed icons need only a viewport and a <use> reference.
    data = {
      left,
      top,
      width: w,
      height: h,
      body: `<use href="${href}" width="${w}" height="${h}"/>`,
    }
  }
  const rendered = data
    ? renderSvgData(data, {
        ...(props.rotate === undefined ? {} : { rotate: props.rotate }),
        ...(props.hFlip === undefined ? {} : { hFlip: props.hFlip }),
        ...(props.vFlip === undefined ? {} : { vFlip: props.vFlip }),
      })
    : undefined
  const viewBox = rendered?.viewBox ?? getIconViewBox(sourceName)
  const [, , boxWidth, boxHeight] = viewBox.split(" ").map(Number)
  const scale = Math.min(
    numericLength(width) / boxWidth,
    numericLength(height) / boxHeight
  )
  const stroke =
    props.strokeWidth ??
    resolveSetOption(config.strokeWidth, set) ??
    defaultIconAppearance.strokeWidth
  const absolute =
    props.absoluteStrokeWidth ??
    resolveSetOption(config.absoluteStrokeWidth, set) ??
    defaultIconAppearance.absoluteStrokeWidth
  const strokeWidth =
    absolute && scale > 0
      ? stroke / scale
      : (stroke * Math.max(boxWidth, boxHeight)) / 24
  return {
    available: !!rendered,
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      "xmlns:xlink": "http://www.w3.org/1999/xlink",
      width,
      height,
      viewBox,
      fill: props.fill ?? state.fill ?? (tuples ? "none" : "currentColor"),
      color: props.color ?? "currentColor",
      "stroke-width": strokeWidth,
      "aria-label": props["aria-label"],
      "aria-hidden":
        props["aria-hidden"] ??
        (props["aria-label"] !== undefined || props.role !== undefined
          ? undefined
          : true),
      role: props.role,
      "data-icon": typeof source === "string" ? source : name,
      "data-state": state.status,
    },
    body: rendered
      ? replaceSvgIds(
          configurableStrokeBody(rendered.body),
          "icon-" + instanceId.replace(/[^a-zA-Z0-9_-]/g, "") + "-"
        )
      : "",
    style: { "--icones-stroke-width": strokeWidth },
  }
}

/** Serialize only style values; framework adapters still escape the HTML attribute. */
export function iconStyleText(style: IconRenderResult["style"]) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}:${value}`)
    .join(";")
}
