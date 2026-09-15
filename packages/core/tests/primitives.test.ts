import { expect, test } from "bun:test"
import { parseViewBox } from "@icones/core/view-box"
import { toAsciiSlug } from "@icones/core/slug"

test("viewBox parsing retains native coordinates and rejects invalid dimensions", () => {
  expect(parseViewBox(" -2, 3, 32, 16 ")).toEqual([-2, 3, 32, 16])
  for (const input of [
    "",
    "0 0 24",
    "0 0 24 24 1",
    "0 0 0 24",
    "0 0 -1 24",
    "0 0 Infinity 24",
    "0 0 NaN 24",
  ])
    expect(parseViewBox(input)).toBeNull()
})

test("ASCII slug normalization does not impose importer validation policy", () => {
  expect(toAsciiSlug("  Arrows & Navigation  ")).toBe("arrows-navigation")
  expect(toAsciiSlug("中文")).toBe("")
})
