import { iconToSVG } from "@iconify/utils"
import { parseViewBox } from "@icones/core/view-box"
import type { IconifyIcon } from "@iconify/types"
import type { ElementData } from "@icones/core/element-types"
import {
  elementDataToIcon,
  createSvgSymbolDocument,
} from "@icones/core/svg-data"
import {
  configurableStrokeBody,
  replaceSvgIds,
  getIconViewBox,
  iconViewBoxes,
  withIconViewBox,
} from "@icones/core/svg"

/** Internal scale compensation derived from the public --icones-stroke-width. */
const remoteStrokeWidth = "--icones-remote-stroke-width"

/** Named Flag symbols retain native coordinates; other remote symbols use 24 × 24. */
export function createIconSymbolDocument(
  data: IconifyIcon | ElementData,
  name?: string
) {
  const svg = iconToSVG(
    withIconViewBox(
      Array.isArray(data)
        ? elementDataToIcon(data as ElementData)
        : (data as IconifyIcon),
      name
    )
  )
  if (getIconViewBox(name) !== iconViewBoxes.default) {
    const body = replaceSvgIds(configurableStrokeBody(svg.body), "remote-")
    return createSvgSymbolDocument(body, svg.attributes.viewBox)
  }
  const dimensions = parseViewBox(svg.attributes.viewBox)
  if (!dimensions) {
    throw new TypeError("Invalid icon dimensions.")
  }
  const [left, top, width, height] = dimensions
  const scale = 24 / Math.max(width!, height!)
  const x = (24 - width! * scale) / 2 - left! * scale
  const y = (24 - height! * scale) / 2 - top! * scale
  const transforms: string[] = []
  if (x !== 0 || y !== 0) transforms.push(`translate(${x} ${y})`)
  const needsScale = scale !== 1
  if (needsScale) transforms.push(`scale(${scale})`)

  let body = configurableStrokeBody(svg.body)
  // Translation does not change stroke widths; only scaling needs compensation.
  if (needsScale) body = configurableStrokeBody(body, remoteStrokeWidth)
  body = replaceSvgIds(body, "remote-")
  if (transforms.length) {
    const style = needsScale
      ? ` style="${remoteStrokeWidth}:calc(var(--icones-stroke-width) / ${scale})"`
      : ""
    body = `<g transform="${transforms.join(" ")}"${style}>${body}</g>`
  }
  return createSvgSymbolDocument(body, "0 0 24 24")
}
