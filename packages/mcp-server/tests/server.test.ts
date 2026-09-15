/* Sequential requests intentionally test protocol order and failure recovery. */
/* eslint-disable no-await-in-loop */
import { afterEach, expect, test } from "bun:test"
import { Client } from "@modelcontextprotocol/client"
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"
import { execFileSync, spawn } from "node:child_process"
import { once } from "node:events"
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createIconMcpServer } from "@icones/mcp-server"
import { resolveDataDirectory } from "../src/catalog.ts"

const cli = fileURLToPath(
  new URL("../../mcp-server/dist/cli.js", import.meta.url)
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
    demo: { outline: ["one", "two"], solid: ["one-filled"] },
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
          : { variantAliases: { outline: "regular", solid: "fill" } }),
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

test("real stdio client discovers read-only tools and reads paginated metadata, original drawings and licenses", async () => {
  const root = await fixture()
  const { client, stderr } = await connect(root)
  try {
    expect(client.getServerVersion()?.name).toBe("@icones/mcp-server")
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_icon_sets",
      "search_icons",
      "get_icon",
      "get_icon_license",
      "get_framework_usage",
    ])
    for (const tool of tools) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      })
      expect(tool.inputSchema.additionalProperties).toBe(false)
      expect(tool.outputSchema).toBeDefined()
    }
    const sets = await call(client, "list_icon_sets")
    expect(sets.totalIcons).toBe(6)
    expect(sets.sets.map((set: any) => set.id)).toEqual(["demo", "flag"])
    expect(sets.sets[0].sources.upstream).toEqual(source)
    expect(sets.sets[0].variants).toEqual([
      { id: "outline", count: 2, alias: "regular" },
      { id: "solid", count: 1, alias: "fill" },
    ])
    const first = await call(client, "search_icons", {
      set: "demo",
      category: "general",
      variant: "outline",
      limit: 1,
    })
    expect(first.icons.map((icon: any) => icon.name)).toEqual(["demo:one"])
    expect(first.total).toBe(2)
    expect(first.icons[0].variantAlias).toBe("regular")
    expect(first.nextOffset).toBe(1)
    const next = await call(client, "search_icons", {
      set: "demo",
      variant: "outline",
      offset: first.nextOffset,
      limit: 1,
    })
    expect(next.icons[0].name).toBe("demo:two")
    expect(next.nextOffset).toBeNull()
    expect(JSON.stringify(next)).not.toContain(root)
    expect(
      (await call(client, "search_icons", { query: "ONE", set: "demo" })).total
    ).toBe(2)
    expect(
      (await call(client, "search_icons", { query: "does-not-exist" })).icons
    ).toEqual([])
    const json = await call(client, "get_icon", { name: "demo:one" })
    expect(json.data).toEqual(drawing)
    expect(json.svg).toBeUndefined()
    expect(json.viewBox).toBe("0 0 24 24")
    expect(json.variant).toBe("outline")
    expect(json.variantAlias).toBe("regular")
    const solid = await call(client, "search_icons", {
      set: "demo",
      variant: "solid",
    })
    expect(solid.icons).toEqual([
      {
        name: "demo:one-filled",
        prefix: "demo",
        category: "general",
        variant: "solid",
        variantAlias: "fill",
      },
    ])
    const svg = await call(client, "get_icon", {
      name: "demo:one",
      format: "svg",
    })
    expect(svg.svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg.svg).toContain('stroke-width="2"')
    expect(svg.data).toBeUndefined()
    for (const [name, viewBox] of [
      ["flag:us", "0 0 640 480"],
      ["flag:us-circle", "0 0 512 512"],
      ["flag:us-square", "0 0 512 512"],
      ["circle-flags:us", "0 0 512 512"],
    ]) {
      const flag = await call(client, "get_icon", { name, format: "both" })
      expect(flag.viewBox).toBe(viewBox)
      expect(flag.svg).toContain(`viewBox="${viewBox}"`)
      expect(flag.data).toEqual(drawing)
      expect(flag.license).toEqual({ tool: "get_icon_license", set: "flag" })
    }
    const license = await call(client, "get_icon_license", { set: "demo" })
    expect(license.license).toBe(originalLicense)
    expect(license.sources.upstream).toEqual(source)
    expect(await readdir(path.join(root, "demo"))).not.toContain("symbols")
    expect(stderr()).toBe("")
  } finally {
    await client.close()
  }
}, 15000)

