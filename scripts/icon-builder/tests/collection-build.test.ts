import { afterEach, expect, test } from "bun:test"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { updateIconManifest } from "@icones/vite/server"
import { buildCollections, checkAssetLimits } from "../src/build/collections.ts"
import { createCollectionPage } from "../src/build/collection-page.ts"
import { createIconManifest, addManifestEntry } from "@icones/core/manifest"
import {
  collectionDomain,
  iconDeploymentMode,
  selectCollections,
} from "../src/build/deployment.ts"

const roots: string[] = []
const tuple = '[["svg",{"viewBox":"0 0 24 24"},[]]]'
const symbol = '<svg><symbol id="icon" viewBox="0 0 24 24"/></svg>'

async function fixture(prefix = "demo") {
  const root = await mkdtemp(path.join(tmpdir(), "icones-deployment-"))
  roots.push(root)
  const source = path.join(root, "packages/icons")
  for (const directory of ["data", "symbols"])
    await mkdir(path.join(source, prefix, directory), { recursive: true })
  await updateIconManifest(source, {
    prefix,
    slug: "star",
    category: "shapes",
    variant: "outline",
    variantAlias: "linear",
  })
  await writeFile(path.join(source, prefix, "data/star.json"), tuple)
  await writeFile(path.join(source, prefix, "symbols/star.svg"), symbol)
  await writeFile(path.join(source, prefix, "license.txt"), "original license")
  return { root, source, output: path.join(root, "dist/icons") }
}

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

test("builds a pure static deployment preserving source artwork and notices", async () => {
  const { root, source, output } = await fixture()
  const [result] = await buildCollections({ root })
  expect(result).toMatchObject({
    prefix: "demo",
    domain: "demo.icones.go-slim.dev",
    icons: 1,
    files: 6,
    configFile: "./wrangler.jsonc",
  })
  const directory = path.join(output, "demo")
  expect((await readdir(path.join(directory, "public"))).sort()).toEqual([
    "_headers",
    "data",
    "index.html",
    "license.txt",
    "manifest.json",
    "symbols",
  ])
  for (const file of [
    "data/star.json",
    "symbols/star.svg",
    "license.txt",
    "manifest.json",
  ])
    expect(await readFile(path.join(directory, "public", file), "utf8")).toBe(
      await readFile(path.join(source, "demo", file), "utf8")
    )
  expect(
    await readFile(path.join(directory, "public/_headers"), "utf8")
  ).toContain("Access-Control-Allow-Origin: *")
  const config = JSON.parse(
    await readFile(path.join(result!.directory, result!.configFile), "utf8")
  )
  expect(config.assets).toEqual({
    directory: "./public",
    not_found_handling: "none",
  })
  expect(config.main).toBeUndefined()
  expect(config.routes).toEqual([
    { pattern: "demo.icones.go-slim.dev", custom_domain: true },
  ])
  const html = await readFile(path.join(directory, "public/index.html"), "utf8")
  expect(html).toContain("<h1>Demo</h1>")
  expect(html).toContain("1 icons")
  expect(html).toContain('href="./data/star.json"')
  expect(html).toContain('href="./symbols/star.svg"')
  expect(html).toContain('href="./manifest.json"')
  expect(html).toContain('href="./license.txt"')
  expect(html).toContain("Linear")
  expect(html).toContain("<code>outline</code>")
  expect(html).not.toContain("<script")
  const reportText = await readFile(
    path.join(directory, "build-report.json"),
    "utf8"
  )
  const report = JSON.parse(reportText)
  expect(reportText).not.toContain(root)
  expect(report.directory).toBeUndefined()
  const publicFiles = [
    "data/star.json",
    "symbols/star.svg",
    "manifest.json",
    "license.txt",
    "_headers",
    "index.html",
  ]
  const sizes = await Promise.all(
    publicFiles.map(async (file) => ({
      path: file,
      bytes: (await readFile(path.join(directory, "public", file))).byteLength,
    }))
  )
  expect(report.bytes).toBe(sizes.reduce((sum, file) => sum + file.bytes, 0))
  expect(report.largestFile).toEqual(
    sizes.reduce((largest, file) =>
      file.bytes > largest.bytes ? file : largest
    )
  )
  expect(
    JSON.parse(
      await readFile(path.join(directory, ".icones-generated.json"), "utf8")
    )
  ).toEqual({ owner: "@icones/icon-builder/collection-v1", prefix: "demo" })
  await expect(
    readFile(path.join(output, "demo/public/wrangler.jsonc"))
  ).rejects.toMatchObject({ code: "ENOENT" })
})

