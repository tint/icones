import { afterEach, expect, test } from "bun:test"
import { execFile } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import {
  downloadIcons,
  readDownloadConfig,
} from "../../icon-builder/src/import/api.ts"
import { createIconRepository, updateIconManifest } from "@icones/vite/server"
import { iconToElementData } from "@icones/vite/tooling/elements"
import { elementDataToIcon } from "@icones/core/svg-data"
import { generateSymbols } from "../../icon-builder/src/generate/symbols.ts"

const temporary: string[] = []
async function directory() {
  const root = await mkdtemp(path.join(tmpdir(), "iconify-download-test-"))
  temporary.push(root)
  return root
}
afterEach(async () => {
  for (const root of temporary.splice(0))
    await rm(root, { recursive: true, force: true })
})
const star = { body: '<path d="M1 1h20"/>', width: 24, height: 24 }
const filled = { body: '<circle cx="12" cy="12" r="10"/>' }
const collection = {
  prefix: "test",
  categories: { Shapes: ["star", "star-filled"], Arrows: ["arrow"] },
  uncategorized: ["other"],
  aliases: { reverse: "arrow" },
  hidden: ["old"],
}
function remote(
  metadata: unknown = collection,
  resolve?: (names: string[]) => unknown
) {
  const urls: URL[] = []
  const fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    urls.push(url)
    if (url.pathname.endsWith("/collection")) return Response.json(metadata)
    return Response.json(
      resolve?.(url.searchParams.get("icons")!.split(",")) ?? {
        prefix: "test",
        width: 24,
        height: 24,
        icons: {
          star,
          "star-filled": filled,
          arrow: star,
          other: star,
          old: star,
        },
        aliases: { reverse: { parent: "arrow", hFlip: true } },
      }
    )
  }) as typeof globalThis.fetch
  return { fetch, urls }
}
async function read(iconsDir: string, file: string) {
  return JSON.parse(await readFile(path.join(iconsDir, file), "utf8"))
}
async function files(iconsDir: string) {
  const repository = createIconRepository(iconsDir)
  await repository.ready()
  return [...repository.files.keys()].sort()
}

test("downloads exact names, resolves aliases and inherited dimensions, never saves extra API icons", async () => {
  const iconsDir = await directory()
  const api = remote()
  const result = await downloadIcons(
    [{ prefix: "test", icons: ["star", "reverse", "star"] }],
    { iconsDir, fetch: api.fetch }
  )
  expect(result.downloaded).toBe(2)
  expect(result.symbols).toBe(2)
  expect(api.urls[1]!.searchParams.get("icons")).toBe("reverse,star")
  expect(await files(iconsDir)).toEqual([
    "test/data/reverse.json",
    "test/data/star.json",
  ])
  expect(await read(iconsDir, "test/data/reverse.json")).toEqual(
    iconToElementData({ ...star, hFlip: true })
  )
  expect((await readdir(iconsDir)).sort()).toEqual(["test"])
  const svg = await readFile(
    path.join(iconsDir, "test/symbols/reverse.svg"),
    "utf8"
  )
  expect(svg.match(/<symbol\b/g)).toHaveLength(1)
  expect(svg).toContain('id="icon"')
  expect(svg).toContain("scale(-1 1)")
})

test("Phosphor API selection excludes unconfigured weights before downloading bodies", async () => {
  const names = [
    "star",
    "star-fill",
    "star-bold",
    "star-duotone",
    "star-light",
    "star-thin",
  ]
  const metadata = { prefix: "phosphor", categories: { Shapes: names } }
  for (const selection of [
    { icons: "*" as const },
    { categories: ["Shapes"] },
  ]) {
    const iconsDir = await directory()
    const api = remote(metadata, () => ({
      prefix: "phosphor",
      icons: Object.fromEntries(names.map((name) => [name, star])),
    }))
    const result = await downloadIcons([{ prefix: "phosphor", ...selection }], {
      iconsDir,
      fetch: api.fetch,
    })
    expect(result.selected).toBe(2)
    expect(api.urls[1]!.searchParams.get("icons")).toBe("star,star-fill")
    expect(await files(iconsDir)).toEqual([
      "phosphor/data/star-fill.json",
      "phosphor/data/star.json",
    ])
    expect(
      Object.keys((await read(iconsDir, "phosphor/manifest.json")).variants)
    ).toEqual(["outline", "solid"])
    expect(
      (await read(iconsDir, "phosphor/manifest.json")).variantAliases
    ).toEqual({
      outline: "regular",
      solid: "fill",
    })
  }
  const iconsDir = await directory()
  const api = remote(metadata)
  await expect(
    downloadIcons([{ prefix: "phosphor", icons: ["star", "star-thin"] }], {
      iconsDir,
      fetch: api.fetch,
    })
  ).rejects.toThrow("Unsupported collection style")
  expect(api.urls).toHaveLength(1)
  expect(await readdir(iconsDir)).toEqual([])
})

