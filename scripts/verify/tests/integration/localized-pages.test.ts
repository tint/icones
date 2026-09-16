import { afterAll, beforeAll, expect, test } from "bun:test"
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { env } from "node:process"
import { JSDOM } from "jsdom"
import { preview, type PreviewServer } from "vite"
import { createIconPreviewHandler } from "../../../../app/server/preview.ts"
import { localeMessages } from "../../../../app/src/shared/i18n/locale-messages.server.ts"
import {
  languages,
  languageHref,
  localePage,
} from "../../../../app/src/shared/i18n/locale-routing.ts"
import { loadLocaleMessages } from "../../../../app/src/shared/i18n/locale-document.ts"
import { prerenderPaths } from "../../../../app/src/app/prerender.ts"
import { pageMetadata } from "../../../../app/src/shared/routing/paths.ts"
import {
  readGuidePath,
  readGuideLocation,
} from "../../../../app/src/features/guide/routing.ts"
import { getGuideArticle } from "../../../../app/src/features/guide/content.ts"
import { localizeExampleCode } from "../../../../app/src/shared/code/code-example.ts"
import { createIconRepository } from "@icones/vite/server"
import { deployment } from "../../../icon-builder/src/build/deployment.ts"

const repo = fileURLToPath(new URL("../../../..", import.meta.url))

// Bun's in-process Node HTTP adapter can reuse a HEAD connection incorrectly.
const headers = { Accept: "text/html", Connection: "close" }

let temporary: string

let client: string

let server: PreviewServer

let origin: string
let staticServer: PreviewServer
let staticOrigin: string

