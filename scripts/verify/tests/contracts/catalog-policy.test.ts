import { expect, test } from "bun:test"
import { selectCatalog } from "@icones/core/catalog"
import {
  createIconManifest,
  addManifestEntry,
  serializeManifest,
  readIconManifest,
} from "@icones/core/manifest"
import {
  createCollectionManifest,
  collectionEntry,
  serializeCollectionManifest,
} from "@icones/vite/tooling/collections"
import {
  createGalleryCatalogIndex,
  galleryCatalogOptions,
} from "../../../../app/src/features/catalog/query.ts"

const records = Array.from({ length: 140 }, (_, index) => ({
  name: `demo:icon-${index}`,
  prefix: "demo",
  category: "general",
  variant: index % 2 ? "outline" : "filled",
}))

test("utility results do not impose gallery page limits, style ordering or wire envelopes", () => {
  const result = selectCatalog(records)
  expect(result.icons).toHaveLength(140)
  expect(result).not.toHaveProperty("version")
  expect(result.variants?.map((item) => item.id)).toEqual(["filled", "outline"])
  expect(selectCatalog(records, { q: "absent" }).variants).toBeUndefined()
  const queryGallery = createGalleryCatalogIndex(records)
  const page = queryGallery({ set: "demo" })
  expect(page.version).toBe(1)
  expect(page.icons).toHaveLength(60)
  // An unknown collection gets no invented style priority.
  expect(page.variants?.map((item) => item.id)).toEqual(["filled", "outline"])
  expect(queryGallery({ limit: 200 }).icons).toHaveLength(100)
  expect(queryGallery({ q: "absent" }).variants).toEqual([
    { id: "filled", count: 0 },
    { id: "outline", count: 0 },
  ])
})

test("gallery and generated manifests sort actual variant IDs alphabetically", () => {
  for (const [set, variants] of [
    ["tabler", ["solid", "outline"]],
    ["phosphor", ["solid", "outline"]],
    ["flag", ["circle", "4x3", "1x1"]],
    ["bootstrap", ["solid", "outline"]],
    ["antd", ["solid", "outline"]],
    ["custom", ["solid", "outline"]],
  ] as const) {
    const manifest = createCollectionManifest(set)
    const entries = variants.map((variant) => ({
      name: `${set}:${variant}`,
      prefix: set,
      slug: variant,
      category: "general",
      variant,
    }))
    for (const entry of entries) addManifestEntry(manifest, entry)
    const expected = [...variants].sort()
    expect(
      Object.keys(JSON.parse(serializeCollectionManifest(manifest)).variants)
    ).toEqual(expected)
    expect(
      createGalleryCatalogIndex(entries)({ set }).variants?.map(({ id }) => id)
    ).toEqual(expected)
  }
})

test("gallery indexed queries retain the website policy", () => {
  const queryGallery = createGalleryCatalogIndex(records)
  for (const query of [{}, { limit: 200 }, { q: "absent" }])
    expect(queryGallery(query)).toEqual({
      version: 1,
      ...selectCatalog(records, query, galleryCatalogOptions),
    })
})

test("upstream aliases and naming are build presets, not manifest validation rules", () => {
  for (const prefix of ["flag", "huge", "custom"])
    expect(createIconManifest(prefix).aliases).toBeUndefined()
  expect(createCollectionManifest("flag").aliases).toEqual({
    "circle-flags": { suffix: "-circle" },
  })
  expect(createCollectionManifest("huge").aliases).toEqual({
    hugeicons: { suffix: "" },
  })
  expect(collectionEntry("circle-flags", "flags", "us")).toMatchObject({
    prefix: "flag",
    slug: "us-circle",
    variant: "circle",
  })
  const manifest = createIconManifest("demo")
  for (const variant of ["outline", "filled"])
    addManifestEntry(manifest, {
      prefix: "demo",
      slug: variant,
      category: "general",
      variant,
    })
  expect(Object.keys(JSON.parse(serializeManifest(manifest)).variants)).toEqual(
    ["filled", "outline"]
  )
  expect(
    Object.keys(
      JSON.parse(serializeManifest(manifest, ["outline", "filled"])).variants
    )
  ).toEqual(["outline", "filled"])
  expect(readIconManifest(JSON.parse(serializeManifest(manifest))).prefix).toBe(
    "demo"
  )
})
