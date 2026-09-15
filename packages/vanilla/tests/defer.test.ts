import { afterEach, expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { createIconConfig, defineIconElement } from "../src"

const data = [["path", { d: "M2 12h20" }]] as const
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0).toReversed()) cleanup()
})
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
class IntersectionMock {
  targets = new Set<Element>()
  observations = 0
  disconnected = false
  constructor(readonly callback: IntersectionObserverCallback) {}
  observe(host: Element) {
    this.targets.add(host)
    this.observations++
  }
  unobserve(host: Element) {
    this.targets.delete(host)
  }
  disconnect() {
    this.disconnected = true
    this.targets.clear()
  }
  emit(target: Element, isIntersecting = true) {
    this.callback(
      [{ target, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    )
  }
}
async function setup(
  html: string,
  options: { readyState?: DocumentReadyState; intersection?: boolean } = {}
) {
  const dom = new JSDOM(html)
  const document = dom.window.document
  cleanups.push(() => {
    document.body.replaceChildren()
    dom.window.close()
  })
  await tick()
  let readyState = options.readyState ?? "complete"
  Object.defineProperty(document, "readyState", { get: () => readyState })
  const intersections: IntersectionMock[] = []
  Object.defineProperty(dom.window, "IntersectionObserver", {
    value:
      options.intersection === false
        ? undefined
        : class extends IntersectionMock {
            constructor(callback: IntersectionObserverCallback) {
              super(callback)
              intersections.push(this)
            }
          },
  })
  const requests: string[] = []
  const scope = createIconConfig({
    api: (name) => {
      requests.push(name)
      return Promise.resolve(data)
    },
  })
  defineIconElement({ window: dom.window, scope })
  return {
    document,
    scope,
    intersections,
    requests,
    host: document.querySelector("icones-icon")!,
    ready() {
      readyState = "interactive"
      document.dispatchEvent(new dom.window.Event("DOMContentLoaded"))
    },
  }
}

test("intersect defers SVG creation and network requests; load does not force activation", async () => {
  const { host, intersections, requests } = await setup(
    '<icones-icon name="app:star" defer="intersect"></icones-icon>'
  )
  const observer = intersections[0]!
  await host.load()
  expect(host.querySelector("svg")).toBeNull()
  expect(requests).toEqual([])
  expect(observer.targets.has(host)).toBe(true)
  observer.emit(host, false)
  await tick()
  expect(requests).toEqual([])
  observer.emit(host)
  await host.load()
  expect(requests).toEqual(["app:star"])
  expect(host.querySelector("path")).not.toBeNull()
  expect(observer.targets.has(host)).toBe(false)
  expect(observer.disconnected).toBe(true)
  const svg = host.querySelector("svg")
  observer.emit(host)
  expect(host.querySelector("svg")).toBe(svg)
  expect(host.shadowRoot).toBeNull()
})

test("pending attributes are read at activation without duplicate observations", async () => {
  const { host, requests, intersections } = await setup(
    '<icones-icon name="app:star" defer="intersect"></icones-icon>'
  )
  host.setAttribute("name", "app:moon")
  host.setAttribute("alt-name", "app:heart")
  host.setAttribute("show-alt", "true")
  host.setAttribute("size", "64")
  host.setAttribute("color", "#abcdef")
  expect(requests).toEqual([])
  expect(intersections[0]!.observations).toBe(1)
  intersections[0]!.emit(host)
  await host.load()
  expect(requests).toEqual(["app:heart"])
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("64")
  expect(host.querySelector("svg")!.getAttribute("color")).toBe("#abcdef")
  host.setAttribute("defer", "domready")
  expect(host.querySelectorAll("svg")).toHaveLength(1)
})

test("domready waits for DOMContentLoaded and cleans up its pending work", async () => {
  const { host, requests, ready } = await setup(
    '<icones-icon name="app:star" defer="domready"></icones-icon>',
    { readyState: "loading" }
  )
  await host.load()
  expect(requests).toEqual([])
  expect(host.querySelector("svg")).toBeNull()
  host.setAttribute("size", "48")
  ready()
  await host.load()
  expect(requests).toEqual(["app:star"])
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("48")
  ready()
  expect(host.querySelectorAll("svg")).toHaveLength(1)
})

for (const readyState of ["interactive", "complete"] as const)
  test(
    "domready renders immediately when the document is " + readyState,
    async () => {
      const { host, requests } = await setup(
        '<icones-icon name="app:star" defer="domready"></icones-icon>',
        { readyState }
      )
      await host.load()
      expect(host.querySelector("path")).not.toBeNull()
      expect(requests).toEqual(["app:star"])
    }
  )

test("changing pending defer modes cancels previous observers/listeners; removing defer activates", async () => {
  const { host, intersections, requests, ready } = await setup(
    '<icones-icon name="app:star" defer="intersect"></icones-icon>',
    { readyState: "loading" }
  )
  const old = intersections[0]!
  host.setAttribute("defer", "domready")
  expect(old.targets.has(host)).toBe(false)
  old.emit(host)
  expect(host.querySelector("svg")).toBeNull()
  host.setAttribute("defer", "intersect")
  ready()
  expect(host.querySelector("svg")).toBeNull()
  host.removeAttribute("defer")
  await host.load()
  expect(requests).toEqual(["app:star"])
  expect(intersections[1]!.disconnected).toBe(true)
})

test("shared intersection observers release individual elements and ignore stale disconnected callbacks", async () => {
  const { document, host, intersections, requests } = await setup(
    '<icones-icon name="app:star" defer="intersect"></icones-icon><icones-icon name="app:heart" defer="intersect"></icones-icon>'
  )
  const other = document.querySelectorAll("icones-icon")[1]!
  const old = intersections[0]!
  expect(intersections).toHaveLength(1)
  expect(old.targets.size).toBe(2)
  host.remove()
  old.emit(host)
  expect(old.targets.size).toBe(1)
  expect(requests).toEqual([])
  old.emit(other)
  await other.load()
  expect(requests).toEqual(["app:heart"])
  expect(old.disconnected).toBe(true)
  document.body.append(host)
  old.emit(host)
  expect(host.querySelector("svg")).toBeNull()
  intersections[1]!.emit(host)
  await host.load()
  expect(requests).toEqual(["app:heart", "app:star"])
})

test("removing a name cancels pending intersection work and prevents legacy fallbacks", async () => {
  const { host, intersections, requests } = await setup(
    '<icones-icon name="app:star" icon="app:heart" defer="intersect"></icones-icon>'
  )
  const old = intersections[0]!
  host.removeAttribute("name")
  old.emit(host)
  await host.load()
  expect(requests).toEqual([])
  expect(old.disconnected).toBe(true)
  host.setAttribute("name", "app:heart")
  expect(host.querySelector("svg")).toBeNull()
  intersections[1]!.emit(host)
  await host.load()
  expect(requests).toEqual(["app:heart"])
})

test("disconnecting a domready element cancels its listener, reconnecting waits again", async () => {
  const { document, host, ready, requests } = await setup(
    '<icones-icon name="app:star" defer="domready"></icones-icon>',
    { readyState: "loading" }
  )
  host.remove()
  ready()
  await host.load()
  expect(requests).toEqual([])
  document.body.append(host)
  await host.load()
  expect(requests).toEqual(["app:star"])
})

test("an activated element does not defer again after reconnecting", async () => {
  const { document, host, intersections, requests } = await setup(
    '<icones-icon name="app:star" defer="intersect"></icones-icon>'
  )
  intersections[0]!.emit(host)
  await host.load()
  host.remove()
  document.body.append(host)
  await host.load()
  expect(host.querySelector("path")).not.toBeNull()
  expect(intersections).toHaveLength(1)
  expect(requests).toHaveLength(1)
})

test("without IntersectionObserver intersect falls back to immediate rendering", async () => {
  const { host, requests } = await setup(
    '<icones-icon name="app:star" defer="intersect"></icones-icon>',
    { intersection: false }
  )
  await host.load()
  expect(host.querySelector("path")).not.toBeNull()
  expect(requests).toEqual(["app:star"])
})

for (const attributes of [
  'defer=""',
  'defer="unknown"',
  'data-defer="intersect"',
  'icon-defer="intersect"',
])
  test(attributes + " never creates a pending element", async () => {
    const { host, requests, intersections } = await setup(
      '<icones-icon name="app:star" ' + attributes + "></icones-icon>"
    )
    await host.load()
    expect(requests).toEqual(["app:star"])
    expect(intersections).toHaveLength(0)
  })
