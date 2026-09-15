import { afterEach, describe, expect, spyOn, test } from "bun:test"
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { tmpdir } from "node:os"
import { createServer as createHttpServer } from "node:http"
import { runInNewContext } from "node:vm"
import { build, createServer, parseAst, preview } from "vite"

import {
  icones,
  iconify,
  icons,
  type Mode,
  type Options,
  type IconesPluginOptions,
} from "@icones/vite"
import { iconToElementData } from "@icones/vite/tooling/elements"
import {
  collectionEntry,
  updateCollectionManifest,
} from "@icones/vite/tooling/collections"
import { elementDataToIcon } from "@icones/core/svg-data"
import { collectStaticNames } from "../../vite/src/collect.ts"
import type { IconData, IconSet, RuntimeIcon } from "@icones/core/types"

test("icones is the canonical plugin entry and retains legacy aliases", () => {
  const options: IconesPluginOptions = { fallbackToApi: false }
  expect(icones(options)).toHaveLength(2)
  expect(iconify).toBe(icones)
  expect(icons).toBe(icones)
})

const circle: IconData = {
  body: '<path fill="none" stroke="currentColor" stroke-width="2" d="M2 12h20"/>',
  width: 24,
  height: 24,
}
const filled: IconData = {
  body: '<path fill="currentColor" d="M2 10h20v4H2z"/>',
  width: 24,
  height: 24,
}
// Keep simulated extraction sources distinct from names shipped by @icones/icons.
const set: IconSet = {
  prefix: "fixture",
  width: 24,
  height: 24,
  icons: {
    refresh: circle,
    heart: circle,
    "heart-filled": filled,
    unused: { body: '<path id="unused-icon"/>' },
    wide: {
      body: '<path fill="#f00" d="M0 0h32v16H0z"/>',
      width: 32,
      height: 16,
    },
  },
  aliases: { reload: { parent: "refresh", hFlip: true } },
  categories: {
    Arrows: ["refresh", "reload"],
    Shapes: ["wide", "heart", "heart-filled"],
  },
}
const temporaryDirectories: string[] = []
async function temporaryData() {
  const directory = await mkdtemp(tmpdir() + "/icones-test-")
  temporaryDirectories.push(directory)
  return directory
}
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

const entryId = "virtual:iconify-test"
const packageDir = path.dirname(
  createRequire(import.meta.url).resolve("@icones/icons/package.json")
)
function staticEntry(...names: string[]) {
  return [
    'import { resolve } from "@icones/core/runtime";',
    'import { Icon } from "@icones/react";',
    'import { createElement } from "react";',
    `globalThis.testIcons = { resolve, icons: [${names.map((name) => `createElement(Icon, { name: ${JSON.stringify(name)} })`).join(",")}] };`,
  ].join("\n")
}
const entry = [
  'import { resolve, iconLoader } from "@icones/core/runtime"',
  'import { Icon, IconConfig } from "@icones/react"',
  'import { createElement } from "react"',
  'import { renderToStaticMarkup } from "react-dom/server"',
  'globalThis.testIcons = { resolve, iconLoader, render: () => renderToStaticMarkup(createElement(IconConfig, { defaultSize: "xl", strokeWidth: 2 },',
  'createElement(Icon, { name: "fixture:refresh", altName: "fixture:reload" }),',
  'createElement(Icon, { name: "fixture:wide" }), createElement(Icon, { name: "custom:logo" }), createElement(Icon, { name: "fixture:heart" }))) }',
].join("\n")
function testEntry(code = entry) {
  return {
    name: "test-entry",
    resolveId: (id: string) => (id === entryId ? "\0" + entryId : undefined),
    load: (id: string) => (id === "\0" + entryId ? code : undefined),
  }
}
type Asset = { type: "asset"; fileName: string; source: string | Uint8Array }
type Chunk = { type: "chunk"; code: string }
type Output = { output: (Asset | Chunk)[] }
async function bundle(
  mode: Mode,
  dataDir: string,
  extra: Options = {},
  code = entry,
  output?: { outDir: string; base: string }
) {
  const result = await build({
    root: import.meta.dir + "/../../..",
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    cacheDir: await temporaryData(),
    logLevel: "silent",
    base: output?.base ?? "/preview/",
    plugins: [
      icones({
        mode,
        dataDir,
        iconSets: [set],
        icons: { "custom:logo": circle },
        fallbackToApi: false,
        ...extra,
      }),
      testEntry(code),
    ],
    build: {
      write: Boolean(output),
      outDir: output?.outDir,
      minify: false,
      rollupOptions: { input: entryId, output: { format: "iife" } },
    },
  })
  const files = (
    (Array.isArray(result) ? result : [result]) as Output[]
  ).flatMap((item) => item.output)
  const js = files
    .filter((item): item is Chunk => item.type === "chunk")
    .map((item) => item.code)
    .join("\n")
  const runtimeRequests: string[] = []
  const context = {
    console,
    TextEncoder,
    TextDecoder,
    MessageChannel,
    setTimeout,
    clearTimeout,
    fetch: async (input: RequestInfo | URL) => {
      runtimeRequests.push(String(input))
      return new Response(null, { status: 404 })
    },
  } as Record<string, unknown>
  runInNewContext(js, context)
  return {
    runtime: context.testIcons as {
      resolve(name: string): RuntimeIcon | undefined
      iconLoader(name: string): unknown
      render(): string
    },
    js,
    runtimeRequests,
    assets: files.filter((item): item is Asset => item.type === "asset"),
  }
}

