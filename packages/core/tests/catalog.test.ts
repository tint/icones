import { expect, test } from "bun:test"
import { createCatalogIndex, selectCatalog } from "@icones/core/catalog"

const records = Array.from({ length: 140 }, (_, index) => ({
  name: `demo:icon-${index}`,
  prefix: "demo",
  category: "general",
  variant: index % 2 ? "outline" : "filled",
}))

test("set-specific style ordering is copied into query snapshots", () => {
  const policy = { variantOrderBySet: { demo: ["outline", "filled"] } }
  const index = createCatalogIndex(records, 2, policy)
  policy.variantOrderBySet.demo.reverse()
  expect(index({ set: "demo" }).variants?.map(({ id }) => id)).toEqual([
    "outline",
    "filled",
  ])
  expect(index().variants?.map(({ id }) => id)).toEqual(["filled", "outline"])
})

test("aliases survive cached pages and empty facets without affecting sort/filter IDs", () => {
  const styledRecords = [
    {
      name: "demo:star-fill",
      prefix: "demo",
      category: "general",
      variant: "solid",
      variantAlias: "fill",
    },
    {
      name: "demo:star",
      prefix: "demo",
      category: "general",
      variant: "outline",
      variantAlias: "regular",
    },
  ]
  const index = createCatalogIndex(styledRecords, 2, {
    includeEmptyVariants: true,
  })
  styledRecords[0]!.variantAlias = "changed"
  const page = index({ set: "demo", variant: "solid" })
  expect(page.variants).toEqual([
    { id: "outline", count: 1, alias: "regular" },
    { id: "solid", count: 1, alias: "fill" },
  ])
  expect(page.icons.map(({ name }) => name)).toEqual(["demo:star-fill"])
  expect(page.icons[0]?.variantAlias).toBe("fill")
  expect(index({ set: "demo", variant: "fill" }).total).toBe(0)
  page.variants![0]!.alias = "changed"
  expect(index({ set: "demo", q: "missing" }).variants).toEqual([
    { id: "outline", count: 0, alias: "regular" },
    { id: "solid", count: 0, alias: "fill" },
  ])
  expect(
    selectCatalog([
      styledRecords[1]!,
      {
        name: "other:star",
        prefix: "other",
        category: "general",
        variant: "outline",
        variantAlias: "line",
      },
    ]).variants
  ).toEqual([{ id: "outline", count: 2 }])
})

test("indexed queries preserve explicit policies and return isolated pages", () => {
  const policy = {
    defaultLimit: 5,
    maxLimit: 7,
    variantOrder: ["outline", "filled"],
  }
  const index = createCatalogIndex(records, 2, policy)
  policy.defaultLimit = 1
  policy.variantOrder.reverse()
  expect(index().icons).toHaveLength(5)
  expect(index({ limit: 30 }).icons).toHaveLength(7)
  expect(index().variants?.map((item) => item.id)).toEqual([
    "outline",
    "filled",
  ])
  const first = index()
  first.icons[0]!.name = "changed"
  expect(index().icons[0]!.name).not.toBe("changed")
  expect(() => createCatalogIndex(records, -1)).toThrow(RangeError)
  for (const value of [0, -1, 1.5, Infinity, NaN]) {
    expect(() =>
      createCatalogIndex(records, 2, { defaultLimit: value })
    ).toThrow(RangeError)
    expect(() => selectCatalog(records, {}, { maxLimit: value })).toThrow(
      RangeError
    )
  }
})