test("whole-set downloads deduplicate categories and exclude hidden/alias entries", async () => {
  const iconsDir = await directory()
  const api = remote({
    ...collection,
    categories: { Z: ["star", "old"], A: ["star", "star-filled", "reverse"] },
  })
  await downloadIcons([{ prefix: "test", icons: "*" }], {
    iconsDir,
    fetch: api.fetch,
  })
  expect(await files(iconsDir)).toEqual([
    "test/data/other.json",
    "test/data/star-filled.json",
    "test/data/star.json",
  ])
  expect(api.urls[1]!.searchParams.get("icons")).toBe("other,star,star-filled")
})

test("category filters and explicit category overrides produce unique paths", async () => {
  const iconsDir = await directory()
  const api = remote()
  await downloadIcons(
    [
      {
        prefix: "test",
        categories: ["shapes"],
        icons: ["other"],
        categoryOverrides: { star: "favorites" },
        fallbackCategory: "misc",
      },
    ],
    { iconsDir, fetch: api.fetch }
  )
  expect(await files(iconsDir)).toEqual([
    "test/data/other.json",
    "test/data/star-filled.json",
    "test/data/star.json",
  ])
  await expect(
    downloadIcons([{ prefix: "test", categories: ["Not a category"] }], {
      iconsDir,
      fetch: api.fetch,
    })
  ).rejects.toThrow("Unknown category")
})

test("repeated runs keep existing JSON and paths; force updates only selected bodies", async () => {
  const iconsDir = await directory()
  const api = remote()
  const selected = [{ prefix: "test", icons: ["star"] }]
  await mkdir(path.join(iconsDir, "test/data"), { recursive: true })
  await writeFile(
    path.join(iconsDir, "test/data/star.json"),
    JSON.stringify([["custom", { key: "0" }]])
  )
  await writeFile(
    path.join(iconsDir, "test/data/private.json"),
    JSON.stringify([["private", { key: "0" }]])
  )
  for (const slug of ["star", "private"])
    await updateIconManifest(iconsDir, {
      prefix: "test",
      slug,
      category: "custom",
      variant: "outline",
    })
  const kept = await downloadIcons(selected, { iconsDir, fetch: api.fetch })
  expect(kept.skipped).toBe(1)
  expect(api.urls).toHaveLength(1)
  expect(await read(iconsDir, "test/data/star.json")).toEqual([
    ["custom", { key: "0" }],
  ])
  await downloadIcons(selected, { iconsDir, fetch: api.fetch, force: true })
  expect(await read(iconsDir, "test/data/star.json")).toEqual(
    iconToElementData(star)
  )
  expect(await read(iconsDir, "test/data/private.json")).toEqual([
    ["private", { key: "0" }],
  ])
  expect(await files(iconsDir)).toEqual([
    "test/data/private.json",
    "test/data/star.json",
  ])
  expect(
    (await readdir(path.join(iconsDir, "test/data"))).some((name) =>
      name.endsWith(".download")
    )
  ).toBe(false)
})

test("dry run downloads metadata only and does not create an output directory", async () => {
  const root = await directory()
  const iconsDir = path.join(root, "not-created")
  const api = remote()
  const result = await downloadIcons([{ prefix: "test", icons: "*" }], {
    iconsDir,
    fetch: api.fetch,
    dryRun: true,
  })
  expect(result.pending).toBe(4)
  expect(result.downloaded).toBe(0)
  expect(api.urls).toHaveLength(1)
  expect(await readdir(root)).toEqual([])
})

test("data batches are bounded and run at the configured concurrency", async () => {
  const iconsDir = await directory()
  const names = Array.from({ length: 123 }, (_, i) => `icon-${i}`)
  let running = 0
  let maximum = 0
  const batches: string[][] = []
  const fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith("/collection"))
      return Response.json({ prefix: "test", uncategorized: names })
    const batch = url.searchParams.get("icons")!.split(",")
    batches.push(batch)
    running++
    maximum = Math.max(maximum, running)
    await new Promise((resolve) => setTimeout(resolve, 5))
    running--
    return Response.json({
      prefix: "test",
      icons: Object.fromEntries(batch.map((name) => [name, star])),
    })
  }) as typeof globalThis.fetch
  const result = await downloadIcons([{ prefix: "test", icons: "*" }], {
    iconsDir,
    fetch,
    concurrency: 2,
  })
  expect(result.downloaded).toBe(123)
  expect(batches.map((batch) => batch.length).sort((a, b) => a - b)).toEqual([
    23, 50, 50,
  ])
  expect(maximum).toBe(2)
  expect(await files(iconsDir)).toHaveLength(123)
})

test("missing, wrong-set, and malformed icon responses never leave partial batch files", async () => {
  for (const response of [
    { prefix: "wrong", icons: { star } },
    { prefix: "test", icons: { star }, not_found: ["missing"] },
    { prefix: "test", icons: { star, missing: { body: "<path/>", width: 0 } } },
  ]) {
    const iconsDir = await directory()
    await expect(
      downloadIcons([{ prefix: "test", icons: ["star", "missing"] }], {
        iconsDir,
        fetch: remote(collection, () => response).fetch,
      })
    ).rejects.toThrow()
    expect(await readdir(iconsDir)).toEqual([])
  }
})

