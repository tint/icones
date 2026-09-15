import { expect, test } from "bun:test"
import { createIconRepository } from "@icones/vite/server"
import { galleryCatalogOptions } from "../src/features/catalog/query.ts"
import { queryIconCatalog } from "../src/features/catalog/protocol.ts"
import {
  loadGallerySelection,
  loadGallerySummary,
} from "../src/features/catalog/service.ts"
import { readFilters } from "../src/features/catalog/state.ts"

const repository = createIconRepository(
  new URL("../../packages/icons", import.meta.url).pathname,
  { catalog: galleryCatalogOptions }
)
const fetcher: typeof queryIconCatalog = async (_base, query) => ({
  version: 1,
  ...(await repository.catalog(query)),
})

test.each([
  ["bootstrap", "outline", "fill", 1373, 705, "star-fill"],
  ["antd", "outlined", "filled", 447, 251, "star-filled"],
] as const)(
  "%s gallery filters canonical styles and displays upstream aliases",
  async (set, outline, solid, outlineCount, solidCount, solidStar) => {
    for (const [variant, count, sourceAlias] of [
      ["outline", outlineCount, outline],
      ["solid", solidCount, solid],
    ] as const) {
      const page = await loadGallerySelection(
        "/icons",
        { set, variant: sourceAlias },
        new AbortController().signal,
        fetcher
      )
      expect(page.total).toBe(count)
      expect(page.icons).toHaveLength(count)
      expect(page.icons.every((icon) => icon.variant === variant)).toBe(true)
      expect(page.variants).toEqual([
        {
          id: "outline",
          count: outlineCount,
          ...(outline !== "outline" ? { alias: outline } : {}),
        },
        { id: "solid", count: solidCount, alias: solid },
      ])
      expect(
        page.icons.some(
          (icon) =>
            icon.name === `${set}:${variant === "outline" ? "star" : solidStar}`
        )
      ).toBe(true)
    }
  }
)

test.each([
  ["circle", 406],
  ["1x1", 271],
  ["4x3", 271],
] as const)(
  "Flag gallery shows only flags for %s (%i)",
  async (variant, count) => {
    const page = await loadGallerySelection(
      "/icons",
      { set: "flag", variant },
      new AbortController().signal,
      fetcher
    )
    expect(page.total).toBe(count)
    expect(page.icons).toHaveLength(count)
    expect(
      page.icons.every(
        (icon) =>
          icon.prefix === "flag" &&
          icon.category === "flags" &&
          icon.variant === variant
      )
    ).toBe(true)
    expect(page.sets.find((set) => set.id === "flag")?.count).toBe(948)
    expect(page.categories).toEqual([{ id: "flags", count }])
    expect(page.variants).toEqual([
      { id: "1x1", count: 271 },
      { id: "4x3", count: 271 },
      { id: "circle", count: 406 },
    ])
  }
)

test("hidden-only searches and old category queries never expose hidden artwork", async () => {
  const page = await loadGallerySelection(
    "/icons",
    {
      set: "flag",
      variant: "circle",
      category: "language",
      q: "language",
    },
    new AbortController().signal,
    fetcher
  )
  expect(page.icons).toEqual([])
  expect(page.total).toBe(0)
  expect(page.categories).toEqual([])
  expect(page.sets.find((set) => set.id === "flag")?.count).toBe(0)
  expect(page.variants).toEqual([
    { id: "1x1", count: 0 },
    { id: "4x3", count: 0 },
    { id: "circle", count: 0 },
  ])
})

