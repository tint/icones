import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createIconDataHandler } from "@icones/vite/server"
import { createIconPreviewHandler } from "../server/preview.ts"
import { queryIconCatalog } from "../src/features/catalog/protocol.ts"
import { iconToElementData } from "@icones/vite/tooling/elements"
import { generateSymbols } from "../../scripts/icon-builder/src/generate/symbols.ts"

const temporary: string[] = []

async function fixture() {
  const iconsDir = await mkdtemp(path.join(tmpdir(), "iconify-protocol-"))
  temporary.push(iconsDir)
  const dataDir = path.join(iconsDir, "data")
  for (const [name, body] of Object.entries({
    "tabler/shapes/star": "<path/>",
    "tabler/shapes/star-filled": "<circle/>",
    "tabler/arrows/refresh": "<path/>",
    "brand/logos/github": "<path/>",
  })) {
    const file = path.join(dataDir, name + ".json")
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(
      file,
      JSON.stringify(iconToElementData({ width: 24, height: 24, body }))
    )
  }
  await generateSymbols(iconsDir)
  return dataDir
}

afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

test("one server serves preview, JSON, and one-symbol SVG files", async () => {
  const dataDir = await fixture()
  const distDir = path.join(dataDir, "dist")
  await mkdir(path.join(distDir, "icons/tabler/arrows"), {
    recursive: true,
  })
  await writeFile(
    path.join(distDir, "index.html"),
    "<!doctype html><h1>Icon preview</h1>"
  )
  await writeFile(
    path.join(distDir, "icons/tabler/arrows/refresh-hash.svg"),
    '<svg id="compiled"/>'
  )
  const handler = createIconPreviewHandler({ dataDir, distDir })
  const get = (route: string, method = "GET") =>
    handler(new Request("https://icons.test" + route, { method }))
  expect(await (await get("/")).text()).toContain("Icon preview")
  expect((await get("/icons/catalog")).status).toBe(200)
  expect(
    (await (await get("/icons/tabler.json?icons=star")).json()).icons.star.body
  ).toBe('<path fill="currentColor"/>')
  const response = await get("/icons/tabler/star.svg")
  expect(response.headers.get("content-type")).toContain("image/svg+xml")
  const svg = await response.text()
  expect(svg.match(/<symbol\b/g)).toHaveLength(1)
  expect(svg).toContain('id="icon"')
  expect(svg).not.toContain("<circle/>")
  expect(
    await (await get("/icons/tabler/arrows/refresh-hash.svg")).text()
  ).toContain("compiled")
  expect(await (await get("/icons/tabler/star.svg", "HEAD")).text()).toBe("")
  expect((await get("/icons/tabler/absent.svg")).status).toBe(404)
  expect((await get("/%2e%2e%2fprivate.txt")).status).toBe(403)
  expect((await get("/", "POST")).status).toBe(405)
})

test("built catalog and icon files take priority over optional source APIs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "icones-built-preview-"))
  temporary.push(root)
  const distDir = path.join(root, "dist")
  await mkdir(path.join(distDir, "icons/tabler/data"), { recursive: true })
  const catalog =
    '[{"name":"tabler:star","prefix":"tabler","category":"shapes"}]'
  const data = '[ ["path", {"d":"M0 0h1"}] ]\n'
  await writeFile(path.join(distDir, "icons/catalog.json"), catalog)
  await writeFile(path.join(distDir, "icons/tabler/data/star.json"), data)
  const handler = createIconPreviewHandler({
    distDir,
    dataDir: path.join(root, "absent"),
    spa: true,
  })
  for (const [file, content] of [
    ["catalog.json", catalog],
    ["tabler/data/star.json", data],
  ]) {
    const url = `https://icons.test/icons/${file}`
    const response = await handler(new Request(url))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(await response.text()).toBe(content)
    expect(
      await (await handler(new Request(url, { method: "HEAD" }))).text()
    ).toBe("")
  }
})

