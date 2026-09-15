// Default entry points for Svelte consumers plus shared core exports.
export { default as Icon } from "./Icon.svelte"
export {
  default as IconConfig,
  default as IconProvider,
} from "./IconConfig.svelte"
export type { IconProps, IconConfigProps } from "./types"
export * from "@icones/core"
