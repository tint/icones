import { expect, test } from "bun:test"
import {
  readIconManifest,
  manifestEntries,
  createIconManifest,
  addManifestEntry,
  serializeManifest,
} from "@icones/core/manifest"

test("manifest validation rejects paths, mismatched pairs, and duplicate names across styles", () => {
  const valid = createIconManifest("app")
  addManifestEntry(valid, {
    prefix: "app",
    slug: "star",
    category: "system",
    variant: "outline",
  })
  expect(readIconManifest(JSON.parse(serializeManifest(valid)))).toEqual(valid)
  for (const change of [
    (value: typeof valid) => {
      value.variants.outline!.system!.json = ["../star.json"]
    },
    (value: typeof valid) => {
      value.variants.outline!.system!.svg = ["other.svg"]
    },
    (value: typeof valid) => {
      value.variants.filled = structuredClone(value.variants.outline!)
    },
    (value: typeof valid) => {
      value.prefix = "../outside"
    },
  ]) {
    const invalid = structuredClone(valid)
    change(invalid)
    expect(() => readIconManifest(invalid)).toThrow()
  }
  const special = JSON.parse('{"version":1,"prefix":"app","variants":{}}')
  addManifestEntry(special, {
    prefix: "app",
    slug: "constructor",
    category: "constructor",
    variant: "constructor",
  })
  expect(manifestEntries(readIconManifest(special))).toHaveLength(1)
})

test("style aliases round-trip without renaming icons or legacy namespace aliases", () => {
  const manifest = createIconManifest("huge")
  manifest.aliases = { hugeicons: { suffix: "" } }
  addManifestEntry(manifest, {
    prefix: "huge",
    slug: "star",
    category: "general",
    variant: "outline",
    variantAlias: "stroke-rounded",
  })
  const parsed = readIconManifest(JSON.parse(serializeManifest(manifest)))
  expect(parsed.variantAliases).toEqual({ outline: "stroke-rounded" })
  expect(parsed.aliases).toEqual({ hugeicons: { suffix: "" } })
  expect(manifestEntries(parsed)).toEqual([
    {
      prefix: "huge",
      slug: "star",
      category: "general",
      variant: "outline",
      variantAlias: "stroke-rounded",
    },
  ])
  for (const variantAliases of [
    null,
    [],
    { filled: "fill" },
    { outline: "../line" },
    { solid: 1 },
    { outline: "" },
    { outline: "fill", solid: "fill" },
    JSON.parse('{"__proto__":"line"}'),
  ]) {
    expect(() => readIconManifest({ ...parsed, variantAliases })).toThrow(
      "Invalid manifest variant aliases"
    )
  }
})
