import type { ElementData } from "@icones/core/element-types"
import { elementDataToIcon } from "@icones/core/svg-data"
import { createStandaloneSvg } from "../icons/svg-export.ts"
import {
  vanillaIconExample,
  type VanillaElementMode,
} from "./vanilla-example.ts"

export const iconCodeFormats = [
  "SVG",
  "React",
  "Vue",
  "Svelte",
  "SolidJS",
  "Astro",
  "Vanilla",
  "JSON",
] as const
export type IconCodeFormat = (typeof iconCodeFormats)[number]
export type IconExampleMode = "compact" | "full"
type Customization = Parameters<typeof createStandaloneSvg>[1]

export function createIconExample(
  format: IconCodeFormat,
  name: string,
  data: ElementData | undefined,
  options: Customization,
  mode: IconExampleMode = "compact",
  elementMode: VanillaElementMode = "web"
): {
  code: string
  filename: string
  description: string
  packageName?: string
} {
  const packageName =
    format === "SVG" || format === "JSON"
      ? undefined
      : "@icones/" + format.toLowerCase()
  const filenames: Record<IconCodeFormat, string> = {
    SVG: "icon.svg",
    React: "IconExample.tsx",
    Vue: "IconExample.vue",
    Svelte: "IconExample.svelte",
    SolidJS: "IconExample.tsx",
    Astro: "IconExample.astro",
    Vanilla: "icon.html",
    JSON: "icon.json",
  }
  const description =
    format === "SVG"
      ? "Standalone SVG with your current settings. No package or data service required."
      : format === "JSON"
        ? "Original [tag, attributes] tuples, without preview customizations. Save as icon.json, validate the import with parseElementData, and pass it to an adapter’s data prop or sources for offline use."
        : format === "Vanilla"
          ? elementMode === "web"
            ? "A light-DOM Web Component: import @icones/vanilla/web-element once in your app entry. Elements render and update automatically, without Shadow DOM. Uses your app’s existing icon loading setup."
            : "Standard HTML: import @icones/vanilla/standard-element once in your app entry. Only i elements with icon-name are observed; icon-* attributes update the SVG automatically. Uses your app’s existing icon loading setup."
          : mode === "compact"
            ? "Just the icon. Paste into your existing component or template; imports and icon loading use your app’s setup."
            : "Includes imports and framework structure. Uses your app’s existing icon loading setup."
  const meta = { filename: filenames[format], packageName, description }
  if (!data) return { ...meta, code: "" }
  if (format === "SVG")
    return {
      ...meta,
      code: createStandaloneSvg(elementDataToIcon(data), options),
    }
  if (format === "JSON") return { ...meta, code: JSON.stringify(data, null, 2) }

  const { size, strokeWidth, color, rotation } = options
  const rotate = rotation / 90
  const imports = 'import { Icon } from "' + packageName + '"'
  if (format === "Vanilla") {
    return {
      ...meta,
      code: vanillaIconExample(
        { name, size, color, rotate, strokeWidth: strokeWidth || "original" },
        mode === "full",
        elementMode
      ),
    }
  }

  let stroke: string
  if (format === "Vue") {
    stroke = strokeWidth
      ? ':stroke-width="' + strokeWidth + '"'
      : 'style="--icones-stroke-width: initial"'
  } else if (strokeWidth) {
    stroke = "strokeWidth={" + strokeWidth + "}"
  } else if (format === "Svelte" || format === "Astro") {
    stroke = 'style="--icones-stroke-width: initial"'
  } else {
    const assertion =
      format === "React"
        ? mode === "full"
          ? " as CSSProperties"
          : ' as import("react").CSSProperties'
        : ""
    stroke = 'style={{ "--icones-stroke-width": "initial" }' + assertion + "}"
  }
  const icon =
    "<Icon\n  " +
    [
      "name=" + JSON.stringify(name),
      format === "Vue" ? ':size="' + size + '"' : "size={" + size + "}",
      "color=" + JSON.stringify(color),
      format === "Vue" ? ':rotate="' + rotate + '"' : "rotate={" + rotate + "}",
      stroke,
    ].join("\n  ") +
    "\n/>"
  if (mode === "compact") return { ...meta, code: icon }

  switch (format) {
    case "React":
    case "SolidJS":
      return {
        ...meta,
        code:
          imports +
          (format === "React" && !strokeWidth
            ? '\nimport type { CSSProperties } from "react"'
            : "") +
          "\n\n" +
          icon,
      }
    case "Vue":
      return {
        ...meta,
        code:
          '<script setup lang="ts">\n' +
          imports +
          "\n</script>\n\n<template>\n" +
          icon
            .split("\n")
            .map((line) => "  " + line)
            .join("\n") +
          "\n</template>",
      }
    case "Svelte":
      return {
        ...meta,
        code: '<script lang="ts">\n  ' + imports + "\n</script>\n\n" + icon,
      }
    case "Astro":
      return { ...meta, code: "---\n" + imports + "\n---\n\n" + icon }
  }
}