test("invalid selectors, paths, metadata and concurrency fail before body downloads", async () => {
  for (const value of [
    { sets: [] },
    { sets: [{ prefix: "test" }] },
    { sets: [{ prefix: "../outside", icons: "*" }] },
    { sets: [{ prefix: "test", icons: ["../../bad"] }] },
    {
      sets: [
        {
          prefix: "test",
          icons: ["star"],
          categoryOverrides: { star: "../bad" },
        },
      ],
    },
    {
      sets: [
        { prefix: "test", icons: "*" },
        { prefix: "test", icons: "*" },
      ],
    },
  ])
    expect(() => readDownloadConfig(value)).toThrow()
  const iconsDir = await directory()
  const api = remote({ prefix: "test", categories: { Other: ["../escape"] } })
  await expect(
    downloadIcons([{ prefix: "test", icons: "*" }], {
      iconsDir,
      fetch: api.fetch,
    })
  ).rejects.toThrow("categories")
  expect(api.urls).toHaveLength(1)
  await expect(
    downloadIcons([{ prefix: "test", icons: "*" }], {
      iconsDir,
      fetch: api.fetch,
      concurrency: 0,
    })
  ).rejects.toThrow("concurrency")
})

test("local set JSON resolves categories, aliases and hidden names without an API", async () => {
  const root = await directory()
  await writeFile(
    path.join(root, "icons.json"),
    JSON.stringify({
      prefix: "test",
      width: 32,
      height: 16,
      icons: {
        star: { body: "<path/>" },
        old: { body: "<old/>", hidden: true },
      },
      aliases: { reverse: { parent: "star", hFlip: true } },
      categories: { "Nice Shapes": ["star"] },
    })
  )
  const iconsDir = path.join(root, "data")
  await downloadIcons(
    [{ prefix: "test", icons: ["reverse"], source: "icons.json" }],
    {
      iconsDir,
      sourceDir: root,
      fetch: (() => {
        throw new Error("No network")
      }) as unknown as typeof fetch,
    }
  )
  expect(
    elementDataToIcon(await read(iconsDir, "test/data/reverse.json"))
  ).toMatchObject({
    width: 32,
    height: 16,
  })
})

test("CLI supports alternate config with relative paths, dry-run and nonzero errors", async () => {
  const root = await directory()
  const script = fileURLToPath(
    new URL("../../icon-builder/src/cli/download-api.ts", import.meta.url)
  )
  await writeFile(
    path.join(root, "source.json"),
    JSON.stringify({ prefix: "test", icons: { star } })
  )
  await writeFile(
    path.join(root, "config.json"),
    JSON.stringify({
      iconsDir: "result",
      sets: [{ prefix: "test", source: "source.json", icons: "*" }],
    })
  )
  const run = promisify(execFile)
  const { stdout } = await run(
    process.execPath,
    [script, "--config", path.join(root, "config.json"), "--dry-run"],
    { cwd: tmpdir() }
  )
  expect(stdout).toContain("1 pending")
  expect((await readdir(root)).sort()).toEqual(["config.json", "source.json"])
  await run(
    process.execPath,
    [script, "--config", path.join(root, "config.json")],
    { cwd: tmpdir() }
  )
  expect(await files(path.join(root, "result"))).toEqual([
    "test/data/star.json",
  ])
  await expect(
    run(process.execPath, [script, "--icons", "star"], { cwd: root })
  ).rejects.toMatchObject({ code: 1 })
})

test("set/category paths mirror both formats and missing/stale symbols are repaired without fetching JSON", async () => {
  const iconsDir = await directory()
  const api = remote()
  const selection = [{ prefix: "test", icons: ["star"] }]
  await downloadIcons(selection, { iconsDir, fetch: api.fetch })
  expect(await files(iconsDir)).toEqual(["test/data/star.json"])
  const symbolFile = path.join(iconsDir, "test/symbols/star.svg")
  const original = await readFile(symbolFile, "utf8")
  await unlink(symbolFile)
  const repaired = await downloadIcons(selection, {
    iconsDir,
    fetch: api.fetch,
  })
  expect(repaired.downloaded).toBe(0)
  expect(repaired.skipped).toBe(1)
  expect(repaired.symbols).toBe(1)
  expect(api.urls.filter((url) => url.pathname.endsWith(".json"))).toHaveLength(
    1
  )
  expect(await readFile(symbolFile, "utf8")).toBe(original)
  await writeFile(symbolFile, "stale")
  expect(await generateSymbols(iconsDir)).toEqual({ total: 1, generated: 1 })
  expect(await generateSymbols(iconsDir)).toEqual({ total: 1, generated: 0 })
  expect(await readFile(symbolFile, "utf8")).toBe(original)
})