test("rebuilds replace owned snapshots without publishing stale or unlisted artwork", async () => {
  const { root, source, output } = await fixture()
  await buildCollections({ root })
  await writeFile(path.join(output, "demo/public/data/stale.json"), "stale")
  await writeFile(path.join(source, "demo/data/unlisted.json"), tuple)
  const [result] = await buildCollections({ root })
  expect(result!.files).toBe(6)
  expect(await readdir(path.join(output, "demo/public/data"))).toEqual([
    "star.json",
  ])
  expect(
    (await readdir(output)).filter((file) => file.startsWith(".build-"))
  ).toEqual([])
})

test("reports resolve after moving a custom build directory and remain deterministic", async () => {
  const { root } = await fixture()
  const outputDirectory = path.join(root, "custom-build/icons")
  const [result] = await buildCollections({ root, outputDirectory })
  const reportBefore = await readFile(
    path.join(result!.directory, "build-report.json"),
    "utf8"
  )
  const htmlBefore = await readFile(
    path.join(result!.directory, "public/index.html"),
    "utf8"
  )
  await buildCollections({ root, outputDirectory })
  expect(
    await readFile(path.join(result!.directory, "build-report.json"), "utf8")
  ).toBe(reportBefore)
  expect(
    await readFile(path.join(result!.directory, "public/index.html"), "utf8")
  ).toBe(htmlBefore)
  const moved = path.join(root, "relocated")
  await rename(result!.directory, moved)
  const report = JSON.parse(
    await readFile(path.join(moved, "build-report.json"), "utf8")
  )
  expect(
    JSON.parse(await readFile(path.resolve(moved, report.configFile), "utf8"))
  ).toMatchObject({ name: "icones-demo" })
})

test("unknown ownership formats are not silently overwritten or deleted", async () => {
  const { root, output } = await fixture()
  await buildCollections({ root })
  const directory = path.join(output, "demo")
  const unknownMarker = JSON.stringify({
    owner: "@icones/icon-builder/collection-v2",
    prefix: "demo",
  })
  await writeFile(path.join(directory, ".icones-generated.json"), unknownMarker)
  await expect(buildCollections({ root })).rejects.toThrow("unowned output")
  expect(
    await readFile(path.join(directory, ".icones-generated.json"), "utf8")
  ).toBe(unknownMarker)
  expect(
    await readFile(path.join(directory, "public/data/star.json"), "utf8")
  ).toBe(tuple)
})

test("landing pages preserve Flag variants, source notices, and escape untrusted metadata", () => {
  const manifest = createIconManifest("flag")
  for (const variant of ["1x1", "4x3", "circle"])
    addManifestEntry(manifest, {
      prefix: "flag",
      slug: "us-" + variant,
      category: "flags",
      variant,
    })
  manifest.sources = {
    flags: {
      url: "https://example.com/?a=1&b=2",
      revision: '<script>alert("x")</script>',
      distributionNotice: "Keep <original> & source notices.",
    },
    unsafe: { url: "javascript:alert(1)" },
  }
  const html = createCollectionPage(manifest, 3, "us-circle")
  expect(html).toContain("Shapes &amp; aspect ratios")
  for (const variant of ["1x1", "4x3", "circle"])
    expect(html).toContain(`<code>${variant}</code>`)
  expect(html).toContain('href="https://example.com/?a=1&amp;b=2"')
  expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;")
  expect(html).toContain("Keep &lt;original&gt; &amp; source notices.")
  expect(html).not.toContain("<script")
  expect(html).not.toContain('href="javascript:')
})

test("validation failure leaves the previous deployable snapshot intact", async () => {
  const { root, source, output } = await fixture()
  await buildCollections({ root })
  await unlink(path.join(source, "demo/symbols/star.svg"))
  await expect(buildCollections({ root })).rejects.toMatchObject({
    code: "ENOENT",
  })
  expect(
    await readFile(path.join(output, "demo/public/symbols/star.svg"), "utf8")
  ).toBe(symbol)
})

