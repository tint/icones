import { expect, test } from "bun:test"
import { readFilters } from "../src/features/catalog/state.ts"
import { normalizeCatalogVariant } from "../src/features/catalog/styles.ts"
import { catalogVariantLabel } from "../src/features/catalog/types.ts"

test("bookmarks accept collection aliases but query with outline/solid", () => {
  for (const [set, alias, canonical] of [
    ["tabler", "filled", "solid"],
    ["brand", "filled", "solid"],
    ["bootstrap", "outline", "outline"],
    ["bootstrap", "fill", "solid"],
    ["antd", "outlined", "outline"],
    ["antd", "filled", "solid"],
    ["phosphor", "regular", "outline"],
    ["phosphor", "fill", "solid"],
    ["phosphor", "filled", "solid"],
    ["huge", "stroke-rounded", "outline"],
    ["flag", "circle", "circle"],
    ["flag", "4x3", "4x3"],
  ]) {
    expect(readFilters(`?set=${set}&variant=${alias}`).variant).toBe(canonical)
  }
  expect(normalizeCatalogVariant("lucide", "solid")).toBe("outline")
  expect(normalizeCatalogVariant("phosphor", "duotone")).toBe("outline")
  expect(normalizeCatalogVariant("tabler", "regular")).toBe("outline")
  expect(normalizeCatalogVariant("__proto__", "constructor")).toBe("outline")
})

test("style labels use metadata aliases without a set-specific UI dictionary", () => {
  expect(catalogVariantLabel("outline", "linear")).toBe("Linear")
  expect(catalogVariantLabel("outline", "regular")).toBe("Regular")
  expect(catalogVariantLabel("solid", "filled")).toBe("Filled")
  expect(catalogVariantLabel("solid")).toBe("Solid")
  expect(catalogVariantLabel("4x3")).toBe("4x3")
})
