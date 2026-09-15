import { Icon, type IconName } from "@icones/react"
import type React from "react"
import type {
  IconName as BundledIconName,
  IconSetName,
  IconNamesBySet,
} from "@icones/names"
import type { IconName as TypeSubpathName } from "@icones/names"
import type { IconName as TablerIconName } from "@icones/names/tabler"
import type { IconName as FlagIconName } from "@icones/names/flag"
import type { IconName as DeclarationName } from "@icones/names"
import type { IconName as StandaloneIconName } from "@icones/names"
import type { IconName as StandaloneTablerName } from "@icones/names/tabler"

export const bundledNames = [
  "brand:4chan",
  "flag:us-circle",
  "flag:us-square",
  "flag:us",
  "huge:search-01",
  "lucide:star",
  "phosphor:star",
  "phosphor:star-fill",
  "bootstrap:star",
  "bootstrap:star-fill",
  "bootstrap:building-fill-add",
  "antd:star",
  "antd:star-filled",
  "tabler:star-filled",
] as const satisfies readonly BundledIconName[]

export const typedSet = "huge" satisfies IconSetName

export const narrowedName = "tabler:star" satisfies IconNamesBySet["tabler"]

export const typeSubpath = "flag:us-circle" satisfies TypeSubpathName<"flag">

export const tablerSubpath = "tabler:star" satisfies TablerIconName

export const flagSubpath = "flag:us-square" satisfies FlagIconName

export const declarationSubpath = "flag:us" satisfies DeclarationName

export const standaloneName = "flag:us" satisfies StandaloneIconName

export const standaloneTablerName = "tabler:star" satisfies StandaloneTablerName

export const invalidStandaloneName =
  // @ts-expect-error Standalone declarations retain exact-name checks.
  "tabler:not-an-icon" satisfies StandaloneIconName

export const typedIconProps = {
  name: "tabler:star" satisfies IconName,
  size: 24,
} satisfies React.ComponentProps<typeof Icon>

// @ts-expect-error Complete names reject nonexistent icons.
export const unknownBundledName = "tabler:not-an-icon" satisfies IconName

// @ts-expect-error The generic limits names to the requested set.
export const wrongIconSet = "lucide:star" satisfies IconName<"tabler">

// @ts-expect-error Set-specific imports exclude names from other collections.
export const wrongSubpathSet = "lucide:star" satisfies TablerIconName

// @ts-expect-error Set-specific imports still reject nonexistent icons.
export const wrongSubpathName = "flag:us-filled" satisfies FlagIconName

// @ts-expect-error Styles are exact names, not automatically generated suffixes.
export const wrongFlagStyle = "flag:us-filled" satisfies IconName

// @ts-expect-error Canonical built-in set types use huge, not its legacy alias.
export const oldSetName = "hugeicons" satisfies IconSetName

// @ts-expect-error Removed weights are not published names in any declaration entry.
export const removedBold = "phosphor:star-bold" satisfies BundledIconName
export const removedDuotone =
  // @ts-expect-error Removed weights are not part of the Phosphor name subset.
  "phosphor:star-duotone" satisfies IconName<"phosphor">
export const removedLight =
  // @ts-expect-error The names package cannot restore a removed weight via its generic.
  "phosphor:star-light" satisfies BundledIconName<"phosphor">
// @ts-expect-error Framework name exports must reject removed weights too.
export const removedThin = "phosphor:star-thin" satisfies IconName

// @ts-expect-error Removed collections are not included in generated names.
export const removedCollection = "remix:star-line" satisfies BundledIconName
// @ts-expect-error Ant Design TwoTone is not included in the resource package.
export const excludedTwoTone = "antd:star-twotone" satisfies BundledIconName
