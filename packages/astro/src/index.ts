// Astro entry: component, compatibility alias, and framework config/core passthrough exports.
export { default as Icon } from "./Icon.astro"
export type { IconProps } from "./types"
export { createIconScope as createIconConfig } from "@icones/core"
export * from "@icones/core"
