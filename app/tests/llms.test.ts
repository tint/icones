import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { build, createServer, preview, type PreviewServer } from "vite"
import { createLlmsDocuments } from "../src/features/llms/markdown.ts"
import { llmsDocuments } from "../plugins/llms.ts"
import {
  llmsScopes,
  llmsDocumentHref,
  llmsScopeLabel,
  llmsGuideHref,
} from "../src/features/llms/config.ts"
import {
  getGuideArticle,
  guideFrameworks,
  guideHref,
  guidePages,
  readGuidePath,
} from "../src/features/guide/content.ts"
import {
  sharedGuidePages,
  frameworkGuidePages,
  isSharedGuidePage,
} from "../src/features/guide/routing.ts"
import { createIconRepository } from "@icones/vite/server"
import { createIconPreviewHandler } from "../server/preview.ts"

test("LLM documents are deterministic and include every Guide topic and both Vanilla paths", () => {
  const documents = createLlmsDocuments()
  expect(createLlmsDocuments()).toEqual(documents)
  const index = documents["llms.txt"]!,
    full = documents["llms-full.txt"]!
  expect(index).toStartWith("# Icones\n\n>")
  expect(index.length).toBeLessThan(4000)
  expect(full.length).toBeGreaterThan(index.length * 10)
  expect(full).not.toContain("@workspace:*")
  expect(full).not.toContain("/Users/")
  expect(full).not.toMatch(
    /this workspace|this monorepo|packages\/icons\/|\.\.\/packages\/icons|bun run build:packages/iu
  )
  expect(full).toContain("@icones/mcp-server provides read-only stdio tools")
  expect(full).toContain(
    "commands require access to compatible @icones releases"
  )
  for (const { id, name } of guideFrameworks) {
    expect(index).toContain(`[${name}](/llms/${id}/llms.txt)`)
    expect(full).toContain(`## ${name}\n`)
    for (const mode of id === "vanilla"
      ? (["standard", "web"] as const)
      : (["web"] as const)) {
      for (const { id: page } of guidePages) {
        const article = getGuideArticle(page, id, false, mode)
        expect(full).toContain(`[Source](${guideHref(page, id, mode)})`)
        expect(full).toContain(article.description)
        for (const section of article.sections) {
          expect(full).toContain("#### " + section.title)
          for (const paragraph of section.paragraphs)
            expect(full).toContain(paragraph)
          for (const example of section.examples ?? [])
            expect(full).toContain(example.code)
          if (section.checkpoint) expect(full).toContain(section.checkpoint)
          if (section.note) expect(full).toContain(section.note)
        }
      }
    }
  }
})

test("framework and Vanilla track documents include all selected chapters without mixing example APIs", () => {
  const documents = createLlmsDocuments()
  expect(Object.keys(documents)).toHaveLength(18)
  expect(
    new Set(
      llmsScopes.flatMap((scope) => [
        llmsDocumentHref(scope, "llms.txt"),
        llmsDocumentHref(scope, "llms-full.txt"),
      ])
    ).size
  ).toBe(18)
  for (const scope of llmsScopes) {
    if (scope.framework === "all") continue
    const index = documents[llmsDocumentHref(scope, "llms.txt").slice(1)]!
    const full = documents[llmsDocumentHref(scope, "llms-full.txt").slice(1)]!
    expect(index).toStartWith("# Icones · " + llmsScopeLabel(scope))
    expect(full).toStartWith("# Icones · " + llmsScopeLabel(scope))
    expect(full.length).toBeLessThan(documents["llms-full.txt"]!.length)
    expect(index.length).toBeLessThan(full.length / 2)
    expect(index).toContain(`(${llmsDocumentHref(scope, "llms-full.txt")})`)
    expect(index).toContain(`[Interactive guide](${llmsGuideHref(scope)})`)
    const modes =
      scope.framework === "vanilla" && scope.element === "all"
        ? (["standard", "web"] as const)
        : ([scope.element === "standard" ? "standard" : "web"] as const)
    for (const mode of modes)
      for (const page of guidePages) {
        const framework = scope.framework
        const article = getGuideArticle(page.id, framework, false, mode)
        expect(full).toContain(
          `[Source](${guideHref(page.id, framework, mode)})`
        )
        expect(index).toContain(`(${guideHref(page.id, framework, mode)})`)
        for (const section of article.sections) {
          for (const paragraph of section.paragraphs)
            expect(full).toContain(paragraph)
          for (const example of section.examples ?? [])
            expect(full).toContain(example.code)
        }
      }
    const sources = [...full.matchAll(/\[Source\]\(([^)]+)\)/g)]
    expect(sources).toHaveLength(
      sharedGuidePages.length + frameworkGuidePages.length * modes.length
    )
    for (const [, href] of sources) {
      const selection = readGuidePath(
        new URL(href!, "https://icons.test").pathname
      )!
      if (isSharedGuidePage(selection.page)) {
        expect(selection.framework).toBeUndefined()
        expect(sources.filter((match) => match[1] === href)).toHaveLength(1)
        continue
      }
      expect(selection.framework).toBe(scope.framework)
      if (scope.framework === "vanilla" && scope.element !== "all")
        expect(selection.element).toBe(scope.element)
    }
    expect(full).toContain("parseElementData")
    expect(full).toContain("@icones/mcp-server provides read-only stdio tools")
    expect(full).toContain("Original collection licenses apply")
    expect(full).not.toContain("@workspace:*")
    expect(full).not.toContain("/Users/")
  }
  expect(documents["llms/vanilla/standard/llms-full.txt"]).toContain(
    "@icones/vanilla/standard-element"
  )
  expect(documents["llms/vanilla/standard/llms-full.txt"]).not.toContain(
    "@icones/vanilla/web-element"
  )
  expect(documents["llms/vanilla/web/llms-full.txt"]).toContain(
    "@icones/vanilla/web-element"
  )
  expect(documents["llms/vanilla/web/llms-full.txt"]).not.toContain(
    "@icones/vanilla/standard-element"
  )
  expect(documents["llms/vanilla/llms.txt"]).toContain(
    "/llms/vanilla/standard/llms.txt"
  )
  expect(documents["llms/vanilla/llms.txt"]).toContain(
    "/llms/vanilla/web/llms.txt"
  )
})

