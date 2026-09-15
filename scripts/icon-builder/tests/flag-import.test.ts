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
import { createIconRepository } from "@icones/vite/server"
import { importOfficialSets } from "../../icon-builder/src/import/official.ts"
import { officialSources } from "../../icon-builder/src/import/sources.ts"

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

test("official Flag imports both upstreams as one recoverable collection, including licenses", async () => {
  const root = await temp(),
    cache = path.join(root, "cache"),
    icons = path.join(root, "icons")
  const svg = '<svg viewBox="0 0 24 24"><path fill="#fff" d="M2 12h20"/></svg>'
  for (const source of ["flag", "circle-flags"] as const) {
    const config = officialSources[source]
    const directory = path.join(cache, source + "-" + config.revision)
    await put(path.join(directory, "complete"), config.revision)
    await put(
      path.join(directory, "extracted", config.license),
      source + " original license"
    )
    for (const file of source === "flag"
      ? ["flags/1x1/us.svg", "flags/4x3/us.svg"]
      : ["flags/us.svg", "flags/language/en.svg"])
      await put(path.join(directory, "extracted", file), svg)
  }
  const messages: string[] = []
  await importOfficialSets(["flag"], {
    iconsDir: icons,
    cacheDir: cache,
    log: (text) => messages.push(text),
  })
  const repository = createIconRepository(icons)
  await repository.ready()
  expect(repository.records.size).toBe(4)
  expect([...repository.manifests.keys()]).toEqual(["flag"])
  expect((await readdir(path.join(icons, "flag/data"))).sort()).toEqual([
    "language-en-circle.json",
    "us-circle.json",
    "us-square.json",
    "us.json",
  ])
  const license = await readFile(path.join(icons, "flag/license.txt"), "utf8")
  expect(license).toContain("flag original license")
  expect(license).toContain("circle-flags original license")
  await expect(
    importOfficialSets(["flag"], { iconsDir: icons, cacheDir: cache, log() {} })
  ).rejects.toThrow("already exists")
  await importOfficialSets(["circle-flags"], {
    iconsDir: icons,
    cacheDir: cache,
    force: true,
    log: (text) => messages.push(text),
  })
  const backup = messages.at(-1)!.split(" at ")[1]!
  expect(await readFile(path.join(backup, "flag/license.txt"), "utf8")).toBe(
    license
  )
  await repository.refresh()
  expect(repository.records.size).toBe(4)
})
