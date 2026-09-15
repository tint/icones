import type {
  IconProps as VanillaProps,
  IconName as VanillaIconName,
} from "@icones/vanilla"
import {
  defineIconElement,
  bindIcons,
  type IconBindingRoot,
  type IconBindingOptions,
  type IconBinding,
  type DefineIconElementOptions,
  type IconElementConstructor,
} from "@icones/vanilla"
import type { IconBinding as AutomaticIconBinding } from "@icones/vanilla/standard-element"
import type {
  IconProps as VueProps,
  IconName as VueIconName,
} from "@icones/vue"
import type {
  IconProps as SolidProps,
  IconName as SolidIconName,
} from "@icones/solidjs"
import type {
  IconProps as SvelteProps,
  IconName as SvelteIconName,
} from "@icones/svelte"
import type {
  IconProps as AstroProps,
  IconName as AstroIconName,
} from "@icones/astro"
import { createIconScope, type IconOptions } from "@icones/core"

export const sharedName = "tabler:star" satisfies VanillaIconName &
  VueIconName &
  SolidIconName &
  SvelteIconName &
  AstroIconName
// @ts-expect-error Published adapter declarations retain the complete name union.
export const invalidPublishedName = "tabler:not-an-icon" satisfies AstroIconName

const scope = createIconScope({
  api: { tabler: { type: "symbol", baseUrl: "/icons" }, default: false },
  sizeValues: { tabler: { xl: 32 }, default: { md: 20 } },
  defaultSize: { tabler: "lg", default: "md" },
  strokeWidth: { tabler: 2, default: 1.5 },
  absoluteStrokeWidth: { tabler: true, default: false },
})
export const vanilla: VanillaProps = { name: "custom", style: { color: "red" } }
export const elementOptions: DefineIconElementOptions = { scope }
export const registerIcons = (): IconElementConstructor | undefined =>
  defineIconElement(elementOptions)
export const configureIcon = () => {
  const icon = document.createElement("icones-icon")
  icon.scope = scope
  icon.setAttribute("name", "custom")
  return icon.load()
}
export const standardOptions: IconBindingOptions = {
  scope,
  attrPrefix: "ui-",
  observe: false,
}
export const bindStandardRoot = (
  root: IconBindingRoot
): IconBinding | undefined => bindIcons({ ...standardOptions, root })
export const manageBinding = async (binding: AutomaticIconBinding) => {
  binding.refresh()
  await binding.load()
  binding.destroy()
}
export const vue: VueProps = {
  name: "tabler:star",
  scope,
  onClick: (event: MouseEvent) => event.preventDefault(),
}
export const solid: SolidProps = {
  name: "tabler:star",
  scope,
  onClick: (event) => event.currentTarget.focus(),
}
export const svelte: SvelteProps = {
  name: "tabler:star",
  scope,
  onclick: (event) => event.currentTarget.focus(),
}
export const astro: AstroProps = {
  name: "tabler:star",
  scope,
  config: { defaultSize: { tabler: "lg", default: "md" } },
  fallback: "Missing",
}
export const data: IconOptions = { data: [["path", { d: "M0 0h24" }]] }
export const alternativeData = {
  data: { body: '<circle r="8"/>' },
  altData: [["path", { d: "M0 0h24" }]],
  showAlt: true,
} satisfies IconOptions
export const alternativeSources: [
  VanillaProps,
  VueProps,
  SolidProps,
  SvelteProps,
  AstroProps,
] = [
  alternativeData,
  alternativeData,
  alternativeData,
  alternativeData,
  alternativeData,
]
export const invalidAlternative: VueProps = {
  name: "one",
  // @ts-expect-error Alternative data must be a supported icon source.
  altData: { variant: "filled" },
}
// @ts-expect-error All adapters require a source.
export const missing: VueProps = {}
// @ts-expect-error A single primary source is allowed.
export const conflicting: SolidProps = { name: "one", icon: "two" }
// @ts-expect-error Arbitrary data is not an icon.
export const invalid: SvelteProps = { data: { variant: "filled" } }
