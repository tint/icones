import { afterEach, expect, test } from "bun:test"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createLocalCatalog, maxFileBytes } from "../src/catalog.ts"

const temporary: string[] = []
const drawing = [["path", { d: "M0 0h10" }]] as const

async function temp() {
  const root = await mkdtemp(path.join(tmpdir(), "icones-mcp-catalog-"))
  temporary.push(root)
  return root
}

async function write(root: string, file: string, content: string) {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true })
  await writeFile(path.join(root, file), content)
}

async function manifest(root: string, prefix = "demo", alias = "original") {
  await write(
    root,
    `${prefix}/manifest.json`,
    JSON.stringify({
      version: 1,
      prefix,
      variants: {
        outline: { general: { json: ["one.json"], svg: ["one.svg"] } },
      },
      variantAliases: { outline: "line" },
      aliases: { [alias]: { suffix: "" } },
      sources: {
        upstream: {
          url: "https://example.test",
          revision: "one",
          importedAt: "2026-09-14",
        },
      },
    })
  )
}

afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  )
})

test("MCP metadata stays a connection snapshot while drawing and license reads stay fresh", async () => {
  const root = await temp()
  await manifest(root)
  await write(root, "demo/data/one.json", JSON.stringify(drawing))
  await write(root, "demo/license.txt", "Original license\n")
  const before = (await readdir(root, { recursive: true })).toSorted()
  const catalog = await createLocalCatalog(root)
  expect(Object.keys(catalog).toSorted()).toEqual([
    "getIcon",
    "getLicense",
    "listSets",
    "search",
  ])
  const first = await catalog.getIcon("original:one", "both")
  expect(first).toMatchObject({
    name: "demo:one",
    requestedName: "original:one",
    variant: "outline",
    variantAlias: "line",
    data: drawing,
  })
  expect((await catalog.search()).variants).toEqual([
    { id: "outline", count: 1, alias: "line" },
  ])
  first.sources.upstream!.revision = "mutated"
  expect((await catalog.listSets()).sets[0]!.sources.upstream!.revision).toBe(
    "one"
  )
  expect((await catalog.getLicense("demo")).license).toBe("Original license\n")
  expect((await readdir(root, { recursive: true })).toSorted()).toEqual(before)
  await write(
    root,
    "demo/data/one.json",
    JSON.stringify(drawing).replace("h10", "h20")
  )
  await write(root, "demo/license.txt", "New license\n")
  expect((await catalog.getIcon("demo:one", "svg")).svg).toContain("h20")
  expect((await catalog.getLicense("demo")).license).toBe("New license\n")
  const file = path.join(root, "demo/manifest.json")
  await writeFile(
    file,
    (await readFile(file, "utf8"))
      .replaceAll("one.json", "two.json")
      .replaceAll("one.svg", "two.svg")
  )
  expect((await catalog.search()).icons[0]!.name).toBe("demo:one")
  expect((await (await createLocalCatalog(root)).search()).icons[0]!.name).toBe(
    "demo:two"
  )
})

test("MCP reads legacy category and flat layouts without parsing unrelated bodies", async () => {
  const root = await temp()
  await write(root, "demo/shapes/one.json", JSON.stringify(drawing))
  await write(root, "demo/data/two.json", JSON.stringify(drawing))
  await write(root, "demo/shapes/broken.json", "invalid JSON")
  await write(root, "demo/shapes/nested/ignored.json", JSON.stringify(drawing))
  const catalog = await createLocalCatalog(root)
  const first = await catalog.search({ limit: 2 })
  expect(first.total).toBe(3)
  expect(first.nextOffset).toBe(2)
  expect(first.icons.map((icon) => icon.name)).toEqual([
    "demo:broken",
    "demo:one",
  ])
  expect((await catalog.getIcon("demo:two", "json")).category).toBe("general")
  expect((await catalog.getIcon("demo:one", "json")).data).toEqual(drawing)
  await expect(catalog.getIcon("demo:broken", "json")).rejects.toThrow()
  await expect(catalog.getLicense("demo")).rejects.toThrow("No license.txt")
  expect(JSON.stringify(first)).not.toContain("file")
})

test("MCP does not add unlisted files to a manifest-backed catalog", async () => {
  const root = await temp()
  await manifest(root)
  await write(root, "demo/data/unlisted.json", JSON.stringify(drawing))
  await write(root, "legacy/shapes/one.json", JSON.stringify(drawing))
  const catalog = await createLocalCatalog(root)
  expect((await catalog.listSets()).totalIcons).toBe(1)
  expect((await catalog.search()).icons.map((icon) => icon.name)).toEqual([
    "demo:one",
  ])
  await expect(catalog.getIcon("demo:unlisted", "json")).rejects.toThrow(
    "Icon not found"
  )
  // Indexing succeeds without drawing bodies, but requesting a missing body fails.
  await expect(catalog.getIcon("demo:one", "json")).rejects.toThrow()
})

test("MCP rejects duplicate legacy names and ambiguous collection aliases", async () => {
  const legacy = await temp()
  await write(legacy, "demo/first/one.json", "[]")
  await write(legacy, "demo/second/one.json", "[]")
  await expect(createLocalCatalog(legacy)).rejects.toThrow(
    "Duplicate legacy icon name"
  )
  const duplicate = await temp()
  await manifest(duplicate, "one")
  await manifest(duplicate, "two")
  await expect(createLocalCatalog(duplicate)).rejects.toThrow(
    "Duplicate collection alias"
  )
  const conflict = await temp()
  await manifest(conflict, "one", "two")
  await manifest(conflict, "two", "other")
  await expect(createLocalCatalog(conflict)).rejects.toThrow("Alias conflicts")
})

test("MCP rechecks replaced paths and rejects oversized artwork and manifests", async () => {
  const root = await temp()
  await manifest(root)
  await write(root, "demo/data/one.json", JSON.stringify(drawing))
  const catalog = await createLocalCatalog(root)
  await catalog.getIcon("demo:one", "json")
  await write(root, "demo/data/one.json", " ".repeat(maxFileBytes + 1))
  await expect(catalog.getIcon("demo:one", "json")).rejects.toThrow("1 MiB")
  const outside = await temp()
  await write(outside, "one.json", JSON.stringify(drawing))
  await rm(path.join(root, "demo/data/one.json"))
  await symlink(
    path.join(outside, "one.json"),
    path.join(root, "demo/data/one.json")
  )
  await expect(catalog.getIcon("demo:one", "json")).rejects.toThrow(
    "outside the configured icon directory"
  )
  await write(root, "demo/manifest.json", " ".repeat(maxFileBytes + 1))
  await expect(createLocalCatalog(root)).rejects.toThrow("1 MiB")
  await rm(path.join(root, "demo/manifest.json"))
  await mkdir(path.join(root, "demo/manifest.json"))
  await expect(createLocalCatalog(root)).rejects.toThrow("not a regular file")
})
