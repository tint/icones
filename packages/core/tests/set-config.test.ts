import { expect, test } from "bun:test"
import {
  createIconScope,
  createIconController,
  createIconStore,
  mergeIconApi,
  resolveIconApi,
  renderIcon,
  type IconScopeOptions,
  type IconApiConfig,
  type IconOptions,
} from "@icones/core"

const data = { width: 24, height: 24, body: '<path d="M0 12h24"/>' }

const attrs = (
  options: IconScopeOptions,
  props: IconOptions = { name: "tabler:star" }
) => renderIcon({ status: "loaded", data }, props, options).attributes

test("size presets fall back per key, protect prototype keys, and accept CSS lengths and zero", () => {
  const options = {
    defaultSize: "lg",
    sizeValues: { default: { lg: 36 }, tabler: { xl: 40, sm: "2em", md: 0 } },
    strokeWidth: { tabler: 0 },
    absoluteStrokeWidth: { tabler: false, default: true },
  } as const
  expect(attrs(options).width).toBe(36)
  expect(attrs(options)["stroke-width"]).toBe(0)
  expect(attrs(options, { name: "tabler:star", size: "sm" }).width).toBe("2em")
  expect(attrs(options, { name: "tabler:star", size: "md" }).width).toBe(0)
  expect(attrs(options, { name: "tabler:star", size: "xs" }).width).toBe(12)
  expect(attrs(options, { name: "constructor:star" }).width).toBe(36)
  expect(
    attrs({ strokeWidth: {}, absoluteStrokeWidth: {} })["stroke-width"]
  ).toBe(1.5)
  const custom = renderIcon(
    { status: "loaded", data },
    { name: "tabler:star", size: "constructor" },
    {}
  )
  expect(custom.attributes.width).toBe("constructor")
})

test("API maps preserve every leaf form and distinguish options from set names", () => {
  const loader = () => data
  const leaves = [
    false,
    "https://icons.test",
    loader,
    {},
    { type: "fetch", baseUrl: "/icons" },
    { url: () => "/star.json" },
    { requestInit: { credentials: "include" } },
    { type: "symbol", baseUrl: "/icons" },
  ] as const
  for (const leaf of leaves) {
    expect(resolveIconApi(leaf, "tabler:star")).toBe(leaf)
    expect(
      resolveIconApi({ tabler: leaf, default: false }, "tabler:star")
    ).toBe(leaf)
    expect(
      resolveIconApi({ tabler: leaf, default: false }, "lucide:star")
    ).toBe(false)
  }
  expect(resolveIconApi({ default: false }, "constructor:star")).toBe(false)
  expect(resolveIconApi({ tabler: loader }, "@provider:tabler:star")).toBe(
    loader
  )
  expect(resolveIconApi({ default: loader }, "Local")).toBe(loader)
})

test("API maps route fetch, symbol, disabled sets and custom loaders with local data first", async () => {
  const urls: string[] = []
  const names: string[] = []
  const api = {
    tabler: {
      type: "fetch",
      baseUrl: "https://icons.test",
      fetch: (async (url: string | URL | Request) => {
        urls.push(String(url))
        return Response.json(data)
      }) as typeof fetch,
    },
    flag: { type: "symbol", baseUrl: "/symbols" },
    lucide: async (name: string) => {
      names.push(name)
      return data
    },
    default: false,
  } satisfies IconApiConfig
  const store = createIconStore({
    api,
    sources: { "flag:local": data },
    concurrency: 1,
  })
  expect(store.getState("flag:us").href).toBe("/symbols/flag/us.svg#icon")
  expect(store.getState("flag:local").data).toEqual(data)
  await Promise.all([
    store.preload(["tabler:star", "lucide:star", "other:star", "flag:us"]),
    store.load("tabler:star"),
  ])
  expect(urls).toEqual(["https://icons.test/tabler.json?icons=star"])
  expect(names).toEqual(["lucide:star"])
  expect(store.getState("other:star").status).toBe("missing")
  expect(store.snapshot()).toEqual({
    "flag:local": data,
    "tabler:star": data,
    "lucide:star": data,
  })
  expect(await store.load("flag:us", { loader: () => data })).toEqual(data)
  const lazy = createIconStore({ api, sources: [async () => null] })
  await lazy.load("flag:us")
  expect(lazy.getState("flag:us").status).toBe("referenced")
  expect(urls).toHaveLength(1)
})

