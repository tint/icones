import { expect, test } from "bun:test"
import {
  isElementData,
  parseElementData,
  readElementData,
  reactAttributeName,
  svgAttributeName,
} from "@icones/core/elements"
import { elementDataToIcon } from "@icones/core/svg-data"

test("tuple primitives retain nested text, namespaced attributes and Core serialization", () => {
  const data = parseElementData([
    [
      "svg",
      {
        viewBox: "0 0 32 16",
        children: [
          ["text", { className: "label", children: ["A & B"] }],
          ["use", { xlinkHref: "#shape" }],
        ],
      },
    ],
  ])
  expect(elementDataToIcon(data)).toMatchObject({ width: 32, height: 16 })
  expect(elementDataToIcon(data).body).toContain("A &amp; B")
  expect(elementDataToIcon(data).body).toContain('xlink:href="#shape"')
  for (const name of [
    "stroke-width",
    "xlink:href",
    "class",
    "data-custom",
    "viewBox",
  ])
    expect(svgAttributeName(reactAttributeName(name))).toBe(name)
  expect(
    isElementData([["path", { children: [["path", { opacity: Infinity }]] }]])
  ).toBe(false)
  expect(() => parseElementData([["path", { children: [null] }]])).toThrow(
    "Invalid icon element tuples."
  )
})

test("persisted tuple validation rejects empty and malformed data without parsing SVG", () => {
  const data = [["path", { d: "M2 12h20" }]] as const
  expect(readElementData(data, "demo:star")).toBe(data)
  expect(parseElementData([])).toEqual([])
  for (const value of [
    [],
    null,
    { body: "<path/>" },
    [["path", { children: [null] }]],
  ])
    expect(() => readElementData(value, "demo:star")).toThrow(
      "Invalid element tuple JSON: demo:star"
    )
})
