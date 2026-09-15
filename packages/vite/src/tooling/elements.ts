import { readIconData } from "@icones/core/icon-data"
import { iconToSVG } from "@iconify/utils"
import type { IconifyIcon } from "@iconify/types"
import { SaxesParser } from "saxes"
import { parseViewBox } from "@icones/core/view-box"
import { reactAttributeName } from "@icones/core/elements"
import type {
  ElementChild,
  ElementData,
  ElementNode,
} from "@icones/core/element-types"

/** Build/download-only XML parsing. Persist tuples, never serialized SVG bodies. */
export function iconToElementData(input: IconifyIcon): ElementData {
  const svg = iconToSVG(readIconData(input, "conversion"))
  return withViewBox(parseElements(svg.body), svg.attributes.viewBox)
}

function parseElements(
  source: string,
  defaultFill = "currentColor",
  fragment = true
): ElementData {
  const roots: ElementChild[] = []
  const stack: {
    attributes: Record<string, string | number | ElementChild[]>
    children: ElementChild[]
  }[] = []
  const parser = new SaxesParser({ fragment })
  parser.on("opentag", (tag) => {
    const siblings = stack.at(-1)?.children ?? roots
    const attributes = Object.fromEntries(
      Object.entries(tag.attributes).map(([key, value]) => [
        reactAttributeName(key),
        value,
      ])
    ) as Record<string, string | number | ElementChild[]>
    attributes.key = String(siblings.length)
    // Workspace tuples inherit fill=none; retain Iconify's default fill explicitly.
    if (!stack.length && attributes.fill === undefined)
      attributes.fill = defaultFill
    siblings.push([tag.name, attributes])
    stack.push({ attributes, children: [] })
  })
  parser.on("closetag", () => {
    const node = stack.pop()!
    if (node.children.length) node.attributes.children = node.children
  })
  const text = (value: string) => {
    if (stack.length) stack.at(-1)!.children.push(value)
    else if (value.trim()) throw new TypeError("Text outside SVG elements.")
  }
  parser.on("text", text)
  parser.on("cdata", text)
  parser.write(source).close()
  const data = roots as ElementNode[]
  if (!data.length) throw new TypeError("Icon has no SVG elements.")
  return data
}

function withViewBox(data: ElementData, viewBox: string): ElementData {
  // Preserve arbitrary viewports and source layering; only legacy flat tuples sort opacity first.
  if (
    viewBox !== "0 0 24 24" ||
    (data.length === 1 && data[0][0] === "svg") ||
    data.some(([, attrs]) => attrs.opacity !== undefined)
  ) {
    return [["svg", { viewBox, children: data, key: "0" }]]
  }
  return data
}

/** Convert an original standalone SVG, preserving root inheritance and viewBox. */
export function svgToElementData(
  source: string,
  preserveStroke = false
): ElementData {
  // Original SVG files can include XML declarations, unlike Iconify body fragments.
  const roots = parseElements(
    source,
    preserveStroke ? "#000" : "currentColor",
    false
  )
  if (roots.length !== 1 || roots[0][0] !== "svg")
    throw new TypeError("Expected one root SVG element.")
  const [, root] = roots[0]
  const viewBox =
    typeof root.viewBox === "string"
      ? root.viewBox
      : `0 0 ${Number.parseFloat(String(root.width ?? 24))} ${Number.parseFloat(String(root.height ?? 24))}`
  const dimensions = parseViewBox(viewBox)
  if (!dimensions) throw new TypeError("Invalid SVG viewport.")
  const attributes = Object.fromEntries(
    Object.entries(root).filter(
      ([key]) =>
        ![
          "xmlns",
          "xmlnsXlink",
          "viewBox",
          "width",
          "height",
          "version",
          "key",
          "children",
        ].includes(key)
    )
  )
  if (preserveStroke && attributes.strokeWidth === undefined)
    attributes.strokeWidth = "1"
  const children = (root.children ?? []) as readonly ElementChild[]
  const drawable = children.filter(
    (child): child is ElementNode => typeof child !== "string"
  )
  if (!drawable.length) throw new TypeError("SVG contains no elements.")
  const inherited = new Set([
    "fill",
    "fillRule",
    "fillOpacity",
    "stroke",
    "strokeWidth",
    "strokeLinecap",
    "strokeLinejoin",
    "strokeMiterlimit",
    "strokeDasharray",
    "strokeDashoffset",
    "strokeOpacity",
    "color",
  ])
  const data: ElementData = Object.keys(attributes).every((key) =>
    inherited.has(key)
  )
    ? drawable.map(([tag, props]) => [tag, { ...attributes, ...props }])
    : [["g", { ...attributes, children, key: "0" }]]
  return withViewBox(data, dimensions.join(" "))
}
