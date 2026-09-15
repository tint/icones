import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { createIconStore, Icon, IconConfig } from "@icones/react"

test("symbol API emits SSR references immediately, with no fetch or data snapshot", async () => {
  const original = globalThis.fetch
  let fetches = 0
  globalThis.fetch = (() => {
    fetches++
    throw new Error("Must not fetch")
  }) as unknown as typeof fetch
  try {
    const store = createIconStore({
      api: { type: "symbol", baseUrl: "/icons" },
    })
    const state = store.getState("tabler:star")
    expect(state).toBe(store.getState("tabler:star"))
    expect(state.status).toBe("referenced")
    expect(state.href).toBe("/icons/tabler/star.svg#icon")
    expect(await store.load("tabler:star")).toBeNull()
    await store.preload(["tabler:star", "tabler:heart"])
    expect(store.snapshot()).toEqual({})
    const render = () =>
      renderToString(
        <IconConfig store={store}>
          <Icon
            name="tabler:star"
            size={48}
            color="#ff0000"
            strokeWidth={2}
            absoluteStrokeWidth
          />
        </IconConfig>
      )
    const html = render()
    expect(html).toContain('<use href="/icons/tabler/star.svg#icon"')
    expect(html).toContain('data-state="referenced"')
    expect(html).toContain('color="#ff0000"')
    expect(html).toContain("--icones-stroke-width:1")
    expect(html).toBe(render())
    expect(fetches).toBe(0)
  } finally {
    globalThis.fetch = original
  }
})

test("nested scopes inherit symbol APIs; fetch overrides remain independent", async () => {
  const parent = createIconStore({
    api: { type: "symbol", baseUrl: "/symbols" },
  })
  const nested = createIconStore({
    parent,
    sources: { Local: { body: "<circle/>" } },
  })
  expect(nested.getState("tabler:star").href).toBe(
    "/symbols/tabler/star.svg#icon"
  )
  let calls = 0
  const fetched = createIconStore({
    parent,
    api: () => {
      calls++
      return { body: "<path/>" }
    },
  })
  await fetched.load("tabler:star")
  expect(calls).toBe(1)
  expect(fetched.getState("tabler:star").status).toBe("loaded")
  expect(parent.getState("tabler:star").status).toBe("referenced")
})

test("custom symbol URLs support bare names and safely escaped query strings", () => {
  const store = createIconStore({
    api: {
      type: "symbol",
      url: (name) => `/art/${encodeURIComponent(name)}.svg?a=1&b=2#single`,
      viewBox: "0,0,32,16",
    },
  })
  const html = renderToString(
    <IconConfig store={store}>
      <Icon name="MyLogo" rotate={1} hFlip />
    </IconConfig>
  )
  expect(html).toContain("/art/MyLogo.svg?a=1&amp;b=2#single")
  expect(html).toContain("transform=")
  expect(() =>
    createIconStore({
      api: { type: "symbol", url: () => "javascript:alert(1)#icon" },
    }).getState("x:one")
  ).toThrow("Symbol URL")
  expect(() =>
    createIconStore({
      api: { type: "symbol", url: () => "/missing-fragment.svg" },
    }).getState("x:one")
  ).toThrow("fragment")
})
