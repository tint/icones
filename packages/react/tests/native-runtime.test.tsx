import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { Icon, IconConfig } from "@icones/react"
import {
  createIconApiLoader,
  createIconStore,
  createIconScope,
  createIconController,
  defaultIconLoader,
  parseIconName,
  type IconData,
  type IconLoader,
} from "@icones/core"

const icon: IconData = { body: '<path d="M2 12h20"/>', width: 24, height: 24 }

test("unconfigured scopes use the first-party service while api false remains offline", async () => {
  const original = globalThis.fetch
  const requests: string[] = []
  globalThis.fetch = (async (input) => {
    requests.push(String(input))
    return Response.json(icon)
  }) as typeof fetch
  try {
    const parsed = parseIconName("demo:star")
    expect(await defaultIconLoader("demo:star", parsed)).toEqual(icon)
    expect(await createIconApiLoader()("demo:star", parsed)).toBeNull()
    const controller = createIconController(
      { name: "demo:star" },
      createIconScope()
    )
    try {
      expect((await controller.load()).status).toBe("loaded")
    } finally {
      controller.destroy()
    }
    const offline = createIconStore({ api: false })
    expect(await offline.load("demo:offline")).toBeNull()
    const markup = renderToString(
      <Icon name="demo:unconfigured" fallback={<span>missing</span>} />
    )
    expect(markup).toBe("<span>missing</span>")
    expect(requests).toEqual([
      "https://demo.icones.go-slim.dev/data/star.json",
      "https://demo.icones.go-slim.dev/data/star.json",
    ])
  } finally {
    globalThis.fetch = original
  }
})

test("applications inject a resolver once and hydrate from its native data snapshot", async () => {
  const requests: string[] = []
  const loader: IconLoader = (name, parsed, request) => {
    expect(parsed).toEqual({ provider: "", prefix: "app", name: "check" })
    expect(request?.signal).toBeInstanceOf(AbortSignal)
    requests.push(name)
    return icon
  }
  const server = createIconStore({ api: loader })
  await Promise.all([
    server.preload(["app:check"]),
    server.preload(["app:check"]),
  ])
  const client = createIconStore({
    initialData: JSON.parse(JSON.stringify(server.snapshot())),
  })
  await client.preload(["app:check"])
  const markup = (store: typeof server) =>
    renderToString(
      <IconConfig store={store}>
        <Icon name="app:check" rotate={1} />
      </IconConfig>
    )
  expect(markup(client)).toBe(markup(server))
  expect(requests).toEqual(["app:check"])
})
