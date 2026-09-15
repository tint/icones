import { afterEach, expect, spyOn, test } from "bun:test"
import * as fs from "node:fs/promises"
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createIconRepository, type IconRecord } from "@icones/vite/server"
import { selectCatalog } from "@icones/core/catalog"
import type { CatalogQuery } from "@icones/core/catalog"

const directories: string[] = []
const original = [["g", { children: [["path", { d: "M0 0h10" }]] }]] as const
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "icones-repository-cache-"))
  directories.push(root)
  await mkdir(path.join(root, "demo/general"), { recursive: true })
  await Promise.all(
    ["one", "two", "three"].map((name) =>
      writeFile(
        path.join(root, `demo/general/${name}.json`),
        JSON.stringify(original)
      )
    )
  )
  return root
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

test("repository deduplicates reads and returns immutable, bounded LRU data", async () => {
  const repository = createIconRepository(await fixture(), { maxEntries: 2 })
  const copies = await Promise.all(
    Array.from({ length: 20 }, () => repository.get("demo:one"))
  )
  const one = copies[0]!
  expect(copies.every((data) => data === one)).toBe(true)
  expect(Object.isFrozen(one)).toBe(true)
  expect(Object.isFrozen(one[0]![1].children)).toBe(true)
  expect(Object.isFrozen(one[0]![1])).toBe(true)
  const two = await repository.get("demo:two")
  expect(await repository.get("demo:one")).toBe(one)
  await repository.get("demo:three")
  expect(await repository.get("demo:one")).toBe(one)
  expect(await repository.get("demo:two")).not.toBe(two)
  expect(await repository.get("demo:missing")).toBeNull()
})

test("file edits, replacements, corruption and deletion never reuse cached content", async () => {
  const root = await fixture()
  const file = path.join(root, "demo/general/one.json")
  const repository = createIconRepository(root)
  const first = await repository.get("demo:one")
  const before = await stat(file)
  const changed = (await readFile(file, "utf8")).replace("h10", "h20")
  await writeFile(file, changed)
  // Same byte size and restored mtime: ctime/inode still invalidate the cache.
  await utimes(file, before.atime, before.mtime)
  const edited = await repository.get("demo:one")
  expect(edited).not.toBe(first)
  expect(JSON.stringify(edited)).toContain("h20")
  await writeFile(file + ".tmp", JSON.stringify(original))
  await rename(file + ".tmp", file)
  expect(await repository.get("demo:one")).toEqual(original)
  await writeFile(file, "broken")
  await expect(repository.get("demo:one")).rejects.toThrow()
  await unlink(file)
  await expect(repository.get("demo:one")).rejects.toThrow()
  await writeFile(file, changed)
  expect(JSON.stringify(await repository.get("demo:one"))).toContain("h20")
})

test("repository refresh clears cached data and notices added/deleted names", async () => {
  const root = await fixture()
  const repository = createIconRepository(root)
  const first = await repository.get("demo:one")
  expect((await repository.catalog()).total).toBe(3)
  await unlink(path.join(root, "demo/general/two.json"))
  await writeFile(
    path.join(root, "demo/general/four.json"),
    JSON.stringify(original)
  )
  await Promise.all([repository.refresh(), repository.refresh()])
  expect(await repository.get("demo:one")).not.toBe(first)
  const page = await repository.catalog()
  expect(page.icons.map((icon) => icon.name)).toEqual([
    "demo:four",
    "demo:one",
    "demo:three",
  ])
  expect(await repository.get("demo:two")).toBeNull()
})

