import { afterEach, expect, test } from "bun:test"
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readFile,
  unlink,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  createIconDataHandler,
  createIconRepository,
} from "@icones/vite/server"

const temporary: string[] = []

async function fixture() {
  const iconsDir = await mkdtemp(path.join(tmpdir(), "iconify-protocol-"))
  temporary.push(iconsDir)
  const dataDir = path.join(iconsDir, "data")
  // File-service fixtures are already generated artifacts, not build-tool output.
  for (const [name, tag] of Object.entries({
    "tabler/shapes/star": "path",
    "tabler/shapes/star-filled": "circle",
    "tabler/arrows/refresh": "path",
    "brand/logos/github": "path",
  })) {
    const file = path.join(dataDir, name + ".json")
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(
      file,
      JSON.stringify([[tag, { fill: "currentColor", key: "0" }]])
    )
    const symbol = path.join(iconsDir, "symbols", name + ".svg")
    await mkdir(path.dirname(symbol), { recursive: true })
    await writeFile(symbol, `<svg><symbol id="icon"><${tag}/></symbol></svg>`)
  }
  return dataDir
}

afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

test("repository indexes only metadata and does not parse unrelated SVG bodies", async () => {
  const dataDir = await fixture()
  await writeFile(
    path.join(dataDir, "tabler/shapes/broken.json"),
    "not valid JSON"
  )
  const repository = createIconRepository(dataDir)
  await repository.ready()
  expect(
    [...repository.records.values()].some((record) => "data" in record)
  ).toBe(false)
  expect(await repository.get("tabler:star")).toEqual([
    ["path", { fill: "currentColor", key: "0" }],
  ])
  expect((await repository.catalog({ limit: 1 })).total).toBe(5)
  await expect(repository.get("tabler:broken")).rejects.toThrow()
})

test("duplicate names are rejected across categories instead of resolving arbitrarily", async () => {
  const dataDir = await fixture()
  await writeFile(
    path.join(dataDir, "tabler/arrows/star.json"),
    JSON.stringify({ body: "<path/>" })
  )
  await expect(createIconRepository(dataDir).ready()).rejects.toThrow(
    "Duplicate"
  )
})

test("serves mirrored artifact paths and reads symbols directly without converting JSON", async () => {
  const dataDir = await fixture()
  const symbolsDir = path.join(dataDir, "../symbols")
  const handler = createIconDataHandler({ dataDir, symbolsDir })
  const get = (route: string, method = "GET") =>
    handler(new Request("https://icons.test/icons/" + route, { method }))
  const json = await get("data/tabler/shapes/star.json")
  expect(await json!.json()).toEqual([
    ["path", { fill: "currentColor", key: "0" }],
  ])
  const file = path.join(symbolsDir, "tabler/shapes/star.svg")
  const expected = await readFile(file, "utf8")
  expect(await (await get("symbols/tabler/shapes/star.svg"))!.text()).toBe(
    expected
  )
  // The native symbol route must not parse icon JSON or regenerate SVG per request.
  await writeFile(path.join(dataDir, "tabler/shapes/star.json"), "invalid JSON")
  expect(await (await get("tabler/star.svg"))!.text()).toBe(expected)
  expect(
    await (await get("symbols/tabler/shapes/star.svg", "HEAD"))!.text()
  ).toBe("")
  await unlink(file)
  expect((await get("tabler/star.svg"))!.status).toBe(404)
  expect((await get("symbols/%2e%2e%2fsecret.svg"))!.status).toBe(404)
  expect((await get("symbols/tabler/shapes/star.json"))!.status).toBe(404)
})
