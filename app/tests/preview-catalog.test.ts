import { expect, test } from "bun:test"
import { loadCatalogSelection } from "../src/features/catalog/loader.ts"
import {
  groupIcons,
  mergeCatalogSets,
  publicSets,
} from "../src/features/catalog/types.ts"
import { createGalleryCatalogIndex } from "../src/features/catalog/query.ts"
import { readFilters } from "../src/features/catalog/state.ts"
import { createStandaloneSvg } from "../src/shared/icons/svg-export.ts"

const records = Array.from({ length: 537 }, (_, index) => ({
  name: `tabler:icon-${String(index).padStart(3, "0")}`,
  prefix: "tabler",
  category: index % 2 ? "animals" : "arrows",
}))
const queryRecords = createGalleryCatalogIndex(records)

test("preview collects all matching metadata with bounded concurrency and stable order, without UI pagination", async () => {
  let active = 0,
    peak = 0
  const seen: number[] = []
  const page = await loadCatalogSelection(
    "/icons",
    { set: "tabler" },
    new AbortController().signal,
    async (_base, query) => {
      seen.push(query?.offset ?? 0)
      active++
      peak = Math.max(peak, active)
      await new Promise((resolve) =>
        setTimeout(resolve, query?.offset === 100 ? 10 : 1)
      )
      active--
      return queryRecords(query)
    }
  )
  expect(page.icons).toEqual(records)
  expect(page.nextOffset).toBeNull()
  expect(peak).toBeLessThanOrEqual(4)
  expect(seen.sort((a, b) => a - b)).toEqual([0, 100, 200, 300, 400, 500])
  const groups = groupIcons(page.icons)
  expect(groups.map((group) => group.category.category)).toEqual([
    "Tabler · Animals",
    "Tabler · Arrows",
  ])
  expect(groups.flatMap((group) => group.icons)).toHaveLength(537)
})

test("catalog aggregation aborts stale selections and rejects partial/mutating responses", async () => {
  const controller = new AbortController()
  await expect(
    loadCatalogSelection(
      "/icons",
      {},
      controller.signal,
      async (_base, query) => {
        controller.abort()
        return queryRecords(query)
      }
    )
  ).rejects.toThrow()
  await expect(
    loadCatalogSelection(
      "/icons",
      {},
      new AbortController().signal,
      async (_base, query) => {
        const page = queryRecords(query)
        return { ...page, icons: page.icons.slice(1) }
      }
    )
  ).rejects.toThrow("Incomplete")
  await expect(
    loadCatalogSelection(
      "/icons",
      {},
      new AbortController().signal,
      async (_base, query) => ({
        ...queryRecords(query),
        total: query?.offset ? 999 : records.length,
      })
    )
  ).rejects.toThrow("changed")
})

test("brands have independent outline/filled names and search-aware category counts", () => {
  const data = ["github", "github-filled", "gitlab"].map((slug) => ({
    prefix: "brand",
    name: `brand:${slug}`,
    category: "logos",
    variant: slug.endsWith("-filled") ? "solid" : "outline",
  }))
  const queryCatalog = createGalleryCatalogIndex(data)
  expect(queryCatalog({ set: "brand", variant: "outline" }).total).toBe(2)
  const page = queryCatalog({
    set: "brand",
    q: "github",
    variant: "solid",
  })
  expect(page.icons.map((icon) => icon.name)).toEqual(["brand:github-filled"])
  expect(page.categories).toEqual([{ id: "logos", count: 1 }])
  expect(publicSets).not.toContain("all")
  expect(readFilters("?set=all&style=bad").set).toBe("tabler")
  expect(readFilters("?set=brand&style=solid&transport=fetch").variant).toBe(
    "solid"
  )
})