test("child API maps inherit set entries and default, shared API values reset the map", async () => {
  const parent = createIconStore({
    api: { tabler: { type: "symbol", baseUrl: "/first" }, default: () => data },
  })
  const child = createIconStore({ parent, api: { flag: false } })
  expect(child.getState("tabler:star").href).toBe("/first/tabler/star.svg#icon")
  expect(await child.load("flag:us")).toBeNull()
  expect(await child.load("lucide:star")).toEqual(data)
  expect(resolveIconApi(child.api, "flag:us")).toBe(false)
  const grandchild = createIconStore({ parent: child, api: { default: false } })
  expect(grandchild.getState("tabler:star").href).toBe(
    "/first/tabler/star.svg#icon"
  )
  expect(await grandchild.load("lucide:star")).toBeNull()
  const reset = createIconStore({ parent: child, api: false })
  expect(await reset.load("tabler:star")).toBeNull()
  expect(mergeIconApi(parent.api, { type: "symbol", baseUrl: "/all" })).toEqual(
    { type: "symbol", baseUrl: "/all" }
  )
  expect(
    resolveIconApi(mergeIconApi(false, { tabler: () => data }), "lucide:star")
  ).toBe(false)
  expect(
    resolveIconApi(mergeIconApi(false, { tabler: undefined }), "tabler:star")
  ).toBe(false)
  const inheritedApi = {
    tabler: { baseUrl: "/first", requestInit: { credentials: "include" } },
  } as const
  const replacedApi = { tabler: { baseUrl: "/second" } }
  expect(
    resolveIconApi(mergeIconApi(inheritedApi, replacedApi), "tabler:star")
  ).toEqual(replacedApi.tabler)
  expect(mergeIconApi(inheritedApi, {})).toEqual({}) // The legacy empty fetch options remain a shared API value.
})

test("controllers switch set API with alternatives, while inline data bypasses loading", async () => {
  const calls: string[] = []
  const scope = createIconScope({
    api: {
      tabler: async (name) => {
        calls.push(name)
        return data
      },
      lucide: { type: "symbol", baseUrl: "/icons" },
      default: false,
    },
  })
  const controller = createIconController(
    { name: "tabler:star", altName: "lucide:star" },
    scope
  )
  await controller.load()
  expect(calls).toEqual(["tabler:star"])
  controller.update({
    name: "tabler:star",
    altName: "lucide:star",
    showAlt: true,
  })
  expect((await controller.load()).href).toBe("/icons/lucide/star.svg#icon")
  controller.update({ data, altData: data, showAlt: true })
  expect((await controller.load()).data).toEqual(data)
  expect(calls).toHaveLength(1)
  controller.destroy()
})

test("per-set API loaders retain retry and abort semantics", async () => {
  let attempts = 0
  let signal: AbortSignal | undefined
  const store = createIconStore({
    api: {
      tabler: (_name, _parsed, request) => {
        attempts++
        signal = request?.signal
        if (attempts === 1) throw new Error("retry me")
        if (attempts === 2) return data
        return new Promise(() => {})
      },
      default: false,
    },
  })
  await expect(store.load("tabler:star")).rejects.toThrow("retry me")
  expect(await store.retry("tabler:star")).toEqual(data)
  const pending = store.load("tabler:heart")
  const cancelled = pending.catch((error: unknown) => error)
  await new Promise((resolve) => setTimeout(resolve, 0))
  store.invalidate("tabler:heart")
  expect(await cancelled).toBeInstanceOf(Error)
  expect(signal?.aborted).toBe(true)
})
