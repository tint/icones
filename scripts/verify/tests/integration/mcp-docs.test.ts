/* Sequential requests intentionally test protocol order and failure recovery. */
/* eslint-disable no-await-in-loop */
import { afterEach, expect, test } from "bun:test"
import { Client } from "@modelcontextprotocol/client"
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"
import { execFileSync } from "node:child_process"
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
  cp,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  mcpDocumentationUris,
  mcpTools,
  mcpTutorialSteps,
} from "../../../../app/src/features/mcp/content.ts"
import {
  getGuideArticle,
  guideFrameworks,
  guidePages,
} from "../../../../app/src/features/guide/content.ts"

const cli = fileURLToPath(
  new URL("../../../../packages/mcp-server/dist/cli.js", import.meta.url)
)

const temporary: string[] = []

const drawing = [
  [
    "path",
    { d: "M2 12h20", fill: "none", stroke: "currentColor", strokeWidth: "2" },
  ],
]

const originalLicense =
  "Original license\nCopyright Example\nKeep this exact notice.\n"

const source = {
  url: "https://example.test/icons",
  revision: "abc123",
  importedAt: "2026-09-10",
  distributionNotice: "Keep attribution.",
}

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "icones-mcp-"))
  temporary.push(root)
  const collections: Record<string, Record<string, string[]>> = {
    demo: { outline: ["one", "two"], filled: ["one-filled"] },
    flag: { circle: ["us-circle"], "1x1": ["us-square"], "4x3": ["us"] },
  }
  for (const [prefix, variants] of Object.entries(collections)) {
    await mkdir(path.join(root, prefix, "data"), { recursive: true })
    await writeFile(
      path.join(root, prefix, "manifest.json"),
      JSON.stringify({
        version: 1,
        prefix,
        variants: Object.fromEntries(
          Object.entries(variants).map(([variant, names]) => [
            variant,
            {
              general: {
                json: names.map((name) => name + ".json"),
                svg: names.map((name) => name + ".svg"),
              },
            },
          ])
        ),
        sources: { upstream: source },
        ...(prefix === "flag"
          ? { aliases: { "circle-flags": { suffix: "-circle" } } }
          : {}),
      })
    )
    await writeFile(path.join(root, prefix, "license.txt"), originalLicense)
    await Promise.all(
      Object.values(variants)
        .flat()
        .map((name) =>
          writeFile(
            path.join(root, prefix, "data", name + ".json"),
            JSON.stringify(drawing)
          )
        )
    )
  }
  return root
}

afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function connect(
  dataDir?: string,
  env?: Record<string, string>,
  options: { entry?: string; nodeArgs?: string[] } = {}
) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [
      ...(options.nodeArgs ?? []),
      options.entry ?? cli,
      ...(dataDir ? ["--data-dir", dataDir] : []),
    ],
    env,
    stderr: "pipe",
    cwd: tmpdir(),
  })
  let stderr = ""
  transport.stderr?.on("data", (chunk) => {
    stderr += String(chunk)
  })
  const client = new Client({ name: "icones-test", version: "1.0.0" })
  try {
    await client.connect(transport)
  } catch (error) {
    await transport.close()
    throw new Error(stderr || String(error), { cause: error })
  }
  return { client, stderr: () => stderr }
}

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown> = {}
) {
  const result = await client.callTool({ name, arguments: args })
  expect(result.isError).not.toBe(true)
  expect(result.structuredContent).toBeDefined()
  const text = result.content.find((item) => item.type === "text")
  expect(text?.type === "text" ? JSON.parse(text.text) : null).toEqual(
    result.structuredContent
  )
  return result.structuredContent as Record<string, any>
}

test("MCP tutorial tool examples run unchanged against the bundled collections", async () => {
  const root = fileURLToPath(
    new URL("../../../../packages/icons", import.meta.url)
  )
  const { client, stderr } = await connect(root)
  try {
    const responses = new Map<string, Record<string, any>>()
    for (const step of mcpTutorialSteps) {
      for (const example of step.examples) {
        if (!example.filename.startsWith("tools/call")) continue
        const request = JSON.parse(example.code)
        responses.set(
          request.name,
          await call(client, request.name, request.arguments)
        )
      }
    }
    expect([...responses.keys()]).toEqual(mcpTools.map(({ name }) => name))
    expect(
      responses
        .get("list_icon_sets")!
        .sets.some((set: any) => set.id === "tabler")
    ).toBe(true)
    expect(
      responses
        .get("search_icons")!
        .icons.some(
          (icon: any) => icon.name === responses.get("get_icon")!.name
        )
    ).toBe(true)
    expect(responses.get("get_icon")!.svg).toContain("<svg")
    expect(responses.get("get_icon")!.data).toBeArray()
    expect(JSON.stringify(responses.get("get_icon_license"))).toContain("MIT")
    expect(responses.get("get_framework_usage")!.text).toContain(
      "@icones/react"
    )
    expect(stderr()).toBe("")
  } finally {
    await client.close()
  }
})

