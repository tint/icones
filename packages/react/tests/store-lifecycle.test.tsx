import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { Icon, IconConfig, IconProvider, createIconStore } from "@icones/react"

const line = { body: "<path/>" }

const circle = { body: "<circle/>" }

test("nested empty providers preserve preloaded configuration", async () => {
  const store = createIconStore({ api: () => line })
  await store.preload(["x:one"])
  expect(
    renderToString(
      <IconConfig store={store}>
        <IconProvider>
          <Icon name="x:one" />
        </IconProvider>
      </IconConfig>
    )
  ).toContain("<path")
})

test("snapshot reads and SSR do not execute lazy or resolver sources", async () => {
  let calls = 0
  const store = createIconStore({
    sources: async () => {
      calls++
      return line
    },
    api: false,
  })
  expect(store.getState("Icon")).toBe(store.getState("Icon"))
  expect(
    renderToString(
      <IconConfig store={store}>
        <Icon name="Icon" />
      </IconConfig>
    )
  ).toContain('data-state="idle"')
  expect(calls).toBe(0)
  await store.preload(["Icon"])
  expect(calls).toBe(1)
  expect(store.getState("Icon").data).toEqual(line)
})

test("nested sources preserve parent SSR data and subscriptions", async () => {
  let calls = 0
  const parent = createIconStore({
    api: () => {
      calls++
      return line
    },
  })
  await parent.preload(["x:remote"])
  const child = createIconStore({ parent, sources: { Local: circle } })
  expect(child.getState("x:remote")).toBe(parent.getState("x:remote"))
  expect(child.snapshot()).toEqual({ "x:remote": line })
  const html = renderToString(
    <IconConfig store={parent}>
      <IconConfig sources={{ Local: circle }}>
        <Icon name="x:remote" />
        <Icon name="Local" />
      </IconConfig>
    </IconConfig>
  )
  expect(html).toContain("<path")
  expect(html).toContain("<circle")
  let updates = 0
  const unsubscribe = child.subscribe("x:remote", () => updates++)
  await child.load("x:remote")
  parent.invalidate("x:remote")
  expect(updates).toBeGreaterThan(0)
  await child.load("x:remote")
  expect(calls).toBe(2)
  unsubscribe()
})
