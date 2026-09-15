import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  archiveCatalog,
  phosphorMetadataRevision,
} from "../../icon-builder/src/import/catalog.ts"
import {
  officialSources,
  type ArchiveSource,
} from "../../icon-builder/src/import/sources.ts"
import {
  importOfficialSets,
  publishSet,
  validateCatalog,
} from "../../icon-builder/src/import/official.ts"
import {
  hugeiconsCategories,
  hugeiconsLinks,
  hugeiconsSlug,
  parallel,
} from "../../icon-builder/src/import/hugeicons.ts"

const temporary: string[] = []

async function temp() {
  const root = await mkdtemp(path.join(tmpdir(), "iconify-official-test-"))
  temporary.push(root)
  return root
}

async function put(file: string, content: string) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content)
}

async function fixture(set: ArchiveSource, files: Record<string, string>) {
  const cache = await temp()
  const source = officialSources[set]
  const folder = path.join(cache, `${set}-${source.revision}`)
  for (const [file, content] of Object.entries(files))
    await put(path.join(folder, "extracted", file), content)
  await put(path.join(folder, "complete"), source.revision)
  return cache
}

afterEach(async () => {
  for (const root of temporary.splice(0))
    await rm(root, { recursive: true, force: true })
})

const svg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12h22"/></svg>'

test("official Tabler categories partition brand and inherit filled categories", async () => {
  const cache = await fixture("tabler", {
    "icons/outline/refresh.svg": "<!--\ncategory: Arrows\n-->" + svg,
    "icons/filled/refresh.svg": svg,
    "icons/outline/brand-github.svg": "<!--\ncategory: Brand\n-->" + svg,
    "icons/filled/brand-github.svg": svg,
  })
  const tabler = await archiveCatalog("tabler", cache)
  const brand = await archiveCatalog("brand", cache)
  expect(tabler.map(({ slug, category }) => [slug, category])).toEqual([
    ["refresh", "arrows"],
    ["refresh-filled", "arrows"],
  ])
  expect(brand.map(({ slug, category }) => [slug, category])).toEqual([
    ["github", "logos"],
    ["github-filled", "logos"],
  ])
  expect(tabler.some((icon) => icon.slug.startsWith("brand-"))).toBe(false)
  validateCatalog("tabler", tabler)
  expect(() =>
    validateCatalog("tabler", [
      ...tabler,
      { ...tabler[0], category: "another" },
    ])
  ).toThrow("Duplicate")
  expect(() =>
    validateCatalog("tabler", [{ ...tabler[0], category: "../bad" }])
  ).toThrow("Invalid")
})

test("Lucide uses official categories, preserving independent source names", async () => {
  const lucide = await fixture("lucide", {
    "icons/refresh-cw.svg": svg,
    "icons/refresh-cw.json": JSON.stringify({
      categories: ["system", "arrows"],
    }),
  })
  expect((await archiveCatalog("lucide", lucide))[0].category).toBe("arrows")
})

test("Bootstrap reads YAML categories and preserves fill tokens inside original names", async () => {
  const cache = await fixture("bootstrap", {
    LICENSE: "Bootstrap MIT fixture license",
    "icons/star.svg": svg,
    "icons/star-fill.svg": svg,
    "icons/building-fill-add.svg": svg,
    "icons/leaf-fill.svg": svg,
    "icons/globe.svg": svg,
    "docs/content/icons/star.md": "---\ncategories:\n  - Shapes\n---\n",
    "docs/content/icons/star-fill.md": "---\ncategories: [Shapes]\n---\n",
    "docs/content/icons/building-fill-add.md":
      "---\ncategories:\n- Real world\n- Buildings\n---\n",
    "docs/content/icons/leaf-fill.md": "---\ntitle: Leaf fill\n---\n",
    "docs/content/icons/globe.md": "---\ncategories:\n---\n",
  })
  const icons = await archiveCatalog("bootstrap", cache)
  expect(icons.map(({ slug, category }) => [slug, category])).toEqual([
    ["building-fill-add", "buildings"],
    ["globe", "general"],
    ["leaf-fill", "general"],
    ["star-fill", "shapes"],
    ["star", "shapes"],
  ])
  validateCatalog("bootstrap", icons)
  const output = await temp()
  await importOfficialSets(["bootstrap"], {
    iconsDir: output,
    cacheDir: cache,
    log() {},
  })
  const manifest = JSON.parse(
    await readFile(path.join(output, "bootstrap/manifest.json"), "utf8")
  )
  expect(manifest.variantAliases).toEqual({ outline: "outline", solid: "fill" })
  expect(manifest.variants.solid.buildings.json).toEqual([
    "building-fill-add.json",
  ])
  expect(manifest.variants.outline.shapes.json).toEqual(["star.json"])
  expect(
    await readFile(path.join(output, "bootstrap/license.txt"), "utf8")
  ).toBe("Bootstrap MIT fixture license")
})

