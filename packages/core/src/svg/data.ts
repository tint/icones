import type { IconData, IconTransform } from "../data/icon-data.ts"
import type { ElementChild, ElementData } from "../data/element-types.ts"
import { svgAttributeName } from "./attributes.ts"
import { parseViewBox } from "./view-box.ts"

/** Escape reserved XML characters before string-based SVG serialization. */
function escapeXml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

/** Wrap an already-rendered SVG body without parsing it or imposing collection rules. */
export function createSvgSymbolDocument(
  body: string,
  viewBox: string,
  id = "icon"
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><symbol id="${escapeXml(id)}" viewBox="${escapeXml(viewBox)}">${body}</symbol></defs></svg>`
}

/** Render one tuple child and its descendants to a raw SVG snippet. */
function renderChild(child: ElementChild): string {
  if (typeof child === "string") return escapeXml(child)
  const [tag, attributes] = child
  const props = Object.entries(attributes)
    .filter(([key]) => key !== "key" && key !== "children")
    .map(
      ([key, value]) =>
        ` ${svgAttributeName(key)}="${escapeXml(value as string | number)}"`
    )
    .join("")
  const children = attributes.children as readonly ElementChild[] | undefined
  return children?.length
    ? `<${tag}${props}>${children.map(renderChild).join("")}</${tag}>`
    : `<${tag}${props}/>`
}

/** Serialize tuples for SVG, SSR and Iconify-compatible APIs. No DOM/parser in the client. */
export function elementDataToIcon(
  data: ElementData,
  defaultFill = "none"
): IconData {
  // A standalone body must keep the workspace root's default fill even when
  // embedded in an Iconify response or an external symbol (both default to fill).
  const renderRoot = (child: ElementChild): string => {
    if (typeof child === "string") return renderChild(child)
    const [tag, attributes] = child
    return renderChild([
      tag,
      attributes.fill === undefined
        ? { ...attributes, fill: defaultFill }
        : attributes,
    ])
  }
  // A root svg tuple preserves a non-default viewport without an out-of-band manifest.
  if (data.length === 1 && data[0][0] === "svg") {
    const [
      ,
      { viewBox = "0 0 24 24", children = [], key: _key, ...attributes },
    ] = data[0]
    const dimensions = parseViewBox(String(viewBox))
    if (!dimensions) throw new TypeError("Invalid tuple SVG viewBox.")
    const [left, top, width, height] = dimensions
    return {
      left,
      top,
      width,
      height,
      body: Object.keys(attributes).length
        ? renderRoot(["g", { ...attributes, children }])
        : (children as readonly ElementChild[]).map(renderRoot).join(""),
    }
  }
  return { width: 24, height: 24, body: data.map(renderRoot).join("") }
}

/**
 * Minimal SVG viewport/quarter-turn renderer. No XML parsing, sizing presets or SDK.
 * Body-only objects keep their historical 16×16 default; tuples carry explicit 24×24.
 * Source transforms precede presentation transforms. SVG definitions remain intact.
 */
export function renderSvgData(data: IconData, options: IconTransform = {}) {
  let { left = 0, top = 0, width = 16, height = 16, body } = data
  if (
    ![left, top, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    throw new TypeError("Invalid SVG viewport.")
  for (const { rotate = 0, hFlip = false, vFlip = false } of [data, options]) {
    if (!Number.isInteger(rotate))
      throw new TypeError("SVG rotation must use quarter turns.")
    let turns = ((rotate % 4) + 4) % 4
    const transforms: string[] = []
    if (hFlip && vFlip) turns = (turns + 2) % 4
    else if (hFlip || vFlip) {
      transforms.push(
        `translate(${hFlip ? left + width : -left} ${vFlip ? top + height : -top})`,
        `scale(${hFlip ? -1 : 1} ${vFlip ? -1 : 1})`
      )
      left = top = 0
    }
    if (turns) {
      const x = turns === 1 ? top + height / 2 : left + width / 2
      const y = turns === 2 ? top + height / 2 : x
      transforms.unshift(`rotate(${turns === 3 ? -90 : turns * 90} ${x} ${y})`)
      if (turns % 2) {
        ;[left, top] = [top, left]
        ;[width, height] = [height, width]
      }
    }
    if (transforms.length)
      body = `<g transform="${transforms.join(" ")}">${body}</g>`
  }
  return { body, viewBox: `${left} ${top} ${width} ${height}` }
}
