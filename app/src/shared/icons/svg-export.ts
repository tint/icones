import type { IconData } from "@icones/core/icon-data"
import { renderSvgData } from "@icones/core/svg-data"
import { configurableStrokeBody } from "@icones/core/svg"

/** Export from loaded data, never from an asynchronous <use> placeholder. */
export function createStandaloneSvg(
  data: IconData,
  options: {
    size: number
    strokeWidth: number
    color: string
    rotation: number
  }
) {
  const { size, strokeWidth, rotation, color } = options
  if (
    !/^#[\da-f]{6}$/i.test(color) ||
    ![size, strokeWidth, rotation].every(Number.isFinite)
  ) {
    throw new TypeError("Invalid SVG customization.")
  }
  const svg = renderSvgData(data, {
    rotate: rotation / 90,
  })
  const width =
    (strokeWidth * Math.max(data.width ?? 16, data.height ?? 16)) / 24
  const body = strokeWidth
    ? configurableStrokeBody(svg.body).replace(
        /var\(--icones-stroke-width,\s*[^)]+\)/g,
        String(width)
      )
    : svg.body
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${svg.viewBox}" color="${color}">\n  ${body.trim().replace(/>\s*</g, ">\n  <")}\n</svg>`
}
