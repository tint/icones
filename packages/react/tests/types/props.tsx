import {
  Icon,
  IconConfig,
  type ElementData,
  type IconSet,
  type Name,
  createIconStore,
} from "@icones/react"
import type React from "react"

export const inferredProps: React.ComponentProps<typeof Icon> = {
  name: "tabler:refresh",
}

declare module "@icones/react" {
  interface CustomSize {
    "2xl": true
    xs: false
  }
}

const data: ElementData = [["path", { d: "M0 0h24" }]]

const set: IconSet = {
  prefix: "custom",
  icons: { line: { body: '<path d="M0 0h24"/>' } },
}

export function supportedProps(name: string) {
  const builtin: Name = "Search01"
  return (
    <IconConfig
      defaultSize="2xl"
      sizeValues={{ "2xl": 32 }}
      sources={{ Search01: data }}
      api={false}
    >
      <Icon name={builtin} />
      <Icon name={name} />
      <Icon name="tabler:heart-filled" />
      <Icon name="tabler:refresh" altName="tabler:check" showAlt />
      <Icon data={data} altData={data} showAlt />
      <Icon name="tabler:refresh" altData={data} showAlt />
      <Icon name={`tabler:${name}`} strokeWidth={2} absoluteStrokeWidth />
      <Icon icon="Search01" altIcon={data} showAlt size="24px" />
      <Icon data={data} />
      <IconConfig sources={{ custom: set }}>
        <Icon name="custom:line" />
      </IconConfig>
      <Icon name={`brand-${name}`} />
    </IconConfig>
  )
}

// @ts-expect-error Collections belong in sources, not inline data.
export const invalidInlineSet = <Icon data={set} name="custom:line" />

// @ts-expect-error Alternative collections also belong in sources.
export const invalidAlternativeSet = <Icon data={data} altData={set} />

// @ts-expect-error Names use name, not data.
export const invalidInlineName = <Icon data="tabler:star" />

// @ts-expect-error Alternative names use altName, not altData.
export const invalidAlternativeName = <Icon data={data} altData="tabler:star" />

export const configuredStore = createIconStore({
  sources: [
    { Search01: data, tabler: set },
    async (name) => (name === "Search02" ? data : undefined),
  ],
  api: { url: (name) => `/api/icons/${name}` },
})

export const perSetSize = (
  <IconConfig
    defaultSize={{ tabler: "2xl", lucide: "24px", default: "md" }}
    sizeValues={{ tabler: { "2xl": 40 }, default: { "2xl": 32 } }}
    strokeWidth={{ tabler: 2, default: 1.5 }}
    absoluteStrokeWidth={{ tabler: true, default: false }}
    api={{ tabler: { type: "symbol", baseUrl: "/icons" }, default: false }}
  >
    <Icon name="tabler:star" />
  </IconConfig>
)

// @ts-expect-error Disabled presets are also rejected in set maps.
export const disabledSetSize = <IconConfig defaultSize={{ tabler: "xs" }} />

export const disabledSetPreset = (
  // @ts-expect-error Disabled presets are rejected inside per-set preset dictionaries too.
  <IconConfig sizeValues={{ tabler: { xs: 12 } }} />
)

export const invalidIconStrokeMap = (
  // @ts-expect-error Per-icon stroke width is still a number, not a set map.
  <Icon name="tabler:star" strokeWidth={{ tabler: 2 }} />
)

export const invalidAbsoluteMap = (
  // @ts-expect-error Absolute stroke map values must be booleans.
  <IconConfig absoluteStrokeWidth={{ tabler: "true" }} />
)

// @ts-expect-error Unregistered presets are also rejected in set maps.
export const invalidSetSize = <IconConfig defaultSize={{ default: "huge" }} />

export const invalidIconSizeMap = (
  // @ts-expect-error Per-icon size is still a scalar.
  <Icon name="tabler:star" size={{ tabler: "lg" }} />
)

export const symbolStore = createIconStore({
  api: { type: "symbol", baseUrl: "/icons" },
})

export const fetchStore = createIconStore({
  api: {
    type: "fetch",
    baseUrl: "/icons",
    requestInit: { credentials: "include" },
  },
})

export const invalidSymbolStore = createIconStore({
  api: {
    type: "symbol",
    // @ts-expect-error Browser-managed symbols cannot send custom fetch headers.
    requestInit: { headers: { Authorization: "token" } },
  },
})

// Application-owned names and dynamically computed bare names use sources.
export const customSource = <Icon name="MySearch" />

// @ts-expect-error A source is required.
export const missingSource = <Icon />

// @ts-expect-error Built-in sizes can be disabled through module augmentation.
export const disabledSize = <Icon name="Search01" size="xs" />

// @ts-expect-error Unregistered size names are rejected.
export const invalidSize = <Icon name="tabler:refresh" size="huge" />

// @ts-expect-error Styles are independent names, not a renderer variant prop.
export const invalidVariant = <Icon name="tabler:heart" variant="solid" />

// @ts-expect-error Each JSON represents one icon, not a bundled style envelope.
export const invalidData = <Icon data={{ outline: data, solid: data }} />