describe("static collection and JSON sources", () => {
  for (const mode of ["svg", "symbol"] as const) {
    for (const emitData of [true, "used", false] as const) {
      test(`package fallback is read-only and emits only collected icons (${mode}, ${emitData})`, async () => {
        const parent = await temporaryData()
        const dataDir = path.join(parent, "absent")
        const files = [
          "tabler/data/star.json",
          "tabler/symbols/star.svg",
          "tabler/manifest.json",
        ]
        const signatures = () =>
          Promise.all(
            files.map(async (file) => {
              const metadata = await stat(path.join(packageDir, file))
              return [
                metadata.size,
                metadata.mtimeMs,
                await readFile(path.join(packageDir, file), "utf8"),
              ]
            })
          )
        const before = await signatures()
        const { runtime, assets, js } = await bundle(
          mode,
          dataDir,
          {
            emitData,
            icons: { "tabler:star": circle },
            iconSets: [{ prefix: "tabler", icons: { star: filled } }],
            loadIcon: () => {
              throw new Error("Package must precede custom sources")
            },
          },
          staticEntry(
            "tabler:star",
            "tabler:star-filled",
            "circle-flags:us",
            "hugeicons:search-01"
          )
        )
        const json = assets.filter((asset) => asset.fileName.endsWith(".json"))
        expect(json.map((asset) => asset.fileName).toSorted()).toEqual(
          emitData === false
            ? []
            : [
                "icons/flag/data/us-circle.json",
                "icons/huge/data/search-01.json",
                "icons/tabler/data/star-filled.json",
                "icons/tabler/data/star.json",
              ]
        )
        const expected = JSON.parse(
          await readFile(path.join(packageDir, files[0]!), "utf8")
        )
        if (emitData !== false)
          expect(
            JSON.parse(
              String(
                json.find((asset) => asset.fileName.endsWith("/star.json"))!
                  .source
              )
            )
          ).toEqual(expected)
        if (mode === "svg") {
          expect(runtime.resolve("tabler:star")?.data).toEqual(expected)
          expect(runtime.resolve("circle-flags:us")?.data).toBeDefined()
          expect(runtime.resolve("hugeicons:search-01")?.data).toBeDefined()
        } else {
          expect(
            assets.filter((asset) => asset.fileName.endsWith(".svg"))
          ).toHaveLength(4)
          expect(runtime.resolve("circle-flags:us")?.viewBox).toBe(
            "0 0 512 512"
          )
          expect(runtime.resolve("hugeicons:search-01")?.href).toContain(
            "/huge/symbols/search-01-"
          )
        }
        expect(runtime.resolve("tabler:heart")).toBeUndefined()
        expect(js).not.toContain("@icones/icons")
        expect(js).not.toContain("api.iconify.design")
        expect(await readdir(parent)).toEqual([])
        expect(await signatures()).toEqual(before)
      })
    }
  }

  test("partial local manifests and unindexed overrides take precedence over the package", async () => {
    const dataDir = await temporaryData()
    await mkdir(path.join(dataDir, "tabler/data"), { recursive: true })
    await Promise.all(
      ["star", "heart"].map((name) =>
        writeFile(
          path.join(dataDir, `tabler/data/${name}.json`),
          JSON.stringify(iconToElementData(circle))
        )
      )
    )
    await updateCollectionManifest(
      dataDir,
      collectionEntry("tabler", "general", "heart")
    )
    const { runtime, assets } = await bundle(
      "svg",
      dataDir,
      {},
      staticEntry("tabler:star", "tabler:star-filled")
    )
    expect(runtime.resolve("tabler:star")?.data).toEqual(
      iconToElementData(circle)
    )
    expect(runtime.resolve("tabler:star-filled")?.data).toEqual(
      JSON.parse(
        await readFile(
          path.join(packageDir, "tabler/data/star-filled.json"),
          "utf8"
        )
      )
    )
    // Default emitData includes local unused JSON, but not unused package JSON.
    expect(assets.map((asset) => asset.fileName).toSorted()).toEqual([
      "icons/tabler/data/heart.json",
      "icons/tabler/data/star-filled.json",
      "icons/tabler/data/star.json",
    ])
    expect(
      (await readdir(path.join(dataDir, "tabler/data"))).toSorted()
    ).toEqual(["heart.json", "star.json"])
  })

  test("legacy dataDir overrides package icons without changing their output layout", async () => {
    const dataDir = path.join(await temporaryData(), "data")
    await mkdir(path.join(dataDir, "tabler/custom"), { recursive: true })
    await writeFile(
      path.join(dataDir, "tabler/custom/star.json"),
      JSON.stringify(iconToElementData(circle))
    )
    const { runtime, assets } = await bundle(
      "svg",
      dataDir,
      { emitData: "used" },
      staticEntry("tabler:star", "tabler:star-filled")
    )
    expect(runtime.resolve("tabler:star")?.data).toEqual(
      iconToElementData(circle)
    )
    expect(assets.map((asset) => asset.fileName).toSorted()).toEqual([
      "icons/data/tabler/custom/star.json",
      "icons/tabler/data/star-filled.json",
    ])
    expect(await readdir(path.join(dataDir, "tabler"))).toEqual(["custom"])
  })

  for (const content of ["invalid JSON", undefined]) {
    test(`invalid indexed local icons do not silently fall back (${content ?? "missing file"})`, async () => {
      const dataDir = await temporaryData()
      await updateCollectionManifest(
        dataDir,
        collectionEntry("tabler", "general", "star")
      )
      if (content) {
        await mkdir(path.join(dataDir, "tabler/data"), { recursive: true })
        await writeFile(path.join(dataDir, "tabler/data/star.json"), content)
      }
      await expect(
        bundle("svg", dataDir, { emitData: "used" }, staticEntry("tabler:star"))
      ).rejects.toThrow()
    })
  }

  test("default dataDir falls back from an unrelated project root and serves only collected package assets", async () => {
    const root = await temporaryData()
    const server = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      base: "/preview/",
      cacheDir: await temporaryData(),
      optimizeDeps: { noDiscovery: true, include: [] },
      plugins: [icones({ mode: "symbol", fallbackToApi: false })],
      server: { host: "127.0.0.1", port: 0 },
    })
    try {
      await server.listen()
      await server.ssrLoadModule("virtual:icones/icon/tabler:star")
      const runtime = await server.ssrLoadModule("virtual:icones")
      const base = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}`
      const symbol = await fetch(
        base + runtime.resolve("tabler:star").href.split("#")[0]
      )
      expect(symbol.status).toBe(200)
      expect(await symbol.text()).toContain("<symbol")
      const jsonUrl = base + "/preview/icons/tabler/data/star.json"
      const json = await fetch(jsonUrl)
      expect(json.status).toBe(200)
      expect(await json.json()).toEqual(
        JSON.parse(
          await readFile(path.join(packageDir, "tabler/data/star.json"), "utf8")
        )
      )
      const head = await fetch(jsonUrl, { method: "HEAD" })
      expect(head.status).toBe(200)
      expect(await head.text()).toBe("")
      expect(
        (await fetch(base + "/preview/icons/tabler/data/heart.json")).status
      ).toBe(404)
      const protocol = await fetch(
        base + "/preview/icons/tabler.json?icons=star"
      )
      expect((await protocol.json()).not_found).toEqual(["star"])
      expect(
        (await (await fetch(base + "/preview/icons/catalog")).json()).icons
      ).toEqual([])
      expect(await readdir(root)).toEqual([])
    } finally {
      await server.close()
    }
  })

  test("fresh preview serves emitted package assets without a dataDir", async () => {
    const dataDir = path.join(await temporaryData(), "absent")
    const outDir = await temporaryData()
    const { assets } = await bundle(
      "symbol",
      dataDir,
      { emitData: "used" },
      staticEntry("tabler:star"),
      { outDir, base: "/preview/" }
    )
    const server = await preview({
      root: import.meta.dir + "/../../..",
      configFile: false,
      logLevel: "silent",
      base: "/preview/",
      build: { outDir },
      plugins: [icones({ dataDir, fallbackToApi: false })],
      preview: { host: "127.0.0.1", port: 0 },
    })
    try {
      const base = `http://127.0.0.1:${(server.httpServer.address() as { port: number }).port}/preview/`
      expect(assets).toHaveLength(2)
      await Promise.all(
        assets.map(async (asset) => {
          const response = await fetch(base + asset.fileName)
          expect(response.status).toBe(200)
          expect(await response.text()).toBe(String(asset.source))
        })
      )
    } finally {
      await server.close()
    }
  })

  test("a copied flat JSON file is registered without a category path or API", async () => {
    const dataDir = await temporaryData()
    await mkdir(dataDir + "/tabler/data", { recursive: true })
    await writeFile(
      dataDir + "/tabler/data/star.json",
      JSON.stringify(iconToElementData(circle))
    )
    const code =
      'import { resolve } from "@icones/core/runtime"; import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = { resolve, icon: createElement(Icon, { name: "tabler:star" }) }'
    const { runtime } = await bundle(
      "svg",
      dataDir,
      { iconSets: [], icons: {}, emitData: false, fallbackToApi: false },
      code
    )
    expect(runtime.resolve("tabler:star")?.data).toEqual(
      iconToElementData(circle)
    )
    expect(
      JSON.parse(await readFile(dataDir + "/tabler/manifest.json", "utf8"))
        .variants.outline.general
    ).toEqual({ json: ["star.json"], svg: ["star.svg"] })
    expect(
      await readFile(dataDir + "/tabler/symbols/star.svg", "utf8")
    ).toContain('<symbol id="icon"')
  })

  test("flat collections resolve legacy namespaces without an API or category paths", async () => {
    const names = [
      "circle-flags:us",
      "flag:us-circle",
      "hugeicons:search-01",
      "huge:search-01",
    ]
    const code =
      'import { resolve } from "@icones/core/runtime"; import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = { resolve, icons: [' +
      names
        .map((name) => `createElement(Icon, { name: ${JSON.stringify(name)} })`)
        .join(",") +
      "] }"
    const { runtime, assets } = await bundle(
      "svg",
      new URL("../../icons", import.meta.url).pathname,
      { iconSets: [], icons: {}, emitData: false, fallbackToApi: false },
      code
    )
    expect(assets).toHaveLength(0)
    expect(runtime.resolve(names[0]!)?.data).toEqual(
      runtime.resolve(names[1]!)?.data
    )
    expect(runtime.resolve(names[2]!)?.data).toEqual(
      runtime.resolve(names[3]!)?.data
    )
    expect(runtime.resolve(names[0]!)?.data).toBeDefined()
    expect(runtime.resolve(names[2]!)?.data).toBeDefined()
  })

  for (const concurrency of [undefined, 2]) {
    test(`bounds extraction concurrency (${concurrency ?? "default"}) and deduplicates names`, async () => {
      const names = Array.from(
        { length: 24 },
        (_, index) => `queued:icon-${index}`
      )
      const code =
        'import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = [' +
        [...names, names[0]]
          .map(
            (name) => `createElement(Icon, { name: ${JSON.stringify(name)} })`
          )
          .join(",") +
        "]"
      let active = 0
      let peak = 0
      const requested: string[] = []
      const signals: (AbortSignal | undefined)[] = []
      const { assets } = await bundle(
        "symbol",
        await temporaryData(),
        {
          concurrency,
          emitData: false,
          loadIcon: async (name, request) => {
            requested.push(name)
            signals.push(request?.signal)
            peak = Math.max(peak, ++active)
            try {
              await new Promise((resolve) => setTimeout(resolve, 5))
              return circle
            } finally {
              active--
            }
          },
        },
        code
      )
      expect(peak).toBeLessThanOrEqual(concurrency ?? 8)
      expect(peak).toBeGreaterThan(1)
      expect(requested.toSorted()).toEqual(names.toSorted())
      expect(signals.every((signal) => signal && !signal.aborted)).toBe(true)
      expect(assets).toHaveLength(names.length)
    })
  }

  test("times out ignored loader cancellation without writing late results", async () => {
    const dataDir = await temporaryData()
    let finish!: (data: IconData) => void
    let signal: AbortSignal | undefined
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const built = bundle(
      "symbol",
      dataDir,
      {
        // Leave enough time for a cold @icones/icons index before exercising
        // cancellation inside the intentionally non-settling custom loader.
        timeout: 500,
        loadIcon: (_name, request) => {
          signal = request?.signal
          started()
          return new Promise((resolve) => {
            finish = resolve
          })
        },
      },
      'import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = createElement(Icon, {name: "slow:icon"})'
    )
    const settled = built.then(
      () => null,
      (error: unknown) => error
    )
    await ready
    const result = await Promise.race([
      settled,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_000)),
    ])
    finish(circle)
    await settled
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(result).toBeInstanceOf(Error)
    expect(String(result)).toContain("timed out")
    expect(signal?.aborted).toBe(true)
    expect(await readdir(dataDir, { recursive: true })).toEqual([])
  })

  test("supports used/all JSON emission while preserving boolean compatibility", async () => {
    const dataDir = await temporaryData()
    await bundle("symbol", dataDir)
    const code =
      'import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = createElement(Icon, { name: "fixture:refresh" })'
    for (const emitData of ["used", "all", true, false] as const) {
      const { assets } = await bundle("symbol", dataDir, { emitData }, code)
      const json = assets.filter((asset) => asset.fileName.endsWith(".json"))
      expect(json.length).toBe(
        emitData === "used" ? 1 : emitData === false ? 0 : 5
      )
      if (emitData === "used")
        expect(json[0]!.fileName).toBe("icons/fixture/data/refresh.json")
      expect(
        assets.filter((asset) => asset.fileName.endsWith(".svg"))
      ).toHaveLength(1)
    }
  })

  test("used JSON emission does not read unused bodies", async () => {
    const dataDir = await temporaryData()
    await bundle("symbol", dataDir)
    await writeFile(dataDir + "/fixture/data/wide.json", "broken")
    const code =
      'import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = createElement(Icon, { name: "fixture:refresh" })'
    const { assets } = await bundle(
      "symbol",
      dataDir,
      { emitData: "used" },
      code
    )
    expect(assets).toHaveLength(2)
    await expect(
      bundle("symbol", dataDir, { emitData: "all" }, code)
    ).rejects.toThrow()
  })

  test("the built-in API fetch aborts on its extraction deadline", async () => {
    const dataDir = await temporaryData()
    let sawRequest = false
    const api = createHttpServer(() => {
      sawRequest = true
      // Intentionally leave the response pending until the plugin aborts fetch.
    })
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve))
    const { port } = api.address() as { port: number }
    const nativeFetch = globalThis.fetch
    let signal: AbortSignal | null | undefined
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        (...args: Parameters<typeof fetch>) => {
          const [input, init] = args
          if (String(input).startsWith(`http://127.0.0.1:${port}/`))
            signal = init?.signal
          return nativeFetch(...args)
        },
        { preconnect: nativeFetch.preconnect }
      )
    )
    try {
      await expect(
        bundle(
          "symbol",
          dataDir,
          {
            timeout: 200,
            fallbackToApi: true,
            apiBaseUrl: `http://127.0.0.1:${port}`,
          },
          'import { Icon } from "@icones/react"; import { createElement } from "react"; globalThis.testIcons = createElement(Icon, { name: "slow:network" })'
        )
      ).rejects.toThrow("timed out")
      expect(sawRequest).toBe(true)
      expect(signal?.aborted).toBe(true)
      expect(await readdir(dataDir, { recursive: true })).toEqual([])
    } finally {
      fetchSpy.mockRestore()
      await new Promise<void>((resolve) => {
        api.close(() => resolve())
        api.closeAllConnections()
      })
    }
  })

  test("closing a dev server cancels pending loaders before waiting for transforms", async () => {
    const dataDir = await temporaryData()
    let signal: AbortSignal | undefined
    let started!: () => void
    let finish!: (data: IconData) => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const server = await createServer({
      root: import.meta.dir + "/../../..",
      configFile: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      cacheDir: await temporaryData(),
      logLevel: "silent",
      server: { middlewareMode: true },
      plugins: [
        icones({
          dataDir,
          timeout: 5000,
          loadIcon: (_name, request) => {
            signal = request?.signal
            started()
            return new Promise((resolve) => {
              finish = resolve
            })
          },
        }),
      ],
    })
    const loading = server
      .ssrLoadModule("virtual:icones/icon/cancel:one")
      .catch((error: unknown) => error)
    try {
      await ready
      const closing = server.close()
      expect(
        await Promise.race([
          closing.then(() => true),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 500)
          ),
        ])
      ).toBe(true)
      expect(signal?.aborted).toBe(true)
      expect(String(signal?.reason)).toContain("cancelled")
      expect(await loading).toBeInstanceOf(Error)
    } finally {
      finish(circle)
      await loading
      await server.close()
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(await readdir(dataDir, { recursive: true })).toEqual([])
  })

  test("rejects invalid extraction limits before any build work", () => {
    for (const concurrency of [0, -1, 1.5, Infinity, NaN])
      expect(() => icones({ concurrency })).toThrow(RangeError)
    for (const timeout of [0, -1, Infinity, NaN])
      expect(() => icones({ timeout })).toThrow(RangeError)
  })

  test("an explicit icon loader overrides a collected static name without changing the registry", async () => {
    const dataDir = await temporaryData()
    const { runtime } = await bundle(
      "symbol",
      dataDir,
      {},
      entry.replace(
        'name: "fixture:refresh", altName: "fixture:reload"',
        'name: "fixture:refresh", altName: "fixture:reload", loader: () => null'
      )
    )
    expect(runtime.resolve("fixture:refresh")?.href).toBeDefined()
    expect(runtime.render()).not.toContain(
      runtime.resolve("fixture:refresh")!.href!
    )
    expect(runtime.render()).toContain("<use")
  })
  test("emitData false emits only collected symbols, with no JSON or catalog manifest", async () => {
    const dataDir = await temporaryData()
    const { assets, js, runtime } = await bundle("symbol", dataDir, {
      emitData: false,
    })
    expect(assets.length).toBeGreaterThan(0)
    expect(assets.every((asset) => asset.fileName.endsWith(".svg"))).toBe(true)
    expect(js.includes("virtual:icones/catalog")).toBe(false)
    expect(js).not.toContain("unused-icon")
    expect(runtime.render()).toContain("<use")
    expect(await readdir(dataDir + "/fixture/data")).toContain("heart.json")
  })
  for (const mode of ["svg", "symbol"] as const) {
    test(
      mode +
        " collects only literal references and preserves sizing, aliases, dimensions",
      async () => {
        const dataDir = await temporaryData()
        const { runtime, js, assets } = await bundle(mode, dataDir)
        const refresh = runtime.resolve("fixture:refresh")!
        expect(refresh).toBeDefined()
        expect(runtime.resolve("fixture:unused")).toBeUndefined()
        expect(runtime.resolve("Search01")).toBeUndefined()
        expect(js).not.toContain("unused-icon")
        expect(runtime.resolve("fixture:reload")).toBeDefined()
        expect(runtime.resolve("custom:logo")).toBeDefined()
        expect(runtime.resolve("fixture:heart")).toBeDefined()
        expect(runtime.resolve("fixture:heart-filled")).toBeUndefined()
        expect(runtime.resolve("fixture:refresh-filled")).toBeUndefined()
        expect(js).not.toContain("M2 10h20v4H2z")
        expect(assets.some((asset) => asset.fileName.includes("filled"))).toBe(
          false
        )
        const iconJSON = assets.find(
          (asset) => asset.fileName === "icons/fixture/data/heart.json"
        )
        expect(JSON.parse(String(iconJSON?.source))).toEqual(
          iconToElementData(circle)
        )
        const markup = runtime.render()
        expect(markup).toContain('data-state="loaded"')
        expect(markup).toContain('width="28"')
        expect(markup).toContain('stroke-width="2"')
        expect(
          JSON.parse(
            await readFile(dataDir + "/fixture/data/refresh.json", "utf8")
          )
        ).toEqual(iconToElementData(circle))
        expect(
          assets.some(
            (asset) => asset.fileName === "icons/fixture/data/refresh.json"
          )
        ).toBe(true)
        expect(
          (await readdir(dataDir, { recursive: true })).some((file) =>
            file.includes("unused")
          )
        ).toBe(false)
        if (mode === "svg") {
          expect(refresh.data).toEqual(iconToElementData(circle))
        } else {
          expect(markup).toContain("<use")
          expect(js).not.toContain(circle.body)
          expect(refresh.href).toStartWith(
            "/preview/icons/fixture/symbols/refresh-"
          )
          const [pathname, id] = refresh.href!.split("#")
          const sprite = assets.find(
            (asset) => "/preview/" + asset.fileName === pathname
          )
          expect(String(sprite?.source)).toContain('id="' + id + '"')
          expect(String(sprite?.source)).toContain(
            "var(--icones-stroke-width, 2)"
          )
          expect(runtime.resolve("fixture:wide")?.viewBox).toBe("0 0 32 16")
          expect(
            assets.some((asset) => String(asset.source).includes("scale(-1 1)"))
          ).toBe(true)
        }
      }
    )
  }

  for (const mode of ["svg", "symbol"] as const) {
    test(`${mode} collects a filled name independently without loading its outline`, async () => {
      const dataDir = await temporaryData()
      const { runtime, assets } = await bundle(
        mode,
        dataDir,
        {},
        entry.replace('name: "fixture:heart"', 'name: "fixture:heart-filled"')
      )
      expect(runtime.resolve("fixture:heart")).toBeUndefined()
      const result = runtime.resolve("fixture:heart-filled")!
      expect(result).toBeDefined()
      expect(
        JSON.parse(
          await readFile(dataDir + "/fixture/data/heart-filled.json", "utf8")
        )
      ).toEqual(iconToElementData(filled))
      expect(
        assets.some(
          (asset) => asset.fileName === "icons/fixture/data/heart.json"
        )
      ).toBe(false)
      if (mode === "svg") {
        expect(result.data).toEqual(iconToElementData(filled))
        expect(runtime.render()).toContain("M2 10h20v4H2z")
      } else {
        expect(result.href).toContain("heart-filled-")
        expect(runtime.render()).toContain(result.href!)
      }
    })
  }

  test("the default build API requests only literal names, not their filled counterparts", async () => {
    const dataDir = await temporaryData()
    const requested: string[] = []
    const server = createHttpServer((request, response) => {
      requested.push(request.url!)
      response.setHeader("content-type", "application/json")
      response.end(
        JSON.stringify(request.url!.startsWith("/fixture.json") ? set : circle)
      )
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    try {
      const address = server.address() as { port: number }
      const { assets, runtime, runtimeRequests } = await bundle(
        "svg",
        dataDir,
        {
          iconSets: [],
          icons: {},
          fallbackToApi: true,
          apiBaseUrl: `http://127.0.0.1:${address.port}`,
        }
      )
      expect(requested.sort()).toEqual([
        "/custom.json?icons=logo",
        "/fixture.json?icons=heart",
        "/fixture.json?icons=refresh",
        "/fixture.json?icons=reload",
        "/fixture.json?icons=wide",
      ])
      expect(runtime.resolve("fixture:heart-filled")).toBeUndefined()
      // fallbackToApi is build-only; the framework runtime independently uses
      // the first-party per-collection static service.
      expect(await runtime.iconLoader("fixture:heart-filled")).toBeNull()
      expect(runtimeRequests).toEqual([
        "https://fixture.icones.go-slim.dev/data/heart-filled.json",
      ])
      expect(assets.some((asset) => asset.fileName.includes("filled"))).toBe(
        false
      )
      expect(
        JSON.parse(await readFile(dataDir + "/fixture/data/heart.json", "utf8"))
      ).toEqual(iconToElementData(circle))
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
    }
  })

  test("uses assetsDir for both JSON output and sprite URLs", async () => {
    const dataDir = await temporaryData()
    const { runtime, assets } = await bundle("symbol", dataDir, {
      assetsDir: "assets/glyphs",
    })
    expect(assets.length).toBeGreaterThan(0)
    expect(
      assets.every((asset) => asset.fileName.startsWith("assets/glyphs/"))
    ).toBe(true)
    expect(
      assets.some(
        (asset) => asset.fileName === "assets/glyphs/fixture/data/refresh.json"
      )
    ).toBe(true)
    expect(runtime.resolve("fixture:refresh")?.href).toStartWith(
      "/preview/assets/glyphs/fixture/symbols/refresh-"
    )
  })

  test("builds again from saved JSON without an icon-set package or API", async () => {
    const dataDir = await temporaryData()
    await bundle("symbol", dataDir)
    const { runtime } = await bundle("symbol", dataDir, {
      iconSets: [],
      icons: {},
      loadIcon: () => {
        throw new Error("Must not request API")
      },
    })
    expect(runtime.render()).toContain('data-state="loaded"')
  })

  test("fetches missing static data with a custom build-time API", async () => {
    const dataDir = await temporaryData()
    const requested: string[] = []
    const { runtime } = await bundle("svg", dataDir, {
      iconSets: [],
      icons: {},
      loadIcon: async (name) => {
        requested.push(name)
        return name.startsWith("fixture:") ? set : circle
      },
    })
    expect(requested.sort()).toEqual([
      "custom:logo",
      "fixture:heart",
      "fixture:refresh",
      "fixture:reload",
      "fixture:wide",
    ])
    expect(
      elementDataToIcon(
        runtime.resolve("fixture:reload")!
          .data as import("@icones/react").ElementData
      ).body
    ).toContain("scale(-1 1)")
  })

  test("serves collected sprites and set/category JSON under the Vite base", async () => {
    const dataDir = await temporaryData()
    const server = await createServer({
      root: import.meta.dir + "/../../..",
      configFile: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      cacheDir: await temporaryData(),
      logLevel: "silent",
      base: "/preview/",
      plugins: [
        icones({
          mode: "symbol",
          dataDir,
          iconSets: [set],
          fallbackToApi: false,
        }),
      ],
      server: { host: "127.0.0.1", port: 0 },
    })
    try {
      await server.listen()
      await server.ssrLoadModule("virtual:icones/icon/fixture:refresh")
      const module = await server.ssrLoadModule("virtual:icones")
      const address = server.httpServer!.address() as { port: number }
      const base = "http://127.0.0.1:" + address.port
      const resolved = module.resolve("fixture:refresh") as RuntimeIcon
      const response = await fetch(base + resolved.href!.split("#")[0])
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("<symbol")
      const json = await fetch(
        base + "/preview/icons/fixture/data/refresh.json"
      )
      expect(await json.json()).toEqual(iconToElementData(circle))
      const protocol = await fetch(
        base + "/preview/icons/fixture.json?icons=refresh"
      )
      expect((await protocol.json()).icons.refresh).toEqual(circle)
      const page = await fetch(
        base + "/preview/icons/catalog?set=fixture&limit=1"
      )
      expect((await page.json()).icons).toHaveLength(1)
    } finally {
      await server.close()
    }
  })

  for (const base of ["/", "/nested/preview/"]) {
    test(`a fresh preview serves emitted files under ${base} and preserves API routing`, async () => {
      const dataDir = await temporaryData()
      const outDir = await temporaryData()
      const assetsDir = "assets/glyphs"
      const { assets } = await bundle("symbol", dataDir, { assetsDir }, entry, {
        outDir,
        base,
      })
      // Preview must serve the build, not re-read changed source JSON. It must
      // also work when the original sources are not deployed alongside dist.
      await writeFile(
        dataDir + "/fixture/data/refresh.json",
        JSON.stringify(iconToElementData(filled))
      )
      const withSources = base !== "/"
      const server = await preview({
        root: import.meta.dir + "/../../..",
        configFile: false,
        logLevel: "silent",
        base,
        plugins: [
          icones({
            mode: "symbol",
            dataDir: withSources ? dataDir : await temporaryData(),
            assetsDir,
            fallbackToApi: false,
          }),
        ],
        build: { outDir },
        preview: { host: "127.0.0.1", port: 0, open: false },
      })
      try {
        const address = server.httpServer.address() as { port: number }
        const origin = "http://127.0.0.1:" + address.port
        const symbol = assets.find((asset) => asset.fileName.endsWith(".svg"))!
        const json = assets.find(
          (asset) => asset.fileName === assetsDir + "/fixture/data/refresh.json"
        )!
        await Promise.all(
          [symbol, json].map(async (asset) => {
            const url = origin + base + asset.fileName
            const response = await fetch(url)
            expect(response.status).toBe(200)
            expect(response.headers.get("content-type")).toContain(
              asset === symbol ? "image/svg+xml" : "application/json"
            )
            expect(await response.text()).toBe(String(asset.source))
            const etag = response.headers.get("etag")
            expect(etag).toBeTruthy()
            const cached = await fetch(url, {
              headers: { "If-None-Match": etag! },
            })
            expect(cached.status).toBe(304)
            const head = await fetch(url, { method: "HEAD" })
            expect(head.status).toBe(200)
            expect(await head.text()).toBe("")
          })
        )
        const api = origin + base + assetsDir
        const protocol = await fetch(api + "/fixture.json?icons=refresh")
        expect(protocol.status).toBe(200)
        const data = await protocol.json()
        if (withSources) expect(data.icons.refresh).toEqual(filled)
        else expect(data.not_found).toEqual(["refresh"])
        await Promise.all(
          [
            "/unknown/no-icon.svg",
            "/symbols/unknown/general/no-icon.svg",
            "/data/unknown/general/no-icon.json",
          ].map(async (route) => {
            const missing = await fetch(api + route, {
              headers: { Accept: "text/html" },
            })
            expect(missing.status).toBe(404)
            expect(missing.headers.get("content-type")).toContain(
              "application/json"
            )
          })
        )
      } finally {
        await server.close()
      }
    }, 30_000)
  }

  test("rejects duplicate set prefixes and unsafe output paths", () => {
    expect(() => icones({ iconSets: [set, set] })).toThrow("Duplicate")
    expect(() => icones({ assetsDir: "../outside" })).toThrow("relative")
  })

  test("defaults to the independently deployable data directory outside src", async () => {
    const root = import.meta.dir + "/../.."
    const server = await createServer({
      root,
      configFile: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      cacheDir: await temporaryData(),
      logLevel: "silent",
      plugins: [icones({ fallbackToApi: false })],
      server: { middlewareMode: true },
    })
    try {
      await server.ssrLoadModule("virtual:icones/icon/tabler:star")
      const runtime = await server.ssrLoadModule("virtual:icones")
      const expected = JSON.parse(
        await readFile(root + "/icons/tabler/data/star.json", "utf8")
      )
      expect(runtime.resolve("tabler:star")?.data).toEqual(expected)
      expect(runtime.resolve("tabler:star-filled")).toBeUndefined()
    } finally {
      await server.close()
    }
  })

  test("renders statically collected icons through the Vite SSR module graph", async () => {
    const dataDir = await temporaryData()
    const server = await createServer({
      root: import.meta.dir + "/../../..",
      configFile: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      cacheDir: await temporaryData(),
      logLevel: "silent",
      plugins: [
        icones({
          mode: "symbol",
          dataDir,
          iconSets: [set],
          icons: { "custom:logo": circle },
          fallbackToApi: false,
        }),
        testEntry(
          entry.replace("globalThis.testIcons =", "export const testIcons =")
        ),
      ],
      server: { middlewareMode: true },
    })
    try {
      const module = await server.ssrLoadModule(entryId)
      const html = module.testIcons.render() as string
      expect(html.match(/data-state="loaded"/g)).toHaveLength(4)
      expect(html).toContain("/icons/fixture/symbols/refresh-")
      expect(html).toContain("<use")
    } finally {
      await server.close()
    }
  })
})

