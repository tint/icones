import { afterEach, expect, test } from "bun:test"
import { createIconStore, clearIconData, type IconSet } from "@icones/core"

const outline = {
  body: '<path d="M2 12h20" fill="none" stroke="currentColor"/>',
  width: 24,
  height: 24,
}

const solid = {
  body: '<path d="M2 10h20v4H2z" fill="currentColor"/>',
  width: 24,
  height: 24,
}

const tabler: IconSet = {
  prefix: "tabler",
  width: 24,
  height: 24,
  icons: { heart: outline, "heart-filled": solid, refresh: outline },
}

afterEach(() => clearIconData())

test("default API requests one exact slug and caches no unrequested styles from a set response", async () => {
  const requested: string[] = []
  const store = createIconStore({
    api: {
      baseUrl: "https://icons.example.test",
      fetch: async (input) => {
        requested.push(String(input))
        return Response.json(tabler)
      },
    },
  })
  await store.preload(["tabler:heart"])
  expect(requested).toEqual([
    "https://icons.example.test/tabler.json?icons=heart",
  ])
  expect(store.snapshot()).toEqual({ "tabler:heart": outline })
  await store.preload(["tabler:heart-filled"])
  expect(requested).toEqual([
    "https://icons.example.test/tabler.json?icons=heart",
    "https://icons.example.test/tabler.json?icons=heart-filled",
  ])
  expect(store.getState("tabler:heart-filled").data).toEqual(solid)
})

test("custom APIs and sets use their own names without global style rules", async () => {
  const requested: string[] = []
  const store = createIconStore({
    api: {
      url: (name) => `https://icons.example.test/${name}.json`,
      fetch: async (input) => {
        requested.push(String(input))
        return Response.json(solid)
      },
    },
  })
  await store.preload(["custom:search-fill"])
  expect(requested).toEqual([
    "https://icons.example.test/custom:search-fill.json",
  ])
  expect(store.getState("custom:search-fill").data).toEqual(solid)
  const custom: IconSet = {
    prefix: "custom",
    icons: { "search-line": outline, "search-fill": solid },
  }
  const local = createIconStore({ sources: { custom }, api: false })
  expect(local.getState("custom:search-line").data).toEqual(outline)
  expect(local.getState("custom:search-fill").data).toEqual(solid)
})
