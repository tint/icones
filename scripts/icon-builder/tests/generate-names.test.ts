import { afterEach, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  stat,
  cp,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { generateNames } from "../../icon-builder/src/generate/names.ts"

const roots: string[] = []

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

function manifest(names = ["star", "star-filled"]) {
  return {
    version: 1,
    prefix: "demo",
    variants: {
      outline: {
        general: {
          json: names.map((name) => name + ".json"),
          svg: names.map((name) => name + ".svg"),
        },
      },
    },
  }
}

async function fixture(value: unknown = manifest()) {
  const root = await mkdtemp(path.join(tmpdir(), "icones-name-types-"))
  roots.push(root)
  await mkdir(path.join(root, "demo"))
  await writeFile(path.join(root, "demo/manifest.json"), JSON.stringify(value))
  return root
}

test("the relocated CLI generates names from scratch without recreating icons/types", async () => {
  const root = await fixture()
  const builder = path.join(root, "scripts/icon-builder")
  const icons = path.join(root, "packages/icons")
  // The private CLI shares the same validator as repositories and import tooling.
  // Copy its workspace dependency so this also runs outside the checkout/CWD.
  const core = path.join(root, "node_modules/@icones/core")
  const coreSource = new URL("../../../packages/core/", import.meta.url)
  const corePackage = JSON.parse(
    await readFile(new URL("package.json", coreSource), "utf8")
  )
  await mkdir(core, { recursive: true })
  for (const file of [
    "package.json",
    corePackage.exports["./manifest"].bun,
    corePackage.exports["./resource-types"].bun,
  ]) {
    const target = path.join(core, file)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(new URL(file, coreSource), target)
  }
  await cp(path.join(root, "demo"), path.join(icons, "demo"), {
    recursive: true,
  })
  for (const file of [
    "src/paths.ts",
    "src/shared/files.ts",
    "src/generate/names.ts",
    "src/cli/generate-names.ts",
  ]) {
    const target = path.join(builder, file)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(new URL(`../../icon-builder/${file}`, import.meta.url), target)
  }
  const run = async (...args: string[]) => {
    const child = Bun.spawn(
      [
        process.execPath,
        path.join(builder, "src/cli/generate-names.ts"),
        ...args,
      ],
      {
        cwd: tmpdir(),
        stdout: "pipe",
        stderr: "pipe",
      }
    )
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(stderr).toBe("")
    expect(code).toBe(0)
    return stdout
  }
  expect(await run()).toContain("2 icon names in 1 sets; types generated")
  expect(await run("--check")).toContain("types verified")
  expect(
    await readFile(path.join(root, "packages/names/types/demo.d.ts"), "utf8")
  ).toContain('"demo:star-filled"')
  expect(existsSync(path.join(icons, "types"))).toBe(false)
})

test("generation is deterministic, read-only in check mode, and removes stale names", async () => {
  const root = await fixture(manifest(["star-filled", "star"]))
  expect(await generateNames(root)).toEqual({
    sets: 1,
    icons: 2,
    changed: true,
  })
  const output = path.join(root, "types/demo.d.ts")
  const original = await readFile(output, "utf8")
  const timestamp = (await stat(output)).mtimeMs
  const indexFile = path.join(root, "types/index.d.ts")
  const index = await readFile(indexFile, "utf8")
  const indexTimestamp = (await stat(indexFile)).mtimeMs
  await writeFile(
    path.join(root, "demo/manifest.json"),
    JSON.stringify(manifest())
  )
  expect((await generateNames(root)).changed).toBe(false)
  expect((await stat(output)).mtimeMs).toBe(timestamp)
  expect((await stat(indexFile)).mtimeMs).toBe(indexTimestamp)
  await writeFile(
    path.join(root, "demo/manifest.json"),
    JSON.stringify(manifest(["heart"]))
  )
  await expect(generateNames(root, { check: true })).rejects.toThrow(
    "out of date"
  )
  expect(await readFile(output, "utf8")).toBe(original)
  expect(await readFile(indexFile, "utf8")).toBe(index)
  expect((await generateNames(root)).changed).toBe(true)
  const updated = await readFile(output, "utf8")
  expect(updated).toContain('"demo:heart"')
  expect(updated).not.toContain('"demo:star"')
})

test("generation repairs missing files and cleans only stale generated collections", async () => {
  const root = await fixture()
  const otherDirectory = path.join(root, "demo-other")
  await mkdir(otherDirectory)
  await writeFile(
    path.join(otherDirectory, "manifest.json"),
    JSON.stringify({ ...manifest(["check"]), prefix: "demo-other" })
  )
  await generateNames(root)
  const otherType = path.join(root, "types/demo-other.d.ts")
  const otherContent = await readFile(otherType, "utf8")
  const otherTimestamp = (await stat(otherType)).mtimeMs
  const demoType = path.join(root, "types/demo.d.ts")
  await rm(demoType)
  await expect(generateNames(root, { check: true })).rejects.toThrow(
    "out of date"
  )
  expect(existsSync(demoType)).toBe(false)
  await generateNames(root)
  expect(existsSync(demoType)).toBe(true)
  expect((await stat(otherType)).mtimeMs).toBe(otherTimestamp)

  await writeFile(
    path.join(root, "demo/manifest.json"),
    JSON.stringify(manifest(["heart"]))
  )
  await generateNames(root)
  expect((await stat(otherType)).mtimeMs).toBe(otherTimestamp)
  await rm(path.join(otherDirectory, "manifest.json"))
  const customType = path.join(root, "types/custom.d.ts")
  await writeFile(customType, "export type Custom = string\n")
  await expect(generateNames(root, { check: true })).rejects.toThrow(
    "out of date"
  )
  expect(await readFile(otherType, "utf8")).toBe(otherContent)
  expect((await generateNames(root)).changed).toBe(true)
  expect(existsSync(otherType)).toBe(false)
  expect(await readFile(customType, "utf8")).toBe(
    "export type Custom = string\n"
  )
  expect(
    await readFile(path.join(root, "types/index.d.ts"), "utf8")
  ).not.toContain("demo-other")
  expect((await generateNames(root, { check: true })).changed).toBe(false)
  // A stale set file must also fail --check when the index is already current.
  await writeFile(otherType, otherContent)
  await expect(generateNames(root, { check: true })).rejects.toThrow(
    "out of date"
  )
  expect(existsSync(otherType)).toBe(true)
  expect((await generateNames(root)).changed).toBe(true)
  expect(existsSync(otherType)).toBe(false)
})

test("generation does not overwrite user-owned type files", async () => {
  const root = await fixture()
  await generateNames(root)
  const indexFile = path.join(root, "types/index.d.ts")
  const index = await readFile(indexFile, "utf8")
  const output = path.join(root, "types/demo.d.ts")
  const custom = "export type IconName = string\n"
  await writeFile(output, custom)
  await writeFile(
    path.join(root, "demo/manifest.json"),
    JSON.stringify(manifest(["heart"]))
  )
  await expect(generateNames(root)).rejects.toThrow("non-generated type file")
  expect(await readFile(output, "utf8")).toBe(custom)
  expect(await readFile(indexFile, "utf8")).toBe(index)
})

test("bad manifests fail before changing generated types", async () => {
  const root = await fixture()
  await generateNames(root)
  const output = path.join(root, "types/index.d.ts")
  const original = await readFile(output, "utf8")
  const setFile = path.join(root, "types/demo.d.ts")
  const originalSet = await readFile(setFile, "utf8")
  const invalid = [
    { ...manifest(), prefix: "other" },
    { ...manifest(), variants: null },
    manifest(["../escape"]),
    manifest(["star", "star"]),
    manifest([]),
    {
      ...manifest(),
      variants: { outline: { general: { json: ["star.json"], svg: [] } } },
    },
  ]
  for (const value of invalid) {
    await writeFile(
      path.join(root, "demo/manifest.json"),
      JSON.stringify(value)
    )
    await expect(generateNames(root)).rejects.toThrow()
    expect(await readFile(output, "utf8")).toBe(original)
    expect(await readFile(setFile, "utf8")).toBe(originalSet)
  }
})
