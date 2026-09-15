import { afterEach, expect, test } from "bun:test"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  createIconDataHandler,
  createIconRepository,
} from "@icones/vite/server"
import { manifestEntries } from "@icones/core/manifest"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"
import { updateCollectionManifest } from "@icones/vite/tooling/collections"
import type { ElementData } from "@icones/core/element-types"
import { getIconSource } from "../../../../app/src/features/licenses/sources.ts"
import { galleryCatalogOptions } from "../../../../app/src/features/catalog/query.ts"

const roots: string[] = []

async function temp() {
  const root = await mkdtemp(path.join(tmpdir(), "icones-collections-"))
  roots.push(root)
  return root
}

async function put(file: string, content: string) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content)
}

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

const data: ElementData = [
  [
    "path",
    { fill: "none", stroke: "currentColor", strokeWidth: "2", d: "M2 12h20" },
  ],
]

test("all eight manifests exactly match their flat JSON/SVG inventory", async () => {
  const root = new URL("../../../../packages/icons/", import.meta.url).pathname
  const repository = createIconRepository(root, {
    catalog: galleryCatalogOptions,
  })
  await repository.ready()
  expect([...repository.manifests.keys()].sort()).toEqual([
    "antd",
    "bootstrap",
    "brand",
    "flag",
    "huge",
    "lucide",
    "phosphor",
    "tabler",
  ])
  expect(repository.records.size).toBe(20823)
  expect(repository.resolve("remix:star-line")).toBeUndefined()
  for (const [prefix, outline, solid, count] of [
    ["bootstrap", "outline", "fill", 2078],
    ["antd", "outlined", "filled", 698],
  ] as const) {
    expect(repository.manifests.get(prefix)?.variantAliases).toEqual({
      outline,
      solid,
    })
    expect((await repository.catalog({ set: prefix })).total).toBe(count)
    expect(await repository.get(`${prefix}:star`)).not.toBeNull()
  }
  expect(repository.resolve("bootstrap:building-fill-add")?.variant).toBe(
    "solid"
  )
  expect(repository.resolve("antd:star-filled")?.variant).toBe("solid")
  expect(repository.resolve("antd:star-twotone")).toBeUndefined()
  for (const [prefix, manifest] of repository.manifests) {
    const variants = Object.keys(manifest.variants)
    expect(variants).toEqual([...variants].sort())
    expect(
      variants.every((variant) =>
        (prefix === "flag"
          ? ["1x1", "4x3", "circle"]
          : ["outline", "solid"]
        ).includes(variant)
      )
    ).toBe(true)
    const names = manifestEntries(manifest)
      .map((entry) => entry.slug)
      .sort()
    for (const [kind, extension] of [
      ["data", ".json"],
      ["symbols", ".svg"],
    ]) {
      const files = await readdir(path.join(root, prefix, kind!), {
        withFileTypes: true,
      })
      expect(files.every((file) => file.isFile())).toBe(true)
      expect(files.map((file) => file.name).sort()).toEqual(
        names.map((name) => name + extension).sort()
      )
    }
    expect(
      (await readFile(path.join(root, prefix, "license.txt"), "utf8")).length
    ).toBeGreaterThan(100)
  }
  const phosphor = repository.manifests.get("phosphor")!
  expect(Object.keys(phosphor.variants)).toEqual(["outline", "solid"])
  expect(phosphor.variantAliases).toEqual({ outline: "regular", solid: "fill" })
  expect(phosphor.sources?.phosphor?.icons).toBe(3024)
  expect((await repository.catalog({ set: "phosphor" })).total).toBe(3024)
  for (const [variant, count] of [
    ["circle", 444],
    ["1x1", 271],
    ["4x3", 271],
  ] as const) {
    const page = await repository.catalog({ set: "flag", variant, limit: 1 })
    expect(page.total).toBe(count)
    expect(page.icons[0]?.variant).toBe(variant)
    expect(page.categories.some((item) => item.id === "flags")).toBe(true)
  }
  const empty = await repository.catalog({
    set: "flag",
    variant: "circle",
    q: "no-such-icon-in-collection",
  })
  expect(empty.total).toBe(0)
  expect(empty.variants).toEqual([
    { id: "1x1", count: 0 },
    { id: "4x3", count: 0 },
    { id: "circle", count: 0 },
  ])
  expect(repository.resolve("circle-flags:us")?.name).toBe("flag:us-circle")
  expect(repository.resolve("hugeicons:search-01")?.name).toBe("huge:search-01")
  expect(getIconSource("flag", "circle")?.url).toContain(
    "HatScripts/circle-flags"
  )
  expect(getIconSource("flag", "circle")?.id).toBe("circle-flags")
  expect(getIconSource("flag", "4x3")?.id).toBe("flag")
  expect(getIconSource("flag", "4x3")?.url).toContain("lipis/flag-icons")
})

test("removed Phosphor weights cannot be served through any resource route", async () => {
  const dataDir = new URL("../../../../packages/icons/", import.meta.url)
    .pathname
  const handler = createIconDataHandler({ dataDir })
  for (const style of ["bold", "duotone", "light", "thin"]) {
    for (const route of [
      `phosphor/data/star-${style}.json`,
      `phosphor/symbols/star-${style}.svg`,
    ]) {
      for (const method of ["GET", "HEAD"])
        expect(
          (
            await handler(
              new Request("https://test/icons/" + route, { method })
            )
          )?.status
        ).toBe(404)
    }
  }
})

test("flat routes, manifests, licenses, and legacy names share one lazy repository", async () => {
  const root = await temp()
  await put(path.join(root, "flag/data/us-circle.json"), JSON.stringify(data))
  await put(
    path.join(root, "flag/symbols/us-circle.svg"),
    createIconSymbolDocument(data)
  )
  await put(path.join(root, "flag/license.txt"), "Original notice")
  await updateCollectionManifest(root, {
    prefix: "flag",
    slug: "us-circle",
    variant: "circle",
    category: "flags",
  })
  const handler = createIconDataHandler({ dataDir: root })
  const get = async (route: string, method = "GET") =>
    (await handler(new Request("https://test/icons/" + route, { method })))!
  expect(await (await get("flag/data/us-circle.json")).json()).toEqual(data)
  expect(await (await get("flag/manifest.json")).json()).toMatchObject({
    variants: {
      circle: { flags: { json: ["us-circle.json"], svg: ["us-circle.svg"] } },
    },
  })
  expect(await (await get("flag/license.txt")).text()).toBe("Original notice")
  expect(await (await get("flag/symbols/us-circle.svg")).text()).toBe(
    await (await get("circle-flags/us.svg")).text()
  )
  expect(
    (await (await get("circle-flags.json?icons=us")).json()).icons.us.body
  ).toContain("M2 12h20")
  expect(await (await get("flag/data/us-circle.json", "HEAD")).text()).toBe("")
  for (const route of [
    "flag/data/us-circle.svg",
    "flag/symbols/us-circle.json",
    "flag/data/missing.json",
    "flag/data/flags/us-circle.json",
    "flag/license.txt/extra",
  ])
    expect((await get(route)).status).toBe(404)
  expect((await get("flag/manifest.json", "POST")).status).toBe(405)
  await put(path.join(root, "flag/data/us-circle.json"), "corrupt")
  expect((await get("catalog?set=flag&variant=circle")).status).toBe(200)
  expect((await get("flag/symbols/us-circle.svg")).status).toBe(200)
  expect((await get("flag/data/us-circle.json")).status).toBe(500)
})