test("development serves real text for GET/HEAD and rejects writes without swallowing other routes", async () => {
  const server = await createServer({
    configFile: false,
    root: new URL("../..", import.meta.url).pathname,
    plugins: [
      llmsDocuments(),
      {
        name: "test:page-handler",
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            if (request.url !== "/solutions/llms") return next()
            response.setHeader("Content-Type", "text/html")
            response.end("<h1>LLMs route reached</h1>")
          })
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0 },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "silent",
  })
  try {
    await server.listen()
    const address = server.httpServer!.address()
    if (!address || typeof address === "string")
      throw new Error("Missing server address")
    const base = `http://127.0.0.1:${address.port}`
    await Promise.all(
      Object.entries(createLlmsDocuments()).map(async ([filename, text]) => {
        const response = await fetch(`${base}/${filename}?source=test`)
        expect(response.status).toBe(200)
        expect(response.headers.get("content-type")).toBe(
          "text/plain; charset=utf-8"
        )
        expect(response.headers.get("x-content-type-options")).toBe("nosniff")
        expect(await response.text()).toBe(text)
        const head = await fetch(`${base}/${filename}`, { method: "HEAD" })
        expect(head.status).toBe(200)
        expect(await head.text()).toBe("")
        const post = await fetch(`${base}/${filename}`, { method: "POST" })
        expect(post.status).toBe(405)
        expect(post.headers.get("allow")).toBe("GET, HEAD")
      })
    )
    expect(
      (
        await fetch(base + "/missing-doc.txt", {
          headers: { Accept: "text/plain" },
        })
      ).status
    ).toBe(404)
    for (const path of [
      "/llms/unknown/llms.txt",
      "/llms/react/web/llms-full.txt",
      "/llms/vanilla/invalid/llms.txt",
    ]) {
      expect(
        (await fetch(base + path, { headers: { Accept: "text/plain" } })).status
      ).toBe(404)
    }
    const page = await fetch(base + "/solutions/llms", {
      headers: { Accept: "text/html" },
    })
    expect(page.status).toBe(200)
    expect(page.headers.get("content-type")).toContain("text/html")
    expect(await page.text()).toBe("<h1>LLMs route reached</h1>")
  } finally {
    await server.close()
  }
})

test("production emits standalone documents served by Vite preview and the local production server", async () => {
  const root = await mkdtemp(join(tmpdir(), "icones-llms-"))
  let server: PreviewServer | undefined
  try {
    await writeFile(
      join(root, "index.html"),
      "<!doctype html><title>LLMs</title>"
    )
    await mkdir(join(root, "icons"))
    await build({
      configFile: false,
      root,
      plugins: [llmsDocuments()],
      build: { outDir: "dist" },
      logLevel: "silent",
    })
    server = await preview({
      configFile: false,
      root,
      build: { outDir: "dist" },
      preview: { host: "127.0.0.1", port: 0, open: false },
      logLevel: "silent",
    })
    const address = server.httpServer.address()
    if (!address || typeof address === "string")
      throw new Error("Missing preview address")
    const base = `http://127.0.0.1:${address.port}`
    const production = createIconPreviewHandler({
      distDir: join(root, "dist"),
      repository: createIconRepository(join(root, "icons")),
      spa: true,
    })
    await Promise.all(
      Object.entries(createLlmsDocuments()).map(async ([filename, text]) => {
        expect(await readFile(join(root, "dist", filename), "utf8")).toBe(text)
        const response = await fetch(`${base}/${filename}`)
        expect(response.status).toBe(200)
        expect(response.headers.get("content-type")).toContain("text/plain")
        expect(await response.text()).toBe(text)
        const local = await production(
          new Request(`https://icons.test/${filename}`)
        )
        expect(local.headers.get("content-type")).toBe(
          "text/plain; charset=utf-8"
        )
        expect(await local.text()).toBe(text)
        const head = await production(
          new Request(`https://icons.test/${filename}`, { method: "HEAD" })
        )
        expect(head.status).toBe(200)
        expect(await head.text()).toBe("")
      })
    )
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.httpServer.close((error) => (error ? reject(error) : resolve()))
        if ("closeAllConnections" in server!.httpServer)
          server!.httpServer.closeAllConnections()
      })
    }
    await rm(root, { recursive: true, force: true })
  }
})