test("homepage and other collections use the same visible Flag count", async () => {
  const page = await loadGallerySelection(
    "/icons",
    { set: "lucide", variant: "outline" },
    new AbortController().signal,
    fetcher
  )
  expect(page.total).toBe(1818)
  expect(page.categories).toHaveLength(41)
  expect(page.sets.find((set) => set.id === "flag")?.count).toBe(948)
  const summaryRequests: (string | undefined)[] = []
  const summary = await loadGallerySummary(
    "/icons",
    new AbortController().signal,
    (base, query, options) => {
      summaryRequests.push(query?.set)
      return fetcher(base, query, options)
    }
  )
  // Phosphor no longer needs a second query to subtract hidden weights.
  expect(summaryRequests).toEqual([undefined, "flag"])
  expect(summary.total).toBe(20785)
  expect(summary.sets.find((set) => set.id === "flag")?.count).toBe(948)
  expect(summary.sets.find((set) => set.id === "phosphor")?.count).toBe(3024)
  expect(page.sets.find((set) => set.id === "phosphor")?.count).toBe(3024)
})

test.each(["outline", "solid"])(
  "Phosphor inventory contains only outline/solid with source aliases: %s",
  async (variant) => {
    const page = await loadGallerySelection(
      "/icons",
      { set: "phosphor", variant },
      new AbortController().signal,
      fetcher
    )
    expect(page.variants).toEqual([
      { id: "outline", count: 1512, alias: "regular" },
      { id: "solid", count: 1512, alias: "fill" },
    ])
    expect(page.total).toBe(1512)
    expect(page.icons).toHaveLength(1512)
    expect(page.icons.every((icon) => icon.variant === variant)).toBe(true)
    expect(page.sets.find((set) => set.id === "phosphor")?.count).toBe(3024)
  }
)

test.each(["bold", "duotone", "light", "thin"])(
  "removed Phosphor style %s falls back before fetching artwork",
  async (variant) => {
    const filters = readFilters(
      `?set=phosphor&variant=${variant}&category=arrows&q=arrow&transport=fetch`
    )
    expect(filters).toEqual({
      set: "phosphor",
      variant: "outline",
      category: "arrows",
      query: "arrow",
    })
    const calls: string[] = []
    const page = await loadGallerySelection(
      "/icons",
      { set: "phosphor", variant, category: "arrows", q: "arrow" },
      new AbortController().signal,
      async (base, query = {}, options) => {
        if (query.set === "phosphor") calls.push(query.variant ?? "")
        return fetcher(base, query, options)
      }
    )
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every((value) => value === "outline")).toBe(true)
    expect(page.icons.length).toBeGreaterThan(0)
    expect(
      page.icons.every(
        (icon) => icon.variant === "outline" && icon.category === "arrows"
      )
    ).toBe(true)
  }
)

test("removed styles are absent from queries and direct repository reads", async () => {
  const page = await loadGallerySelection(
    "/icons",
    { set: "phosphor", variant: "thin", q: "star-thin" },
    new AbortController().signal,
    fetcher
  )
  expect(page.total).toBe(0)
  expect(page.icons).toEqual([])
  expect(page.categories).toEqual([])
  expect(page.variants).toEqual([
    { id: "outline", count: 0, alias: "regular" },
    { id: "solid", count: 0, alias: "fill" },
  ])
  expect(page.sets.find((set) => set.id === "phosphor")?.count ?? 0).toBe(0)
  for (const variant of ["bold", "duotone", "light", "thin"]) {
    const raw = await repository.catalog({ set: "phosphor", variant })
    expect(raw.total).toBe(0)
    expect(await repository.get(`phosphor:star-${variant}`)).toBeNull()
  }
  expect(readFilters("?set=bootstrap&variant=solid").variant).toBe("solid")
  expect(readFilters("?set=flag&variant=circle").variant).toBe("circle")
})

test("Flag browsing policy still preserves non-flag artwork in the resource package", async () => {
  const raw = await repository.catalog({ set: "flag", variant: "circle" })
  expect(raw.total).toBe(444)
  expect(raw.categories).toContainEqual({ id: "language", count: 27 })
  expect(raw.categories).toContainEqual({ id: "other", count: 11 })
  expect(
    repository.manifests.get("flag")?.variants.circle?.language?.json
  ).toHaveLength(27)
  const hidden = (
    await repository.catalog({ set: "flag", category: "other", limit: 1 })
  ).icons[0]!
  expect((await repository.get(hidden.name))?.length).toBeGreaterThan(0)
})
