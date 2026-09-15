export { createIcon, mountIcon, type IconProps, type IconHandle } from "./icon"
/** Web Component convenience registration. */
export {
  defineIconElement,
  type IconElement,
  type IconElementConstructor,
  type DefineIconElementOptions,
} from "./element"
/** Standard HTML observer bootstrap for `<i icon-name>` usage. */
export {
  bindIcons,
  type IconBindingRoot,
  type IconBindingOptions,
  type IconBinding,
} from "./standard"
export { createIconScope as createIconConfig } from "@icones/core"
export * from "@icones/core"