test("framework documentation tools and resources share Guide content and keep Vanilla APIs separate", async () => {
  const { client, stderr } = await connect(await fixture())
  try {
    const { tools } = await client.listTools()
    const schema = tools.find((tool) => tool.name === "get_framework_usage")!
      .inputSchema as any
    expect(schema.properties.framework.enum).toEqual(
      guideFrameworks.map(({ id }) => id)
    )
    expect(schema.properties.topic.enum).toEqual([
      ...guidePages.map(({ id }) => id),
      "all",
    ])
    const { resources } = await client.listResources()
    expect(tools.map(({ name }) => name)).toEqual(
      mcpTools.map(({ name }) => name)
    )
    expect(resources.map(({ uri }) => uri)).toEqual(mcpDocumentationUris)
    expect(resources.map(({ uri }) => uri)).toEqual([
      ...guideFrameworks.map(({ id }) => "icones://docs/" + id),
      "icones://docs/vanilla/standard",
      "icones://docs/vanilla/web",
    ])
    expect(
      resources.every(({ mimeType }) => mimeType === "text/markdown")
    ).toBe(true)
    for (const { id } of guideFrameworks) {
      const usage = await call(client, "get_framework_usage", { framework: id })
      expect(usage.topic).toBe("getting-started")
      expect(usage.element).toBe(id === "vanilla" ? "web" : null)
      expect(usage.topics.map((topic: any) => topic.id)).toEqual(
        guidePages.map(({ id: topicId }) => topicId)
      )
      expect(usage.text).toContain(
        "commands require access to compatible @icones releases"
      )
      expect(usage.text).not.toContain("@workspace:*")
      expect(usage.text).not.toContain("/Users/")
      for (const section of getGuideArticle("getting-started", id, false)
        .sections) {
        for (const example of section.examples ?? [])
          expect(usage.text).toContain(example.code)
      }
      const all = await call(client, "get_framework_usage", {
        framework: id,
        topic: "all",
      })
      const resource = await client.readResource({ uri: all.uri })
      expect(resource.contents).toEqual([
        { uri: all.uri, mimeType: "text/markdown", text: all.text },
      ])
      expect(all.text.length).toBeGreaterThan(usage.text.length)
      for (const other of guideFrameworks.filter(
        ({ id: otherId }) => otherId !== id
      )) {
        const description = getGuideArticle(
          "overview",
          other.id,
          false
        ).description
        expect(all.text).not.toContain(description)
      }
    }
    const color = await call(client, "get_framework_usage", {
      framework: "react",
      topic: "color",
    })
    expect(color.text).toContain('color="#7712f7"')
    expect(color.text).not.toContain("### Getting started")
    expect(color.text).not.toContain("bun add @icones/react")
    const standard = await call(client, "get_framework_usage", {
      framework: "vanilla",
      element: "standard",
    })
    const web = await call(client, "get_framework_usage", {
      framework: "vanilla",
    })
    expect(standard.text).toContain("@icones/vanilla/standard-element")
    expect(standard.text).not.toContain("defineIconElement")
    expect(web.text).toContain("@icones/vanilla/web-element")
    expect(web.text).not.toContain("bindIcons")
    const both = await client.readResource({ uri: "icones://docs/vanilla" })
    expect((both.contents[0] as any).text).toContain("bindIcons")
    expect((both.contents[0] as any).text).toContain("defineIconElement")
    for (const args of [
      {},
      { framework: "angular" },
      { framework: "../react" },
      { framework: "react", topic: "unknown" },
      { framework: "react", element: "standard" },
      { framework: "vanilla", element: "all" },
      { framework: "vue", url: "https://example.test" },
    ])
      expect(
        (
          await client.callTool({
            name: "get_framework_usage",
            arguments: args,
          })
        ).isError
      ).toBe(true)
    for (const uri of [
      "icones://docs/angular",
      "icones://docs/react?file=secret",
      "file:///etc/passwd",
      "https://example.test",
    ]) {
      await expect(client.readResource({ uri })).rejects.toThrow()
    }
    expect(stderr()).toBe("")
  } finally {
    await client.close()
  }
}, 15000)

test("built documentation works without app sources, a dev server or network access and its snapshot is current", async () => {
  execFileSync(
    "bun",
    [
      fileURLToPath(
        new URL(
          "../../../../packages/mcp-server/scripts/generate-docs.ts",
          import.meta.url
        )
      ),
      "--check",
    ],
    { cwd: tmpdir(), stdio: "pipe" }
  )
  const root = await mkdtemp(path.join(tmpdir(), "icones-mcp-offline-"))
  temporary.push(root)
  await cp(path.dirname(cli), path.join(root, "dist"), { recursive: true })
  await symlink(
    fileURLToPath(
      new URL("../../../../packages/mcp-server/node_modules", import.meta.url)
    ),
    path.join(root, "node_modules")
  )
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ type: "module" })
  )
  const preload = path.join(root, "offline.cjs")
  await writeFile(
    preload,
    'const blocked = () => { throw new Error("Network forbidden in offline test") }; globalThis.fetch = blocked; for (const id of ["http", "https"]) { const m = require("node:" + id); m.request = m.get = blocked }; const net = require("node:net"); net.connect = net.createConnection = blocked; require("node:tls").connect = blocked;'
  )
  const emptyIcons = path.join(root, "icons")
  await mkdir(emptyIcons)
  const { client, stderr } = await connect(emptyIcons, undefined, {
    entry: path.join(root, "dist/cli.js"),
    nodeArgs: ["--require", preload],
  })
  try {
    expect((await call(client, "list_icon_sets")).sets).toEqual([])
    expect(
      (
        await call(client, "get_framework_usage", {
          framework: "astro",
          topic: "getting-started",
        })
      ).text
    ).toContain("bun add @icones/astro")
    const resource = await client.readResource({
      uri: "icones://docs/vanilla/standard",
    })
    expect((resource.contents[0] as any).text).toContain(
      "@icones/vanilla/standard-element"
    )
    expect((resource.contents[0] as any).text).not.toContain(
      "@icones/vanilla/web-element"
    )
    expect(stderr()).toBe("")
    expect(await readdir(emptyIcons)).toEqual([])
    for (const filename of (await readdir(path.join(root, "dist"))).filter(
      (name) => name.endsWith(".js")
    )) {
      const output = await readFile(path.join(root, "dist", filename), "utf8")
      expect(output).not.toContain("app/src/")
      expect(output).not.toContain("app/plugins/")
    }
  } finally {
    await client.close()
  }
}, 15000)