test("MCP rejects invalid parameters and returns actionable errors without filesystem paths", async () => {
  const root = await fixture()
  const { client } = await connect(root)
  try {
    for (const [name, args] of [
      ["search_icons", { limit: 101 }],
      ["search_icons", { limit: 0 }],
      ["search_icons", { offset: -1 }],
      ["search_icons", { query: "x".repeat(201) }],
      ["search_icons", { set: "../demo" }],
      ["search_icons", { url: "https://example.test" }],
      ["get_icon", { name: "../../secret" }],
      ["get_icon", { name: "demo:one", format: "png" }],
      ["get_icon_license", { set: "../demo" }],
      ["list_icon_sets", { directory: "/" }],
    ] as const) {
      const result = await client.callTool({ name, arguments: args })
      expect(result.isError).toBe(true)
    }
    for (const [name, args] of [
      ["get_icon", { name: "demo:missing" }],
      ["get_icon_license", { set: "missing" }],
    ] as const) {
      const result = await client.callTool({ name, arguments: args })
      expect(result.isError).toBe(true)
      expect(JSON.stringify(result)).not.toContain(root)
    }
    await writeFile(path.join(root, "demo/data/one.json"), "invalid json")
    expect(
      (
        await client.callTool({
          name: "get_icon",
          arguments: { name: "demo:one" },
        })
      ).isError
    ).toBe(true)
    await rm(path.join(root, "demo/license.txt"))
    const missing = await client.callTool({
      name: "get_icon_license",
      arguments: { set: "demo" },
    })
    expect(missing.isError).toBe(true)
    expect(JSON.stringify(missing)).toContain(
      "Check the original source before reuse"
    )
    expect(
      (await call(client, "search_icons", { limit: 1 })).icons
    ).toHaveLength(1)
  } finally {
    await client.close()
  }
}, 15000)

test("MCP blocks symlink escapes and oversized source files", async () => {
  const root = await fixture()
  const outside = await mkdtemp(path.join(tmpdir(), "icones-mcp-outside-"))
  temporary.push(outside)
  const secret = path.join(outside, "private.json")
  await writeFile(secret, JSON.stringify(drawing))
  await rm(path.join(root, "demo/data/one.json"))
  await symlink(secret, path.join(root, "demo/data/one.json"))
  const { client } = await connect(root)
  try {
    const result = await client.callTool({
      name: "get_icon",
      arguments: { name: "demo:one" },
    })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain(
      "outside the configured icon directory"
    )
    expect(JSON.stringify(result)).not.toContain(outside)
    await writeFile(
      path.join(root, "demo/license.txt"),
      "x".repeat(1024 * 1024 + 1)
    )
    expect(
      (
        await client.callTool({
          name: "get_icon_license",
          arguments: { set: "demo" },
        })
      ).isError
    ).toBe(true)
  } finally {
    await client.close()
  }
  await rm(path.join(root, "demo/manifest.json"))
  await symlink(secret, path.join(root, "demo/manifest.json"))
  await expect(createIconMcpServer({ dataDir: root })).rejects.toThrow(
    "outside the configured icon directory"
  )
})

test("catalog locates bundled artwork without an executable package entry", async () => {
  expect(await resolveDataDirectory()).toBe(
    await realpath(new URL("../../icons/", import.meta.url))
  )
})