test("only full builds prune retired owned collections; unowned neighbors survive", async () => {
  const { root, source, output } = await fixture("retired")
  await buildCollections({ root })
  await mkdir(path.join(output, "notes"))
  await writeFile(path.join(output, "notes/keep.txt"), "keep")
  await rename(path.join(source, "retired"), path.join(root, "retired-source"))
  for (const directory of ["data", "symbols"])
    await mkdir(path.join(source, "demo", directory), { recursive: true })
  await updateIconManifest(source, {
    prefix: "demo",
    slug: "star",
    category: "shapes",
    variant: "outline",
  })
  await writeFile(path.join(source, "demo/data/star.json"), tuple)
  await writeFile(path.join(source, "demo/symbols/star.svg"), symbol)
  await writeFile(path.join(source, "demo/license.txt"), "original license")
  await buildCollections({ root, sets: ["demo"] })
  expect(
    await readFile(path.join(output, "retired/public/data/star.json"), "utf8")
  ).toBe(tuple)
  await buildCollections({ root })
  await expect(
    readFile(path.join(output, "retired/public/data/star.json"))
  ).rejects.toMatchObject({ code: "ENOENT" })
  expect(await readFile(path.join(output, "notes/keep.txt"), "utf8")).toBe(
    "keep"
  )
})

test("does not overwrite unowned directories or touch source packages", async () => {
  const { root, source, output } = await fixture()
  await mkdir(path.join(output, "demo"), { recursive: true })
  await writeFile(path.join(output, "demo/notes.txt"), "keep")
  await expect(buildCollections({ root })).rejects.toThrow("unowned output")
  expect(await readFile(path.join(output, "demo/notes.txt"), "utf8")).toBe(
    "keep"
  )
  await expect(
    buildCollections({ root, outputDirectory: source })
  ).rejects.toThrow("overlap")
  await expect(
    buildCollections({ root, outputDirectory: root })
  ).rejects.toThrow("overlap")
})

test("refuses symlink artwork and symlink deployment targets", async () => {
  const { root, source, output } = await fixture()
  const file = path.join(source, "demo/data/star.json")
  await unlink(file)
  await symlink(path.join(source, "demo/license.txt"), file)
  await expect(buildCollections({ root })).rejects.toThrow("regular asset")
  await unlink(file)
  await writeFile(file, tuple)
  await mkdir(output, { recursive: true })
  await symlink(path.join(source, "demo"), path.join(output, "demo"))
  await expect(buildCollections({ root })).rejects.toThrow("non-directory")
})

test("selection excludes restricted collections and rejects unknown or unsafe names", () => {
  const excluded = { restricted: "Distribution requires permission." }
  expect(
    selectCollections(["tabler", "restricted", "flag"], undefined, excluded)
  ).toEqual(["flag", "tabler"])
  expect(selectCollections(["tabler", "flag"], ["tabler", "tabler"])).toEqual([
    "tabler",
  ])
  expect(selectCollections(["antd", "bootstrap"])).toEqual([
    "antd",
    "bootstrap",
  ])
  expect(() =>
    selectCollections(["restricted"], ["restricted"], excluded)
  ).toThrow("excluded")
  expect(() => selectCollections(["tabler"], ["other"])).toThrow("Unknown")
  expect(() => selectCollections(["tabler"], ["../tabler"])).toThrow("Invalid")
  expect(() => selectCollections(["restricted"], undefined, excluded)).toThrow(
    "No deployable"
  )
  expect(() => collectionDomain("tabler", "https://example.com")).toThrow(
    "domain"
  )
  expect(() => iconDeploymentMode("typo")).toThrow("split or local")
  expect(iconDeploymentMode("local")).toBe("local")
})

test("enforces the file count and individual byte limit at their exact boundaries", () => {
  const limits = { maxFiles: 2, maxFileBytes: 25 }
  expect(() =>
    checkAssetLimits(
      [
        { path: "a", bytes: 25 },
        { path: "b", bytes: 1 },
      ],
      limits
    )
  ).not.toThrow()
  expect(() => checkAssetLimits([{ path: "a", bytes: 26 }], limits)).toThrow(
    "exceeds limit 25"
  )
  expect(() =>
    checkAssetLimits(
      [1, 2, 3].map((n) => ({ path: String(n), bytes: 1 })),
      limits
    )
  ).toThrow("count 3")
})

test("deployment CLI requires an explicit selection, even for dry-run", async () => {
  const process = Bun.spawn(["bun", "src/cli/deploy-icons.ts", "--dry-run"], {
    cwd: new URL("../", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(await process.exited).not.toBe(0)
  expect(await new Response(process.stderr).text()).toContain("Choose --set")
})
