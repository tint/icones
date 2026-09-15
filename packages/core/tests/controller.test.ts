import { describe, expect, test } from "bun:test"
import {
  createIconController,
  createIconScope,
  createIconScopeResolver,
  addIconSet,
  clearIconData,
  renderIcon,
  type IconData,
  type IconLoaderResult,
} from "@icones/core"
const circle: IconData = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}
const line: IconData = { body: '<path d="M0 12h24"/>', width: 24, height: 24 }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("shared icon controller", () => {
  test("default SSR scopes support registered names without rewriting explicit sources", () => {
    addIconSet({ prefix: "adapter-demo", icons: { item: circle } })
    const implicit = createIconController({ name: "adapter-demo-item" })
    const explicit = createIconController(
      { name: "adapter-demo-item" },
      createIconScope({ sources: { "adapter-demo-item": line }, api: false })
    )
    try {
      expect(implicit.getState().data).toEqual(circle)
      expect(explicit.getState().data).toBe(line)
    } finally {
      implicit.destroy()
      explicit.destroy()
      clearIconData("adapter-demo")
    }
  })
  test("SSR reads are pure and scopes isolate their stores", async () => {
    let calls = 0
    const options = {
      api: async () => {
        calls++
        return circle
      },
    }
    const first = createIconScope(options)
    const second = createIconScope(options)
    const icon = createIconController({ name: "async" }, first)
    expect(icon.getState().status).toBe("idle")
    expect(calls).toBe(0)
    await icon.load()
    expect(calls).toBe(1)
    expect(second.store.getState("async").status).toBe("idle")
    icon.destroy()
  })

  test("presentation updates reuse the store and nested scopes inherit", () => {
    const resolve = createIconScopeResolver()
    const sources = { local: circle }
    const first = resolve({ sources, defaultSize: "sm" })
    const second = resolve({ sources, defaultSize: "xl" })
    expect(second.store).toBe(first.store)
    const child = createIconScope({ strokeWidth: 2 }, second)
    expect(child.store).toBe(second.store)
    expect(child.appearance.defaultSize).toBe("xl")
    expect(child.store.getState("local").data).toBe(circle)
  })

  test("subscribers share requests and invalidation reloads", async () => {
    let calls = 0
    const scope = createIconScope({
      api: async () => {
        calls++
        return circle
      },
    })
    const one = createIconController({ name: "shared" }, scope)
    const two = createIconController({ name: "shared" }, scope)
    const off = one.subscribe(() => {})
    two.subscribe(() => {})
    await flush()
    expect(calls).toBe(1)
    scope.store.invalidate("shared")
    await flush()
    expect(calls).toBe(2)
    off()
    one.destroy()
    two.destroy()
    scope.store.invalidate("shared")
    await flush()
    expect(calls).toBe(2)
  })

  test("name changes ignore late results and keep shared consumers alive", async () => {
    let finish!: (data: IconLoaderResult) => void
    const scope = createIconScope({
      api: (name) =>
        name === "slow"
          ? new Promise((resolve) => {
              finish = resolve
            })
          : line,
    })
    const icon = createIconController({ name: "slow" }, scope)
    icon.subscribe(() => {})
    await flush()
    icon.update({ name: "fast" })
    await flush()
    finish(circle)
    await flush()
    expect(icon.getState().data).toBe(line)
    icon.destroy()
  })

  test("owned loaders are cancelled on replacement and destruction", async () => {
    const signals: AbortSignal[] = []
    const loader = (
      _: string,
      __: unknown,
      request?: { signal: AbortSignal }
    ) => {
      signals.push(request!.signal)
      return new Promise<null>(() => {})
    }
    const icon = createIconController(
      { name: "remote", loader },
      createIconScope({ api: false })
    )
    icon.subscribe(() => {})
    await flush()
    icon.update({ name: "remote", loader: (...args) => loader(...args) })
    await flush()
    expect(signals[0].aborted).toBe(true)
    icon.destroy()
    expect(signals[1].aborted).toBe(true)
  })

  test("registered sets, aliases, tuples and alternatives render immediately", () => {
    const set = {
      prefix: "demo",
      icons: { base: circle },
      aliases: { flipped: { parent: "base", hFlip: true } },
    }
    const scope = createIconScope({ sources: { demo: set }, api: false })
    const icon = createIconController({ name: "demo:flipped" }, scope)
    expect(icon.getState().status).toBe("loaded")
    expect(
      renderIcon(icon.getState(), { name: "demo:flipped" }).body
    ).toContain("transform")
    icon.update({
      data: [["path", { d: "M0 0h24" }]],
      altIcon: line,
      showAlt: true,
    })
    expect(icon.getState().data).toBe(line)
    icon.destroy()
  })

  test("renderer normalizes strokes, transforms, aria and unique SVG ids", () => {
    const data = {
      body: '<defs><linearGradient id="paint"/></defs><path fill="url(#paint)"/>',
      width: 48,
      height: 48,
    }
    const props = {
      data,
      size: 24,
      strokeWidth: 2,
      absoluteStrokeWidth: true,
      "aria-label": "logo",
      rotate: 1,
    }
    const result = renderIcon({ status: "loaded", data }, props, undefined, "a")
    expect(result.attributes["stroke-width"]).toBe(4)
    expect(result.attributes["aria-hidden"]).toBeUndefined()
    expect(result.body).toContain('id="icon-a-paint"')
    expect(result.body).toContain("transform")
    expect(
      renderIcon({ status: "loaded", data }, props, undefined, "b").body
    ).not.toBe(result.body)
  })
})
