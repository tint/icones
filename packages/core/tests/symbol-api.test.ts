import { expect, test } from "bun:test"
import { createIconStore } from "@icones/core"

test("sources stay first; lazy sources resolve before falling back to a symbol", async () => {
  const line = { body: "<path/>" }
  const store = createIconStore({
    api: { type: "symbol" },
    sources: {
      Search01: line,
      "tabler:local": async () => line,
      "tabler:remote": async () => null,
    },
  })
  expect(store.getState("Search01").data).toBe(line)
  expect(store.getState("tabler:local").status).toBe("idle")
  expect(await store.load("tabler:local")).toBe(line)
  await store.load("tabler:remote")
  expect(store.getState("tabler:remote").href).toBe(
    "/icons/tabler/remote.svg#icon"
  )
  expect(store.snapshot()).toEqual({ Search01: line, "tabler:local": line })
  expect(await store.load("UnknownBareName")).toBeNull()
  expect(store.getState("UnknownBareName").status).toBe("missing")
})

test("invalid symbol fallback after an async source publishes an error and releases the request", async () => {
  const store = createIconStore({
    sources: async () => null,
    api: { type: "symbol", url: () => "/without-fragment.svg" },
  })
  await expect(store.load("tabler:star")).rejects.toThrow("fragment")
  expect(store.getState("tabler:star").status).toBe("error")
  await expect(store.retry("tabler:star")).rejects.toThrow("fragment")
})