test("Ant Design imports only outlined/filled, keeps the original viewport and publishes paired assets", async () => {
  const original =
    '<?xml version="1.0" standalone="no"?><svg viewBox="0 0 1024 1024"><path d="M1 12h22"/></svg>'
  const cache = await fixture("antd", {
    LICENSE: "Ant Design MIT fixture license",
    "packages/icons-svg/svg/outlined/star.svg": original,
    "packages/icons-svg/svg/filled/star.svg": original,
    "packages/icons-svg/svg/twotone/star.svg": "not imported or parsed",
  })
  const icons = await archiveCatalog("antd", cache)
  expect(icons.map(({ slug, category }) => [slug, category])).toEqual([
    ["star", "general"],
    ["star-filled", "general"],
  ])
  validateCatalog("antd", icons)
  const output = await temp()
  await importOfficialSets(["antd"], {
    iconsDir: output,
    cacheDir: cache,
    log() {},
  })
  const manifest = JSON.parse(
    await readFile(path.join(output, "antd/manifest.json"), "utf8")
  )
  expect(manifest.variantAliases).toEqual({
    outline: "outlined",
    solid: "filled",
  })
  expect(Object.keys(manifest.variants)).toEqual(["outline", "solid"])
  expect(manifest.variants.outline.general.json).toEqual(["star.json"])
  expect(manifest.variants.solid.general.svg).toEqual(["star-filled.svg"])
  expect(manifest.sources.antd.revision).toBe(officialSources.antd.revision)
  for (const slug of ["star", "star-filled"]) {
    const data = JSON.parse(
      await readFile(path.join(output, `antd/data/${slug}.json`), "utf8")
    )
    expect(data[0][1].viewBox).toBe("0 0 1024 1024")
    expect(JSON.stringify(data)).toContain("currentColor")
    const symbol = await readFile(
      path.join(output, `antd/symbols/${slug}.svg`),
      "utf8"
    )
    // External symbols use the shared #icon ID and normalize the viewport to 24.
    expect(symbol).toContain('id="icon"')
    expect(symbol).toContain('viewBox="0 0 24 24"')
    expect(symbol).toContain('transform="scale(0.0234375)"')
  }
  expect(await readFile(path.join(output, "antd/license.txt"), "utf8")).toBe(
    "Ant Design MIT fixture license"
  )
})

test("Phosphor imports only regular/fill and preserves their actual filenames", async () => {
  const files = Object.fromEntries(
    ["regular", "thin", "light", "bold", "fill", "duotone"].map((weight) => [
      `SVGs/${weight}/star${weight === "regular" ? "" : "-" + weight}.svg`,
      svg,
    ])
  )
  files["SVGs/regular/book-user.svg"] = svg
  files["SVGs Flat/not-imported.svg"] = svg
  const cache = await fixture("phosphor", files)
  const metadata = path.join(
    cache,
    `phosphor-catalog-${phosphorMetadataRevision}`
  )
  await put(
    path.join(metadata, "types.ts"),
    'enum IconCategory { NATURE = "nature", OFFICE = "office" }'
  )
  await put(
    path.join(metadata, "icons.ts"),
    '{name: "star", categories: [IconCategory.NATURE]}, {name: "book-open-user", categories: [IconCategory.OFFICE]}'
  )
  const icons = await archiveCatalog("phosphor", cache)
  expect(icons).toHaveLength(3)
  expect(icons.map((icon) => icon.slug).sort()).toEqual([
    "book-user",
    "star",
    "star-fill",
  ])
  expect(icons.find((icon) => icon.slug === "star-fill")?.category).toBe(
    "nature"
  )
  expect(icons.find((icon) => icon.slug === "book-user")?.category).toBe(
    "office"
  )
})

