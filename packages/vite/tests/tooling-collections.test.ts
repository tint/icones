import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { addManifestEntry } from "@icones/core/manifest"
import {
  createCollectionManifest,
  collectionEntry,
  collectionStyles,
  supportsCollectionIcon,
  serializeCollectionManifest,
  updateCollectionManifest,
} from "@icones/vite/tooling/collections"

test("current collection profiles have only actual styles; ratios are separate", () => {
  for (const styles of Object.values(collectionStyles))
    expect(
      Object.keys(styles).every((key) => key === "outline" || key === "solid")
    ).toBe(true)
  for (const [set, slug, variant] of [
    ["tabler", "star-filled", "solid"],
    ["brand", "logo-filled", "solid"],
    ["bootstrap", "star-fill", "solid"],
    ["bootstrap", "building-fill-add", "solid"],
    ["bootstrap", "star", "outline"],
    ["bootstrap", "filetype-fillable", "outline"],
    ["antd", "star", "outline"],
    ["antd", "star-filled", "solid"],
    ["phosphor", "star-fill", "solid"],
    ["lucide", "star", "outline"],
    ["hugeicons", "star", "outline"],
    ["custom", "name-fill", "outline"],
    ["custom", "name-linear", "outline"],
  ])
    expect(collectionEntry(set!, "general", slug!).variant).toBe(variant)
  for (const style of ["bold", "duotone", "light", "thin"]) {
    expect(supportsCollectionIcon("phosphor", `star-${style}`)).toBe(false)
    expect(() =>
      collectionEntry("phosphor", "general", `star-${style}`)
    ).toThrow("Unsupported collection style")
    // Never interpret another collection's ordinary name as a Phosphor weight.
    expect(supportsCollectionIcon("custom", `star-${style}`)).toBe(true)
    const manifest = createCollectionManifest("phosphor")
    const entry = {
      prefix: "phosphor",
      category: "general",
      slug: `star-${style}`,
      variant: style,
    }
    addManifestEntry(manifest, entry)
    expect(() => serializeCollectionManifest(manifest)).toThrow(
      "Unsupported collection variant"
    )
    expect(() => updateCollectionManifest("not-written", entry)).toThrow(
      "Unsupported collection variant"
    )
  }
  expect(supportsCollectionIcon("antd", "star-twotone")).toBe(false)
  expect(() => collectionEntry("antd", "general", "star-twotone")).toThrow(
    "Unsupported collection style"
  )
})

test("collection IDs are canonical while aliases and filename suffixes stay upstream-specific", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "icones-style-alias-"))
  try {
    for (const [prefix, outline, solid, slug] of [
      ["tabler", "outline", "filled", "star-filled"],
      ["brand", "outline", "filled", "logo-filled"],
      ["bootstrap", "outline", "fill", "star-fill"],
      ["antd", "outlined", "filled", "star-filled"],
      ["phosphor", "regular", "fill", "star-fill"],
    ]) {
      const manifest = createCollectionManifest(prefix!)
      expect(manifest.variantAliases).toEqual({ outline, solid })
      const entry = collectionEntry(prefix!, "general", slug!)
      expect(entry).toMatchObject({
        variant: "solid",
        variantAlias: solid,
        slug,
      })
      await updateCollectionManifest(root, entry)
      const parsed = JSON.parse(
        await readFile(path.join(root, prefix!, "manifest.json"), "utf8")
      )
      expect(parsed.variantAliases).toEqual({ outline, solid })
      expect(parsed.variants.solid.general.json).toEqual([slug + ".json"])
      for (const variant of ["filled", "fill", "linear", "regular", "thin"]) {
        expect(() =>
          updateCollectionManifest(root, { ...entry, variant })
        ).toThrow("Unsupported collection variant")
      }
    }
    expect(createCollectionManifest("huge").variantAliases).toEqual({
      outline: "stroke-rounded",
    })
    expect(createCollectionManifest("flag").variantAliases).toBeUndefined()
    for (const variant of ["linear", "filled", "thin"]) {
      expect(() =>
        updateCollectionManifest(root, {
          prefix: "custom",
          category: "general",
          slug: "star",
          variant,
        })
      ).toThrow("Unsupported collection variant")
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("incremental manifest writes use alphabetical order without weakening style validation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "icones-variant-order-"))
  try {
    for (const [prefix, variants] of [
      ["flag", ["circle", "4x3", "1x1"]],
      ["tabler", ["solid", "outline"]],
    ] as const) {
      await Promise.all(
        variants.map((variant) =>
          updateCollectionManifest(root, {
            prefix,
            category: "general",
            slug: variant,
            variant,
          })
        )
      )
      const file = path.join(root, prefix, "manifest.json")
      const content = await readFile(file, "utf8")
      expect(Object.keys(JSON.parse(content).variants)).toEqual(
        [...variants].sort()
      )
      expect(() =>
        updateCollectionManifest(root, {
          prefix,
          category: "general",
          slug: "invalid",
          variant: "duotone",
        })
      ).toThrow("Unsupported collection variant")
      expect(await readFile(file, "utf8")).toBe(content)
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