// Build the actual route modules, not an HTML-template fixture. This temporary
// workspace directory lets the server bundle resolve shared Node dependencies.
beforeAll(async () => {
  const primaryIndex = join(repo, "dist/client/index.html")
  const primaryBefore = await stat(primaryIndex).catch(() => undefined)
  const primaryCollection = join(repo, "dist/icons/tabler/build-report.json")
  const collectionBefore = await stat(primaryCollection).catch(() => undefined)
  temporary = await mkdtemp(join(repo, ".icones-ssg-test-"))
  const buildDirectory = join(temporary, "build")
  const process = Bun.spawn(["bun", "run", "--cwd", "app", "build"], {
    cwd: repo,
    env: {
      ...env,
      ICONES_BUILD_DIRECTORY: buildDirectory,
      ICONES_ICON_DEPLOYMENT: "split",
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [status, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  if (status !== 0) throw new Error((stdout + stderr).slice(-8000))
  // An isolated build must not empty or rewrite the normal deploy directory.
  const primaryAfter = await stat(primaryIndex).catch(() => undefined)
  expect(primaryAfter?.mtimeMs).toBe(primaryBefore?.mtimeMs)
  expect((await stat(primaryCollection).catch(() => undefined))?.mtimeMs).toBe(
    collectionBefore?.mtimeMs
  )
  client = join(buildDirectory, "client")
  server = await preview({
    configFile: join(repo, "app/vite.config.ts"),
    root: join(repo, "app"),
    build: { outDir: client },
    preview: { host: "127.0.0.1", port: 0, open: false },
    logLevel: "silent",
  })
  const address = server.httpServer.address()
  if (!address || typeof address === "string")
    throw new Error("Missing preview address")
  origin = `http://127.0.0.1:${address.port}`
  staticServer = await preview({
    configFile: false,
    root: temporary,
    appType: "mpa",
    publicDir: false,
    build: { outDir: client },
    preview: { host: "127.0.0.1", port: 0, open: false },
    logLevel: "silent",
  })
  const staticAddress = staticServer.httpServer.address()
  if (!staticAddress || typeof staticAddress === "string")
    throw new Error("Missing static address")
  staticOrigin = `http://127.0.0.1:${staticAddress.port}`
}, 120_000)

afterAll(async () => {
  await staticServer?.close()
  if (server)
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => (error ? reject(error) : resolve()))
      if ("closeAllConnections" in server.httpServer)
        server.httpServer.closeAllConnections()
    })
  if (temporary) await rm(temporary, { recursive: true, force: true })
})

test("app build separates website and collection deployments, preserving public artwork byte-for-byte", async () => {
  const repository = createIconRepository(join(repo, "packages/icons"))
  await repository.ready()
  const sets = [...repository.manifests.keys()].filter(
    (prefix) => !Object.hasOwn(deployment.excludedCollections, prefix)
  )
  const records = [...repository.records.values()].filter((record) =>
    sets.includes(record.prefix)
  )
  const catalog = JSON.parse(
    await readFile(join(client, "icons/catalog.json"), "utf8")
  )
  expect(catalog).toHaveLength(records.length)
  expect(new Set(catalog.map((icon: { name: string }) => icon.name))).toEqual(
    new Set(records.map((record) => record.name))
  )
  const files = [
    ...records.flatMap((record) => [
      record.file,
      record.file.replace("/data/", "/symbols/").replace(/\.json$/, ".svg"),
    ]),
    ...sets.flatMap((prefix) => [
      prefix + "/manifest.json",
      prefix + "/license.txt",
    ]),
  ]
  for (let start = 0; start < files.length; start += 64) {
    await Promise.all(
      files.slice(start, start + 64).map(async (file) => {
        const [source, output] = await Promise.all([
          readFile(join(repository.root, file)),
          readFile(
            join(
              temporary,
              "build/icons",
              file.split("/")[0]!,
              "public",
              ...file.split("/").slice(1)
            )
          ),
        ])
        expect(output.equals(source), file).toBe(true)
      })
    )
  }
  expect((await readdir(join(client, "icons"))).sort()).toEqual([
    "catalog.json",
    "index.html",
  ])
  const emittedIcons = (
    await readdir(join(client, "assets/icons"), { recursive: true })
  ).map((file) => file.replaceAll("\\", "/"))
  const sprites = emittedIcons.filter((file) => file.endsWith(".svg"))
  expect(new Set(sprites.map((file) => file.split("/")[0]))).toEqual(
    new Set(sets)
  )
  let symbols = 0
  for (const file of sprites) {
    const source = await readFile(join(client, "assets/icons", file), "utf8")
    expect(Buffer.byteLength(source), file).toBeLessThanOrEqual(256 * 1024)
    symbols += source.match(/<symbol /g)?.length ?? 0
  }
  expect(symbols).toBe(records.length)
  expect(emittedIcons.some((file) => file.endsWith(".json"))).toBe(false)
  for (const prefix of Object.keys(deployment.excludedCollections))
    await expect(
      stat(join(temporary, "build/icons", prefix))
    ).rejects.toMatchObject({ code: "ENOENT" })
  for (const file of ["icons/catalog.json"]) {
    for (const base of [origin, staticOrigin]) {
      const response = await fetch(base + "/" + file, {
        headers: { Connection: "close" },
      })
      expect(response.status, base + "/" + file).toBe(200)
      expect(response.headers.get("content-type")).toContain(
        file.endsWith(".svg") ? "image/svg+xml" : "application/json"
      )
      expect(await response.text()).toBe(
        await readFile(join(client, file), "utf8")
      )
      const head = await fetch(base + "/" + file, {
        method: "HEAD",
        headers: { Connection: "close" },
      })
      expect(head.status).toBe(200)
      expect(await head.text()).toBe("")
    }
  }
  for (const prefix of sets) {
    const publicDirectory = join(temporary, "build/icons", prefix, "public")
    const collectionServer = await preview({
      configFile: false,
      root: temporary,
      appType: "mpa",
      publicDir: false,
      build: { outDir: publicDirectory },
      preview: { host: "127.0.0.1", port: 0, open: false },
      logLevel: "silent",
    })
    try {
      const address = collectionServer.httpServer.address() as { port: number }
      const base = `http://127.0.0.1:${address.port}`
      const landing = await fetch(base + "/")
      expect(landing.status).toBe(200)
      expect(landing.headers.get("content-type")).toContain("text/html")
      const html = await landing.text()
      expect(html).toBe(
        await readFile(join(publicDirectory, "index.html"), "utf8")
      )
      const dom = new JSDOM(html)
      try {
        expect(
          dom.window.document.querySelector("h1")?.textContent
        ).toBeTruthy()
        expect(dom.window.document.querySelector("script")).toBeNull()
        for (const anchor of dom.window.document.querySelectorAll(
          'a[href^="./"]'
        )) {
          const href = anchor.getAttribute("href")!
          expect((await fetch(new URL(href, base))).status, href).toBe(200)
        }
      } finally {
        dom.window.close()
      }
      const icon = records.find((record) => record.prefix === prefix)!
      const slug = icon.name.slice(prefix.length + 1)
      for (const file of [
        `data/${slug}.json`,
        `symbols/${slug}.svg`,
        "manifest.json",
        "license.txt",
        "index.html",
      ])
        for (const method of ["GET", "HEAD"]) {
          const response = await fetch(`${base}/${file}`, {
            method,
            headers: { Connection: "close" },
          })
          expect(response.status).toBe(200)
          expect(await response.text()).toBe(
            method === "HEAD"
              ? ""
              : await readFile(join(publicDirectory, file), "utf8")
          )
          expect(response.headers.get("content-type")).toContain(
            file.endsWith(".svg")
              ? "image/svg+xml"
              : file.endsWith(".json")
                ? "application/json"
                : file.endsWith(".html")
                  ? "text/html"
                  : "text/plain"
          )
        }
      expect((await fetch(base + "/data/missing.json")).status).toBe(404)
      expect((await fetch(base + "/wrangler.jsonc")).status).toBe(404)
    } finally {
      await collectionServer.close()
    }
  }
  const licenses = await readFile(join(client, "licenses/index.html"), "utf8")
  expect(licenses).toContain("https://tabler.icones.go-slim.dev/license.txt")
  expect(licenses).toContain("https://bootstrap.icones.go-slim.dev/license.txt")
  expect(licenses).toContain("https://antd.icones.go-slim.dev/license.txt")
  expect(licenses).not.toContain("https://remix.icones.go-slim.dev/license.txt")
  for (const route of [
    "/",
    "/icons/",
    "/zh-CN/icons/",
    "/guide/react/getting-started/",
  ]) {
    const response = await fetch(staticOrigin + route)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      await readFile(join(client, route, "index.html"), "utf8")
    )
  }
  for (const route of [
    "/icons/tabler/data/missing-icon.json",
    "/icons/tabler/symbols/missing-icon.svg",
    "/icons/tabler/data/star.json",
    "/_worker.js",
    "/_iconify/storage.json",
  ]) {
    const response = await fetch(staticOrigin + route)
    expect(response.status).toBe(404)
  }
}, 30_000)

