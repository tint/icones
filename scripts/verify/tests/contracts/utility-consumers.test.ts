import { expect, test } from "bun:test"
import { parseViewBox } from "@icones/core/view-box"
import { toAsciiSlug } from "@icones/core/slug"
import { elementDataToIcon } from "@icones/core/svg-data"
import { resolveIconSymbol } from "@icones/core/symbol"
import { svgToElementData } from "@icones/vite/tooling/elements"
import { categoryDirectory } from "../../../../scripts/icon-builder/src/import/api.ts"
import { directorySlug } from "../../../../scripts/icon-builder/src/import/catalog.ts"

test("shared viewBox parsing preserves coordinates and caller-specific validation errors", () => {
  expect(parseViewBox(" -2, 3, 32, 16 ")).toEqual([-2, 3, 32, 16])
  for (const box of [
    "",
    "0 0 24",
    "0 0 24 24 1",
    "0 0 0 24",
    "0 0 -1 24",
    "0 0 Infinity 24",
    "0 0 NaN 24",
  ]) {
    expect(parseViewBox(box)).toBeNull()
    expect(() => elementDataToIcon([["svg", { viewBox: box }]])).toThrow(
      "Invalid tuple SVG viewBox."
    )
    expect(() =>
      resolveIconSymbol({ type: "symbol", viewBox: box }, "tabler:star")
    ).toThrow("Invalid symbol viewBox.")
    expect(() =>
      svgToElementData(`<svg viewBox="${box}"><path d="M0 0"/></svg>`)
    ).toThrow("Invalid SVG viewport.")
  }
})

test("shared slug normalization leaves empty-result policy with the importer", () => {
  expect(toAsciiSlug("  Arrows & Navigation  ")).toBe("arrows-navigation")
  expect(categoryDirectory("  Arrows & Navigation  ")).toBe("arrows-navigation")
  expect(directorySlug("  Arrows & Navigation  ")).toBe("arrows-navigation")
  expect(toAsciiSlug("中文")).toBe("")
  expect(() => categoryDirectory("中文")).toThrow(
    "explicit ASCII directory override"
  )
  expect(() => directorySlug("中文")).toThrow("Invalid category")
})