test("standalone exports preserve artwork, original widths and non-24 viewports", () => {
  const data = {
    width: 256,
    height: 256,
    body: '<path fill="none" stroke="currentColor" stroke-width="16" d="M0 0h256"/>',
  }
  const options = { size: 64, strokeWidth: 0, color: "#111827", rotation: 0 }
  expect(createStandaloneSvg(data, options)).toContain('stroke-width="16"')
  const customized = createStandaloneSvg(data, {
    ...options,
    strokeWidth: 3,
    rotation: 90,
  })
  expect(customized).toContain('stroke-width="32"')
  expect(customized).toContain('viewBox="0 0 256 256"')
  expect(customized).not.toContain("<use")
  expect(customized).not.toContain("var(")
  const flag = {
    ...data,
    body: '<path fill="#fff" stroke="#00f" stroke-width="2" d="M0 0h256"/>',
  }
  expect(createStandaloneSvg(flag, { ...options, strokeWidth: 3 })).toContain(
    'stroke-width="2"'
  )
})

test("Flag defaults to a valid ratio and preserves existing category deep links", () => {
  expect(readFilters("?set=flag").variant).toBe("1x1")
  expect(readFilters("?set=flag&category=1x1").variant).toBe("1x1")
  expect(
    readFilters("?set=flag&category=4x3&q=us&transport=fetch")
  ).toMatchObject({
    set: "flag",
    category: "",
    variant: "4x3",
    query: "us",
  })
  expect(readFilters("?set=flag&category=unknown").variant).toBe("1x1")
  expect(
    readFilters("?set=flag&category=language&variant=circle")
  ).toMatchObject({ category: "", variant: "circle" })
  expect(readFilters("?set=flag&category=other&variant=circle")).toMatchObject({
    category: "",
    variant: "circle",
  })
  expect(readFilters("?set=tabler&category=animals").category).toBe("animals")
  expect(readFilters("?set=circle-flags")).toMatchObject({
    set: "flag",
    category: "",
    variant: "circle",
  })
  expect(readFilters("?set=flag&category=circle")).toMatchObject({
    set: "flag",
    category: "",
    variant: "circle",
  })
  expect(
    readFilters("?set=circle-flags&category=language&q=en&transport=fetch")
  ).toMatchObject({
    set: "flag",
    category: "",
    variant: "circle",
    query: "en",
  })
})

test("Flag ratios filter existing data without repeating the ratio in group headings", () => {
  const flags = [
    { name: "flag:us-square", prefix: "flag", category: "1x1" },
    { name: "flag:us", prefix: "flag", category: "4x3" },
  ]
  for (const ratio of ["1x1", "4x3"]) {
    const page = createGalleryCatalogIndex(flags)({
      set: "flag",
      category: ratio,
    })
    expect(page.total).toBe(1)
    const [group] = groupIcons(page.icons)
    expect(group?.category).toEqual({ id: "flag/" + ratio, category: "Flag" })
    expect(group?.icons[0]?.category).toBe(ratio)
  }
})

test("Flag combines collection counts without losing circle artwork or counting it twice", () => {
  const merged = mergeCatalogSets([
    { id: "circle-flags", count: 444 },
    { id: "flag", count: 542 },
    { id: "tabler", count: 123 },
    { id: "not-public", count: 99 },
  ])
  expect(merged).toEqual([
    { id: "tabler", count: 123 },
    { id: "flag", count: 986 },
  ])
  expect(publicSets).not.toContain("circle-flags")
  expect(publicSets).toHaveLength(8)
  expect(mergeCatalogSets([{ id: "circle-flags", count: 10 }])).toEqual([
    { id: "flag", count: 10 },
  ])
})

test("circle groups retain real names and source categories for previews and exports", () => {
  const icons = [
    { name: "circle-flags:us", prefix: "circle-flags", category: "flags" },
    {
      name: "circle-flags:language-en",
      prefix: "circle-flags",
      category: "language",
    },
  ]
  const groups = groupIcons(icons)
  expect(groups).toHaveLength(1)
  expect(groups[0]?.category).toEqual({ id: "flag/circle", category: "Flag" })
  expect(groups[0]?.icons).toEqual(
    icons.map((icon) => ({
      ...icon,
      slug: icon.name.slice(icon.prefix.length + 1),
    }))
  )
})