test("all 176 prerendered documents include localized body and metadata without JavaScript", async () => {
  expect(new Set(prerenderPaths).size).toBe(176)
  for (const path of prerenderPaths) {
    const html = await readFile(join(client, path, "index.html"), "utf8")
    const dom = new JSDOM(html)
    try {
      const document = dom.window.document
      const { language, route } = localePage(path)
      const dictionary = localeMessages[language!]
      const t = (value: string) =>
        (dictionary as Record<string, string>)[value] ?? value
      const selection =
        readGuidePath(route) ??
        (route === "/guide" ? readGuideLocation("") : undefined)
      const article =
        selection &&
        getGuideArticle(
          selection.page,
          selection.framework,
          false,
          selection.element
        )
      const title = article ? article.title : pageMetadata[route]!.title
      expect(document.documentElement.lang).toBe(language!)
      expect(document.title).toBe(t(title) + " – Icones")
      expect(
        document.querySelector("main h1")?.textContent?.length
      ).toBeGreaterThan(1)
      expect(
        document.querySelector("main")?.textContent?.length
      ).toBeGreaterThan(100)
      expect(document.querySelectorAll("a").length).toBeGreaterThan(8)
      expect(document.querySelectorAll("svg").length).toBeGreaterThan(3)
      expect(document.querySelector('script[type="module"]')).not.toBeNull()
      expect(html).toContain("window.__reactRouterContext")
      expect(html).not.toContain('id="icones-locale"')
      if (article) {
        expect(document.querySelector("#guide-title")?.textContent).toBe(
          t(title)
        )
        for (const section of article.sections) {
          if (
            !section.examples ||
            section.examples.some((example) => example.install)
          )
            continue
          const rendered = document.querySelector(
            `section[aria-labelledby="guide-${selection!.page}-${section.id}"]`
          )!
          expect(
            [...rendered.querySelectorAll("pre code")].map(
              (code) => code.textContent
            )
          ).toEqual(
            section.examples.map((example) => localizeExampleCode(example, t))
          )
        }
      }
      for (const locale of languages)
        expect(
          document
            .querySelector(`link[hreflang="${locale}"]`)
            ?.getAttribute("href")
        ).toBe(languageHref(locale, route))
      const dataFile = path.endsWith("/")
        ? path.slice(1) + "_.data"
        : path.slice(1) + ".data"
      expect((await stat(join(client, dataFile))).size).toBeGreaterThan(0)
    } finally {
      dom.window.close()
    }
  }
}, 30_000)