test("SPA navigation serves the entry page but never masks missing data or assets", async () => {
  const dataDir = await fixture()
  const distDir = path.join(dataDir, "preview")
  await mkdir(distDir)
  await writeFile(
    path.join(distDir, "index.html"),
    "<!doctype html><h1>Icones app</h1>"
  )
  const handler = createIconPreviewHandler({ dataDir, distDir, spa: true })
  const get = (route: string, method = "GET") =>
    handler(
      new Request("https://icons.test" + route, {
        method,
        headers: { Accept: "text/html" },
      })
    )
  for (const route of [
    "/icons",
    "/icons?set=tabler&q=star",
    "/guide",
    "/solutions/packages",
    "/solutions/icon-font",
    "/solutions/mcp",
    "/not-a-page",
  ]) {
    const response = await get(route)
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/html")
    expect(await response.text()).toContain("Icones app")
  }
  expect(await (await get("/guide", "HEAD")).text()).toBe("")
  for (const method of ["GET", "HEAD"]) {
    const redirect = await get("/icons/?set=tabler&q=star", method)
    expect(redirect.status).toBe(308)
    expect(redirect.headers.get("Location")).toBe("/icons?set=tabler&q=star")
  }
  expect((await handler(new Request("https://icons.test/icons/"))).status).toBe(
    404
  )
  expect((await get("/icons/", "POST")).status).toBe(405)
  expect((await get("/icons/catalog")).headers.get("Content-Type")).toContain(
    "application/json"
  )
  expect((await get("/guide", "POST")).status).toBe(405)
  expect((await get("/icons/not-a-resource")).status).toBe(404)
  expect((await get("/assets/missing.js")).status).toBe(404)
  expect((await handler(new Request("https://icons.test/guide"))).status).toBe(
    404
  )
})

test("catalog pages include small facets, not paths or SVG data; filters affect counts", async () => {
  const handler = createIconDataHandler({ dataDir: await fixture() })
  const page = await queryIconCatalog(
    "https://icons.test/icons",
    { set: "tabler", q: "star", limit: 1 },
    {
      fetch: Object.assign(
        async (input: RequestInfo | URL, init?: RequestInit) =>
          (await handler(new Request(input, init)))!,
        { preconnect: () => {} }
      ),
    }
  )
  expect(page.total).toBe(2)
  expect(page.icons).toHaveLength(1)
  expect(page.nextOffset).toBe(1)
  expect(page.categories).toEqual([{ id: "shapes", count: 2 }])
  expect(page.sets).toEqual([{ id: "tabler", count: 2 }])
  expect(JSON.stringify(page)).not.toContain("body")
  expect(JSON.stringify(page)).not.toContain(".json")
  const next = await handler(
    new Request(
      "https://icons.test/icons/catalog?set=tabler&q=star&offset=1&limit=1"
    )
  )
  const second = await next!.json()
  expect(second.nextOffset).toBeNull()
  expect(second.icons[0].name).not.toBe(page.icons[0]!.name)
  const solid = await handler(
    new Request("https://icons.test/icons/catalog?set=tabler&suffix=-filled")
  )
  expect(
    (await solid!.json()).icons.map((icon: { name: string }) => icon.name)
  ).toEqual(["tabler:star-filled"])
})

test("protocol validates bounds, methods, paths, and returns safe errors", async () => {
  const dataDir = await fixture()
  const handler = createIconDataHandler({ dataDir, basePath: "/api/icons" })
  const request = (route: string, method = "GET") =>
    handler(new Request("https://icons.test/api/icons/" + route, { method }))
  for (const route of [
    "catalog?limit=101",
    "catalog?offset=-1",
    "catalog?limit=NaN",
    "tabler.json",
    "tabler.json?icons=../secret",
    "tabler.json?icons=" +
      Array.from({ length: 101 }, (_, i) => `icon-${i}`).join(","),
  ]) {
    expect((await request(route))?.status).toBe(400)
  }
  expect((await request("catalog", "POST"))?.status).toBe(405)
  expect((await request("manifest.json"))?.status).toBe(400)
  expect((await request("%2e%2e%2fsecret.json?icons=one"))?.status).toBe(404)
  expect(
    await handler(new Request("https://icons.test/elsewhere"))
  ).toBeUndefined()
  const head = await request("tabler.json?icons=star", "HEAD")
  expect(head?.status).toBe(200)
  expect(await head?.text()).toBe("")
  await writeFile(path.join(dataDir, "tabler/shapes/star.json"), "broken")
  const failed = await request("tabler.json?icons=star")
  expect(failed?.status).toBe(500)
  expect(await failed?.text()).not.toContain(dataDir)
})