test("indexed queries preserve filtering, ordering, facets and page isolation", async () => {
  const repository = createIconRepository(await fixture(), { maxQueries: 2 })
  await repository.ready()
  const records: IconRecord[] = []
  for (let index = 0; index < 120; index++) {
    const prefix = `set-${index % 3}`
    const category = `category-${index % 5}`
    const slug = `icon-${index}${index % 2 ? "-filled" : ""}`
    const record = {
      name: `${prefix}:${slug}`,
      prefix,
      category,
      file: `${prefix}/${category}/${slug}.json`,
    }
    repository.add(record)
    records.push(record)
  }
  records.push(
    ...["one", "two", "three"].map((name) => ({
      name: `demo:${name}`,
      prefix: "demo",
      category: "general",
      file: `demo/general/${name}.json`,
    }))
  )
  const queries: CatalogQuery[] = [
    {},
    { set: "set-1" },
    { category: "category-2" },
    { q: "  ICON  CATEGORY-1  ", set: "set-2" },
    { q: "icon", suffix: "-filled" },
    { excludeSuffix: "-filled" },
    { set: "set-1", category: "category-3", suffix: "-filled" },
    { q: "absent" },
  ]
  for (const query of queries) {
    for (const offset of [0, 1, 10, 200]) {
      const options = { ...query, offset, limit: 7 }
      expect(await repository.catalog(options)).toEqual(
        selectCatalog(records, options)
      )
    }
  }
  const page = await repository.catalog({ set: "set-1", limit: 2 })
  page.icons[0]!.name = "corrupted"
  page.sets[0]!.count = -1
  page.categories.length = 0
  expect(await repository.catalog({ set: "set-1", limit: 2 })).toEqual(
    selectCatalog(records, { set: "set-1", limit: 2 })
  )
  repository.add({
    name: "set-1:new",
    prefix: "set-1",
    category: "added",
    file: "set-1/added/new.json",
  })
  expect((await repository.catalog({ set: "set-1" })).total).toBe(41)
})

test("cache limits can disable retention and invalid limits fail immediately", async () => {
  const root = await fixture()
  const repository = createIconRepository(root, {
    maxEntries: 0,
    maxQueries: 0,
  })
  expect(await repository.get("demo:one")).not.toBe(
    await repository.get("demo:one")
  )
  expect(await repository.catalog()).toEqual(await repository.catalog())
  for (const value of [-1, 1.5, NaN, Infinity]) {
    expect(() => createIconRepository(root, { maxEntries: value })).toThrow(
      RangeError
    )
    expect(() => createIconRepository(root, { maxQueries: value })).toThrow(
      RangeError
    )
  }
})

test("failed scans do not replace a complete index and can be retried", async () => {
  const root = await fixture()
  const repository = createIconRepository(root)
  repository.add({
    name: "demo:manual",
    prefix: "demo",
    category: "general",
    file: "demo/general/manual.json",
  })
  await repository.ready()
  expect(repository.records.has("demo:manual")).toBe(true)
  await mkdir(path.join(root, "demo/duplicate"))
  const duplicate = path.join(root, "demo/duplicate/one.json")
  await writeFile(duplicate, JSON.stringify(original))
  await expect(repository.refresh()).rejects.toThrow("Duplicate")
  expect(repository.records.size).toBe(4)
  await unlink(duplicate)
  await repository.refresh()
  expect((await repository.catalog()).total).toBe(3)
})

test("a read started before refresh cannot repopulate the new content cache", async () => {
  const root = await fixture()
  const repository = createIconRepository(root)
  await repository.ready()
  let started!: () => void
  let finish!: (source: string) => void
  const ready = new Promise<void>((resolve) => {
    started = resolve
  })
  const delayed = new Promise<string>((resolve) => {
    finish = resolve
  })
  // Only the repository's UTF-8 overload is intercepted; retain the overloaded API type.
  const readSpy = spyOn(fs, "readFile").mockImplementationOnce(((
    _file: unknown,
    encoding: unknown
  ) => {
    expect(encoding).toBe("utf8")
    started()
    return delayed
  }) as unknown as typeof fs.readFile)
  const stale = repository.get("demo:one")
  try {
    await ready
    readSpy.mockRestore()
    await writeFile(
      path.join(root, "demo/general/one.json"),
      JSON.stringify(original).replace("h10", "h20")
    )
    await repository.refresh()
    const fresh = await repository.get("demo:one")
    finish(JSON.stringify(original))
    expect(JSON.stringify(await stale)).toContain("h10")
    expect(JSON.stringify(fresh)).toContain("h20")
    expect(await repository.get("demo:one")).toBe(fresh)
  } finally {
    readSpy.mockRestore()
    finish(JSON.stringify(original))
    await stale
  }
})