test("preview and production serve real pages on direct and reload URLs", async () => {
  const production = createIconPreviewHandler({
    distDir: client,
    dataDir: join(repo, "packages/icons"),
    spa: true,
  })
  for (const serve of [(request: Request) => fetch(request), production]) {
    for (const path of [
      "/",
      "/zh-CN",
      "/licenses",
      "/icons",
      "/guide/svelte/stroke-width",
      "/zh-CN/guide/vanilla/standard/icon-config",
      "/zh-CN/solutions/llms",
    ]) {
      const expected = await readFile(join(client, path, "index.html"), "utf8")
      for (const suffix of ["", "/", "/index.html"]) {
        if (path === "/" && suffix) continue
        const response = await serve(
          new Request(origin + path + suffix + "?set=flag", { headers })
        )
        if (response.status === 308)
          expect(response.headers.get("location")).toBe("/icons?set=flag")
        else {
          expect(response.status).toBe(200)
          expect(await response.text()).toBe(expected)
        }
      }
      const head = await serve(
        new Request(origin + path, { method: "HEAD", headers })
      )
      expect(head.status).toBe(200)
      expect(await head.text()).toBe("")
    }
    for (const path of [
      "/assets/missing.js",
      "/guide/missing.data",
      "/missing.svg",
    ])
      expect(
        (await serve(new Request(origin + path, { headers }))).status
      ).toBe(404)
    const fallback = await readFile(join(client, "__spa-fallback.html"), "utf8")
    for (const path of [
      "/missing-page",
      "/zh-CN/missing-page",
      "/en-US/guide",
    ]) {
      const response = await serve(new Request(origin + path, { headers }))
      expect(response.status).toBe(200)
      expect(await response.text()).toBe(fallback)
    }
    const dom = new JSDOM(fallback)
    expect(dom.window.document.querySelector("main")).toBeNull()
    dom.window.close()
  }
}, 20_000)

test("loader data, dictionaries, SVG and LLM documents retain their public URLs", async () => {
  for (const path of [
    "/_.data",
    "/zh-CN/guide/svelte/stroke-width.data",
    "/llms.txt",
    "/llms/react/llms-full.txt",
  ]) {
    const response = await fetch(origin + path)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type") ?? "").not.toContain(
      "text/html"
    )
    expect((await response.text()).length).toBeGreaterThan(50)
  }
  for (const language of languages)
    expect(await loadLocaleMessages(language, origin + "/")).toEqual({
      language,
      messages: localeMessages[language],
    })
  const dom = new JSDOM(
    await readFile(join(client, "guide/svelte/stroke-width/index.html"), "utf8")
  )
  try {
    const urls = [...dom.window.document.querySelectorAll("svg use")].map(
      (node) => node.getAttribute("href")!.split("#")[0]!
    )
    expect(urls.length).toBeGreaterThan(10)
    for (const url of new Set(urls))
      expect((await fetch(origin + url)).status).toBe(200)
  } finally {
    dom.window.close()
  }
})
