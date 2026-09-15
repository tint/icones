import { expect, test } from "bun:test"
import {
  createIconesIconLoader,
  createStaticIconLoader,
  createIconStore,
  parseIconName,
  type IconData,
} from "@icones/core"

const icon: IconData = { body: '<path d="M2 12h20"/>', width: 24, height: 24 }

test("static loader opts into exact mirrored JSON paths and forwards cancellation", async () => {
  const requests: string[] = []
  const signal = new AbortController().signal
  const load = createStaticIconLoader({
    baseUrl: "https://assets.example.test/icons/",
    requestInit: { headers: { Accept: "application/json" } },
    fetch: async (url, init) => {
      requests.push(String(url))
      expect(init?.signal).toBe(signal)
      expect(init?.headers).toEqual({ Accept: "application/json" })
      return requests.length === 1
        ? Response.json(icon)
        : new Response(null, { status: 404 })
    },
  })
  expect(await load("demo:star", null, { signal })).toEqual(icon)
  expect(await load("demo:absent", null, { signal })).toBeNull()
  for (const name of [
    "Logo",
    "demo-star",
    "@external:demo:star",
    "../:escape",
    "demo:../escape",
  ])
    expect(await load(name, null, { signal })).toBeNull()
  expect(requests).toEqual([
    "https://assets.example.test/icons/demo/data/star.json",
    "https://assets.example.test/icons/demo/data/absent.json",
  ])
})

test("explicit fetch and response adapters do not assume a public service", async () => {
  const requests: string[] = []
  const store = createIconStore({
    api: {
      fetch: async (url) => {
        requests.push(String(url))
        return Response.json({ artwork: icon })
      },
      transform: async (value) => (value as { artwork: IconData }).artwork,
    },
  })
  expect(await store.load("demo:star")).toEqual(icon)
  expect(requests).toEqual(["/icons/demo.json?icons=star"])
})

test("first-party loader maps each set to its static collection domain", async () => {
  const requests: { url: string; init?: RequestInit }[] = []
  const signal = new AbortController().signal
  const load = createIconesIconLoader({
    requestInit: { headers: { Accept: "application/json" } },
    fetch: async (input, init) => {
      requests.push({ url: String(input), init })
      return String(input).includes("/absent.json")
        ? new Response(null, { status: 404 })
        : Response.json(icon)
    },
  })
  expect(await load("tabler:star", null, { signal })).toEqual(icon)
  expect(await load("bootstrap:building-fill-add", null, { signal })).toEqual(
    icon
  )
  expect(await load("antd:absent", null, { signal })).toBeNull()
  expect(
    await Promise.all(
      [
        "tabler-star",
        "@provider:tabler:star",
        "../:escape",
        "tabler:../escape",
      ].map((name) => load(name, null, { signal }))
    )
  ).toEqual([null, null, null, null])
  expect(requests.map(({ url }) => url)).toEqual([
    "https://tabler.icones.go-slim.dev/data/star.json",
    "https://bootstrap.icones.go-slim.dev/data/building-fill-add.json",
    "https://antd.icones.go-slim.dev/data/absent.json",
  ])
  expect(requests.every(({ init }) => init?.signal === signal)).toBe(true)
  expect(requests.every(({ init }) => init?.headers)).toBe(true)
  expect(() => createIconesIconLoader({ domain: "https://bad.test" })).toThrow(
    "Invalid icon service domain"
  )
})

test("native names retain namespaces and legacy spellings without importing a provider parser", () => {
  for (const [name, expected] of [
    ["demo:star", ["", "demo", "star"]],
    ["demo-star-filled", ["", "demo", "star-filled"]],
    ["@private:demo:star", ["private", "demo", "star"]],
    ["private:demo:star", ["private", "demo", "star"]],
  ] as const) {
    const [provider, prefix, slug] = expected
    expect(parseIconName(name)).toEqual({ provider, prefix, name: slug })
  }
  for (const name of ["", "Logo", "demo:", ":star", "@", "a:b:c:d"])
    expect(parseIconName(name)).toBeNull()
})