test("flag names do not collide across aspect ratios or language folders", async () => {
  const cache = await fixture("flag", {
    "flags/4x3/us.svg": svg,
    "flags/1x1/us.svg": svg,
  })
  expect(
    (await archiveCatalog("flag", cache)).map((icon) => [
      icon.slug,
      icon.category,
    ])
  ).toEqual([
    ["us-square", "1x1"],
    ["us", "4x3"],
  ])
  const circles = await fixture("circle-flags", {
    "flags/en.svg": svg,
    "flags/language/en.svg": svg,
    "flags/other/united_nations.svg": svg,
  })
  const icons = await archiveCatalog("circle-flags", circles)
  expect(icons.map((icon) => icon.slug)).toEqual([
    "en",
    "language-en",
    "other-united-nations",
  ])
  expect(icons.every((icon) => icon.preserveStroke)).toBe(true)
})

test("Hugeicons verifies category markup, extracts unique links and normalizes special names", () => {
  const page =
    '"numberOfItems":1<a href="/icons/stroke-rounded/add-remove"><span class="text-muted-foreground text-[13px]">41</span></a>'
  expect([...hugeiconsCategories(page)]).toEqual([["add-remove", 41]])
  expect(() =>
    hugeiconsCategories(page.replace('"numberOfItems":1', '"numberOfItems":2'))
  ).toThrow("markup changed")
  expect(
    hugeiconsLinks('<a href="/icon/add-01"></a><a href="/icon/add-01"></a>')
  ).toEqual(["add-01"])
  expect(hugeiconsSlug("c++")).toBe("c-plus-plus")
})

test("set publication keeps recoverable backups and restores both sides on failure", async () => {
  const root = await temp()
  const stage = path.join(root, "stage"),
    live = path.join(root, "icons"),
    backup = path.join(root, "previous")
  for (const kind of ["data", "symbols"]) {
    await put(path.join(live, kind, "tabler/old/item.txt"), "old")
    await put(path.join(stage, kind, "tabler/new/item.txt"), "new")
    await put(path.join(live, kind, "custom/item.txt"), "keep")
  }
  await publishSet(stage, live, backup, "tabler")
  for (const kind of ["data", "symbols"]) {
    expect(
      await readFile(path.join(live, kind, "tabler/new/item.txt"), "utf8")
    ).toBe("new")
    expect(
      await readFile(path.join(backup, kind, "tabler/old/item.txt"), "utf8")
    ).toBe("old")
    expect(
      await readFile(path.join(live, kind, "custom/item.txt"), "utf8")
    ).toBe("keep")
  }
  await put(path.join(stage, "data/tabler/incomplete.txt"), "incomplete")
  await expect(
    publishSet(stage, live, path.join(root, "rollback"), "tabler")
  ).rejects.toThrow()
  for (const kind of ["data", "symbols"])
    expect(
      await readFile(path.join(live, kind, "tabler/new/item.txt"), "utf8")
    ).toBe("new")
})

test("official importer validates options before network requests or writes", async () => {
  await expect(
    importOfficialSets(["tabler"], {
      iconsDir: "/unused",
      cacheDir: "/unused/cache",
    })
  ).rejects.toThrow("overlap")
  await expect(
    importOfficialSets(["tabler"], {
      iconsDir: "/unused",
      cacheDir: "/other",
      concurrency: 0,
    })
  ).rejects.toThrow("Concurrency")
})

test("parallel conversion is bounded and waits for in-flight workers after a failure", async () => {
  let active = 0,
    maximum = 0,
    finished = 0
  await parallel([1, 2, 3, 4, 5], 2, async () => {
    active++
    maximum = Math.max(maximum, active)
    await new Promise((resolve) => setTimeout(resolve, 1))
    active--
    finished++
  })
  expect(maximum).toBe(2)
  expect(finished).toBe(5)
  await expect(
    parallel([1, 2, 3], 2, async (value) => {
      if (value === 1) throw new Error("fail")
      await new Promise((resolve) => setTimeout(resolve, 1))
    })
  ).rejects.toThrow("fail")
})