test("CLI uses bundled collections from any working directory and honors explicit and environment data roots", async () => {
  const bundled = await connect()
  try {
    const icon = await call(bundled.client, "get_icon", {
      name: "tabler:star",
      format: "both",
    })
    expect(icon.name).toBe("tabler:star")
    expect(icon.svg).toContain("<svg")
    expect(bundled.stderr()).toBe("")
  } finally {
    await bundled.client.close()
  }
  const root = await fixture()
  const environment = await connect(undefined, { ICON_DATA_DIR: root })
  try {
    expect((await call(environment.client, "list_icon_sets")).totalIcons).toBe(
      6
    )
  } finally {
    await environment.client.close()
  }
  const explicit = await connect(root, {
    ICON_DATA_DIR: path.join(root, "missing"),
  })
  try {
    expect((await call(explicit.client, "list_icon_sets")).totalIcons).toBe(6)
  } finally {
    await explicit.client.close()
  }
}, 15000)

test("CLI help, version and startup failures do not pollute the protocol channel", async () => {
  expect(execFileSync("node", [cli, "--help"], { encoding: "utf8" })).toContain(
    "ICON_DATA_DIR"
  )
  expect(
    execFileSync("node", [cli, "--version"], { encoding: "utf8" }).trim()
  ).toBe("0.0.0")
  for (const args of [
    ["--unknown"],
    ["--data-dir"],
    ["--data-dir", ""],
    ["--data-dir", "/missing-icones-mcp-fixture"],
  ]) {
    try {
      execFileSync("node", [cli, ...args], { encoding: "utf8", stdio: "pipe" })
      throw new Error("Expected CLI failure")
    } catch (error) {
      const failure = error as {
        status?: number
        stdout?: string
        stderr?: string
      }
      expect(failure.status).toBe(1)
      expect(failure.stdout).toBe("")
      expect(failure.stderr).toContain("[icones-mcp-server]")
    }
  }
  const cliSource = await readFile(cli, "utf8")
  expect(cliSource).toStartWith("#!/usr/bin/env node")
})

test("stdio accepts a legacy 2025 handshake and exits cleanly on stdin EOF", async () => {
  const child = spawn("node", [cli, "--data-dir", await fixture()], {
    stdio: ["pipe", "pipe", "pipe"],
  })
  const exited = once(child, "exit")
  let output = ""
  const messages: any[] = []
  const pending = new Map<number, (value: any) => void>()
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    output += chunk
    let end: number
    while ((end = output.indexOf("\n")) >= 0) {
      const message = JSON.parse(output.slice(0, end))
      output = output.slice(end + 1)
      messages.push(message)
      pending.get(message.id)?.(message)
    }
  })
  const request = (id: number, method: string, params: object) =>
    new Promise<any>((resolve) => {
      pending.set(id, resolve)
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"
      )
    })
  const timeout = setTimeout(() => child.kill("SIGKILL"), 8000)
  try {
    const init = await request(1, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "legacy-test", version: "1" },
    })
    expect(init.result.serverInfo.name).toBe("@icones/mcp-server")
    expect(init.result.protocolVersion).toBe("2025-11-25")
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
        "\n"
    )
    const listed = await request(2, "tools/list", {})
    expect(listed.result.tools).toHaveLength(5)
    const called = await request(3, "tools/call", {
      name: "get_icon",
      arguments: { name: "demo:one" },
    })
    expect(called.result.structuredContent.data).toEqual(drawing)
    const resources = await request(4, "resources/list", {})
    expect(resources.result.resources).toHaveLength(8)
    const doc = await request(5, "resources/read", { uri: "icones://docs/vue" })
    expect(doc.result.contents[0].mimeType).toBe("text/markdown")
    expect(doc.result.contents[0].text).toContain("@icones/vue")
    const usage = await request(6, "tools/call", {
      name: "get_framework_usage",
      arguments: { framework: "react", topic: "color" },
    })
    expect(usage.result.structuredContent.topic).toBe("color")
    child.stdin.end()
    expect((await exited)[0]).toBe(0)
    expect(messages.every((message) => message.jsonrpc === "2.0")).toBe(true)
  } finally {
    clearTimeout(timeout)
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL")
  }
}, 10000)
