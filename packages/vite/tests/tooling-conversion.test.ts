import { expect, test } from "bun:test"
import { elementDataToIcon } from "@icones/core/svg-data"
import { svgToElementData } from "@icones/vite/tooling/elements"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"

const svg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12h22"/></svg>'

test("standalone conversion retains inheritance, viewport, colours and definition references", () => {
  const data = svgToElementData(svg)
  expect(data[0]).toEqual([
    "path",
    {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      d: "M1 12h22",
      key: "0",
    },
  ])
  const flag = svgToElementData(
    '<svg viewBox="0 0 640 480"><defs><path id="a" d="M0 0h20"/></defs><g stroke="#fff" stroke-width="37"><use href="#a" fill="#f00"/></g></svg>',
    true
  )
  expect(elementDataToIcon(flag)).toMatchObject({ width: 640, height: 480 })
  const symbol = createIconSymbolDocument(flag)
  expect(symbol).toContain('fill="#f00"')
  expect(symbol).toContain('fill="#000"')
  expect(symbol).toContain('stroke-width="37"')
  expect(symbol).not.toContain('stroke-width="var(')
  expect(symbol).toContain('href="#remote-a"')
  expect(symbol).toContain("translate(0 3) scale(0.0375)")
  expect(() =>
    svgToElementData('<svg viewBox="0 0 0 24"><path/></svg>')
  ).toThrow("viewport")
})
