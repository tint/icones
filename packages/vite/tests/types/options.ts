import type { IconesPluginOptions } from "@icones/vite"

export const pluginOptions: IconesPluginOptions = { assetsDir: "assets/icons" }

export const removedPluginOption: IconesPluginOptions = {
  // @ts-expect-error The removed output-directory alias is no longer supported.
  spriteFileName: "icons.svg",
}
