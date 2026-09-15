import { expect, test } from "bun:test"
import {
  createIconApiLoader,
  createIconStore,
  type IconSet,
} from "@icones/core"

const line = {
  body: '<path d="M1 12h22" stroke="currentColor"/>',
  width: 24,
  height: 24,
}

const circle = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}

const set: IconSet = {
  prefix: "tabler",
  icons: { refresh: line },
  aliases: { reload: { parent: "refresh", hFlip: true } },
}

test("sources support a set, a resolver and lazy single-file data", async () => {
  let requests = 0
  const store = createIconStore({
    api: false,
    sources: [
      {
        tabler: set,
        Search01: async () => {
          requests++
          return line
        },
      },
      (name) => (name === "MyIcon" ? circle : undefined),
    ],
  })
  expect(store.getState("tabler:reload").data).toHaveProperty("hFlip", true)
  expect(store.getState("MyIcon").status).toBe("idle")
  expect(await store.load("MyIcon")).toEqual(circle)
  await Promise.all([store.load("Search01"), store.preload(["Search01"])])
  expect(requests).toBe(1)
  expect(store.getState("Search01").data).toBe(line)
})

test("accepts custom URLs, fetch, request options, and response envelopes", async () => {
  const requests: { url: string; headers?: HeadersInit }[] = []
  const store = createIconStore({
    api: {
      url: (name) =>
        `https://icons.example.test/data?name=${encodeURIComponent(name)}`,
      requestInit: { headers: { Authorization: "test-request-only" } },
      fetch: async (input, init) => {
        requests.push({ url: String(input), headers: init?.headers })
        return Response.json({ payload: set })
      },
      transform: (json) => (json as { payload: IconSet }).payload,
    },
  })
  const [first, second] = await Promise.all([
    store.load("tabler:refresh"),
    store.load("tabler:refresh"),
  ])
  expect(first).toEqual(line)
  expect(second).toEqual(line)
  expect(requests).toEqual([
    {
      url: "https://icons.example.test/data?name=tabler%3Arefresh",
      headers: { Authorization: "test-request-only" },
    },
  ])
})

test("supports Iconify-compatible base URLs and never guesses a set from bare names", async () => {
  const requests: string[] = []
  const store = createIconStore({
    api: {
      baseUrl: "https://icons.example.test/api/",
      fetch: async (input) => {
        requests.push(String(input))
        return Response.json(set)
      },
    },
  })
  await store.preload(["Search01", "search-01", "tabler:refresh"])
  expect(requests).toEqual([
    "https://icons.example.test/api/tabler.json?icons=refresh",
  ])
  expect(store.getState("Search01").status).toBe("missing")
  expect(store.getState("search-01").status).toBe("missing")
})

test("handles missing, invalid, rejected and disabled APIs without unhandled requests", async () => {
  const missing = createIconStore({
    api: {
      url: () => "/missing",
      fetch: async () => new Response(null, { status: 404 }),
    },
  })
  expect(await missing.load("tabler:unknown")).toBeNull()
  expect(missing.getState("tabler:unknown").status).toBe("missing")
  const invalid = createIconStore({
    api: {
      url: () => "/invalid",
      fetch: async () => Response.json({ nope: true }),
    },
  })
  await expect(invalid.load("tabler:refresh")).rejects.toThrow("invalid")
  expect(invalid.getState("tabler:refresh").status).toBe("error")
  const rejected = createIconStore({
    sources: {
      Search01: async () => {
        throw new Error("Source unavailable")
      },
    },
  })
  await expect(rejected.load("Search01")).rejects.toThrow("Source unavailable")
  expect(rejected.getState("Search01").status).toBe("error")
  expect(
    await createIconStore({ api: false }).load("tabler:refresh")
  ).toBeNull()
  const loader = createIconApiLoader(async () => circle)
  expect(await loader("anything", null)).toBe(circle)
})
