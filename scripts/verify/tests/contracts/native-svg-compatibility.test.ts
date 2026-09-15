import { expect, test } from "bun:test"
// Reference implementation is a dev-only oracle, never a runtime dependency.
import { iconToSVG } from "@iconify/utils"
import { type IconData } from "@icones/core"
import { renderSvgData } from "@icones/core/svg-data"

const icon: IconData = { body: '<path d="M2 12h20"/>', width: 24, height: 24 }

test("native SVG transforms preserve viewport and quarter-turn geometry", () => {
  for (const viewport of [{}, { left: -2, top: 3, width: 32, height: 16 }]) {
    for (const sourceTurn of [-1, 0, 1, 2, 3, 4]) {
      for (const rotate of [-5, 0, 1, 2, 3, 5]) {
        for (const [hFlip, vFlip] of [
          [false, false],
          [true, false],
          [false, true],
          [true, true],
        ]) {
          const data = { ...icon, ...viewport, rotate: sourceTurn, hFlip: true }
          const options = { rotate, hFlip, vFlip }
          const reference = iconToSVG(data, options)
          const actual = renderSvgData(data, options)
          expect(actual.viewBox).toBe(reference.attributes.viewBox)
          expect(actual.body).toBe(reference.body)
        }
      }
    }
  }
  const definitions =
    '<defs><linearGradient id="paint"/></defs><path fill="url(#paint)"/>'
  expect(
    renderSvgData({ ...icon, body: definitions }, { rotate: 1 }).body
  ).toContain(definitions)
  expect(renderSvgData({ body: icon.body }).viewBox).toBe("0 0 16 16")
  for (const width of [0, -1, NaN, Infinity])
    expect(() => renderSvgData({ ...icon, width })).toThrow(
      "Invalid SVG viewport"
    )
  expect(() => renderSvgData(icon, { rotate: 0.5 })).toThrow("quarter turns")
})