describe("binding-aware static collection", () => {
  test("keeps block-scoped shadowing local but respects function-scoped var", () => {
    const ast = parseAst(
      [
        'import { Icon } from "@icones/react";',
        'import { jsx } from "react/jsx-runtime";',
        'function App() { const first = jsx(Icon, {name:"tabler:first"}); if (flag) { let Icon; jsx(Icon,{name:"tabler:shadow"}); } return first; }',
        'function Other() { jsx(Icon,{name:"tabler:hoisted"}); if (flag) { var Icon; } }',
        'for (let Icon of values) { jsx(Icon,{name:"tabler:loop"}); }',
        'jsx(Icon,{name:"tabler:last"});',
      ].join("\n")
    )
    expect(collectStaticNames(ast)).toEqual(["tabler:first", "tabler:last"])
  })
  test("handles aliases, namespaces, templates, and alternate names, not computed/bare names", () => {
    const ast = parseAst(
      [
        'import { Icon as Glyph } from "@icones/react";',
        'import * as Icons from "@icones/react";',
        'import React from "react";',
        'import { jsx as _jsx } from "react/jsx-runtime";',
        '_jsx(Glyph, { name: "tabler:refresh", altName: "tabler:reload" });',
        "React.createElement(Icons.Icon, {name: `tabler:wide`});",
        "_jsx(Glyph, { name: `tabler:${name}` });",
        '_jsx(Glyph, { name: "Search01" });',
        '_jsx(Glyph, { data: set, name: "tabler:direct-data" });',
        '_jsx(Glyph, { name: "tabler:overridden", ...props });',
        '_jsx("input", {name: "tabler:unrelated"});',
        'function shadow(Glyph) { return _jsx(Glyph, {name: "tabler:shadowed"}); }',
        "const text = '<Icon name=\"tabler:comment\"/>';",
      ].join("\n")
    )
    expect(collectStaticNames(ast)).toEqual([
      "tabler:refresh",
      "tabler:reload",
      "tabler:wide",
    ])
  })
})
