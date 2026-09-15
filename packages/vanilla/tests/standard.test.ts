import { afterEach, expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import {
  createIcon,
  createIconConfig,
  defineIconElement,
  bindIcons,
} from "../src"

const data = [
  [
    "path",
    { d: "M2 12h20", fill: "none", stroke: "currentColor", strokeWidth: "2" },
  ],
] as const
const alternate = [["circle", { cx: "12", cy: "12", r: "10" }]] as const
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0).toReversed()) cleanup()
})
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(
  html = '<i icon-name="app:star"></i>',
  observe = true,
  prefix = "icon-"
) {
  const dom = new JSDOM(html)
  const document = dom.window.document
  cleanups.push(() => dom.window.close())
  const scope = createIconConfig({
    api: false,
    defaultSize: "lg",
    sources: { "app:star": data, "app:heart": alternate },
  })
  const icons = bindIcons({
    root: document,
    scope,
    observe,
    attrPrefix: prefix,
  })!
  cleanups.push(() => icons.destroy())
  return {
    dom,
    document,
    scope,
    icons,
    host: document.querySelector<HTMLElement>("i[" + prefix + "name]")!,
  }
}

test("standard attributes match imperative SVG props without changing native host attributes", () => {
  const { host, document, scope } = setup(
    '<i icon-name="app:star" icon-size="64" icon-color="#123456" icon-fill="red" icon-stroke-width="2.5" icon-rotate="3" icon-h-flip icon-v-flip="false" icon-absolute-stroke-width="true" icon-label="Favorite" icon-class="art" class="host" style="color: blue"></i>'
  )
  const expected = createIcon(
    {
      name: "app:star",
      size: 64,
      color: "#123456",
      fill: "red",
      strokeWidth: 2.5,
      rotate: 3,
      hFlip: true,
      vFlip: false,
      absoluteStrokeWidth: true,
      "aria-label": "Favorite",
      class: "art",
    },
    { scope, document }
  )
  expect(host.querySelector("svg")!.outerHTML).toBe(expected.element.outerHTML)
  expect(host.className).toBe("host")
  expect(host.style.color).toBe("blue")
  expect(host.shadowRoot).toBeNull()
  expect(host.querySelector("svg")!.parentElement).toBe(host)
  expected.destroy()
})

test("custom prefixes control discovery, every SVG prop and mutation updates without default aliases", async () => {
  const { host, document } = setup(
    '<i icon-name="app:heart"></i><span ui-name="app:star"></span><i ui-name="app:star" ui-size="48" ui-color="red" ui-fill="blue" ui-stroke-width="2.5" ui-rotate="1" ui-h-flip ui-v-flip ui-absolute-stroke-width ui-label="Star" ui-role="img" ui-class="art" icon-size="96" icon-color="green"></i>',
    true,
    "ui-"
  )
  expect(document.querySelectorAll("svg")).toHaveLength(1)
  const svg = host.querySelector("svg")!
  expect(svg.getAttribute("width")).toBe("48")
  expect(svg.getAttribute("color")).toBe("red")
  expect(svg.getAttribute("fill")).toBe("blue")
  expect(svg.getAttribute("aria-label")).toBe("Star")
  expect(svg.getAttribute("role")).toBe("img")
  expect(svg.getAttribute("class")).toBe("art")
  host.setAttribute("ui-alt-name", "app:heart")
  host.setAttribute("ui-show-alt", "true")
  host.setAttribute("ui-hidden", "false")
  host.setAttribute("ui-stroke-width", "original")
  await tick()
  expect(svg.querySelector("circle")).not.toBeNull()
  expect(svg.getAttribute("aria-hidden")).toBe("false")
  expect(svg.style.getPropertyValue("--icones-stroke-width")).toBe("initial")
  const circle = svg.querySelector("circle")
  host.setAttribute("icon-color", "purple")
  await tick()
  expect(svg.querySelector("circle")).toBe(circle)
  expect(svg.getAttribute("color")).toBe("red")
  host.removeAttribute("ui-size")
  host.setAttribute("ui-width", "32")
  host.setAttribute("ui-height", "16")
  await tick()
  expect(svg.getAttribute("width")).toBe("32")
  expect(svg.getAttribute("height")).toBe("16")
  host.removeAttribute("ui-name")
  await tick()
  expect(host.querySelector("svg")).toBeNull()
  const added = document.createElement("i")
  document.body.append(added)
  added.setAttribute("ui-name", "app:heart")
  await tick()
  expect(added.querySelector("circle")).not.toBeNull()
})

test("initializers are keyed by root and prefix, with independent destruction and no duplicate ownership", () => {
  const { document, scope, icons } = setup(
    '<i icon-name="app:star"></i><i ui-name="app:heart"></i><i icon-name="app:star" ui-name="app:heart"></i>'
  )
  const custom = bindIcons({
    root: document,
    scope,
    attrPrefix: "ui-",
  })!
  cleanups.push(() => custom.destroy())
  expect(custom).not.toBe(icons)
  expect(bindIcons({ root: document, attrPrefix: "ui-" })).toBe(custom)
  expect(bindIcons({ root: document })).toBe(icons)
  expect(document.querySelectorAll("svg")).toHaveLength(3)
  const both = document.querySelector<HTMLElement>("i[icon-name][ui-name]")!
  expect(both.querySelector("path")).not.toBeNull()
  icons.destroy()
  expect(document.querySelectorAll("svg")).toHaveLength(1)
  custom.refresh()
  expect(both.querySelectorAll("svg")).toHaveLength(1)
  expect(both.querySelector("circle")).not.toBeNull()
  custom.destroy()
  expect(document.querySelector("svg")).toBeNull()
})

test("an explicitly configured data prefix works without enabling implicit legacy aliases", () => {
  const { document, host } = setup(
    '<i data-app-name="app:star"></i><i data-icon="app:heart"></i><i data-icon-name="app:heart"></i>',
    false,
    "data-app-"
  )
  expect(host.querySelector("path")).not.toBeNull()
  expect(document.querySelectorAll("svg")).toHaveLength(1)
})

for (const prefix of [
  "",
  "UI-",
  " ui-",
  "ui",
  "ui--",
  "ui] , span[",
  'ui"-',
  "ui:",
  123,
] as const)
  test("rejects invalid prefix: " + prefix, () => {
    expect(() => bindIcons({ attrPrefix: prefix as string })).toThrow(
      "attrPrefix must"
    )
  })

test("only i[icon-name] opts in; bare icon and data aliases never activate anything", () => {
  const { document, host } = setup(
    '<span icon-name="app:star"></span><my-button icon-name="app:star"></my-button><i icon="app:star"></i><i data-icon="app:star"></i><icones-icon name="app:star"></icones-icon><i icon-name=" " icon="app:star"></i>'
  )
  expect(document.querySelector("svg")).toBeNull()
  expect(
    document.defaultView!.customElements.get("icones-icon")
  ).toBeUndefined()
  host.setAttribute("icon-name", "app:star")
})

test("standard and web modes can coexist without duplicate renders or cross-destruction", () => {
  const { dom, document, scope, icons, host } = setup(
    '<i icon-name="app:star"></i><icones-icon name="app:heart"></icones-icon>'
  )
  defineIconElement({ window: dom.window, scope })
  expect(document.querySelectorAll("svg")).toHaveLength(2)
  expect(bindIcons({ root: document })).toBe(icons)
  icons.refresh()
  expect(host.querySelectorAll("svg")).toHaveLength(1)
  icons.destroy()
  expect(host.querySelector("svg")).toBeNull()
  expect(document.querySelector("icones-icon > svg > circle")).not.toBeNull()
  document.querySelector("icones-icon")!.remove()
})

test("updates props and alternatives, ignores invalid inputs and restores defaults without legacy fallbacks", async () => {
  const { host } = setup(
    '<i icon-name="app:star" icon-alt-name="app:heart" icon-show-alt="false" icon-size="48" data-icon-size="96" data-icon-color="red"></i>'
  )
  const svg = host.querySelector("svg")!
  host.setAttribute("icon-show-alt", "")
  host.setAttribute("icon-label", "Heart")
  host.setAttribute("icon-hidden", "false")
  host.setAttribute("icon-role", "img")
  await tick()
  expect(host.querySelector("svg")).toBe(svg)
  expect(svg.querySelector("circle")).not.toBeNull()
  expect(svg.getAttribute("aria-label")).toBe("Heart")
  expect(svg.getAttribute("aria-hidden")).toBe("false")
  expect(svg.getAttribute("role")).toBe("img")
  host.setAttribute("icon-show-alt", "no")
  host.setAttribute("icon-rotate", "NaN")
  host.setAttribute("icon-stroke-width", "original")
  host.removeAttribute("icon-size")
  await tick()
  expect(svg.querySelector("path")).not.toBeNull()
  expect(svg.getAttribute("width")).toBe("24")
  expect(svg.getAttribute("color")).toBe("currentColor")
  expect(svg.style.getPropertyValue("--icones-stroke-width")).toBe("initial")
  const path = svg.querySelector("path")
  host.setAttribute("data-icon-size", "128")
  await tick()
  expect(svg.querySelector("path")).toBe(path)
  host.removeAttribute("icon-name")
  await tick()
  expect(host.querySelector("svg")).toBeNull()
})

test("preserves children and events; moving, removing and reconnecting manages only its own SVG", async () => {
  const { document, host, icons } = setup(
    '<i icon-name="app:star"><b>Save</b></i>'
  )
  const child = host.firstChild
  const svg = host.querySelector("svg")
  let clicks = 0
  host.addEventListener("click", () => clicks++)
  const container = document.createElement("section")
  document.body.append(container)
  container.append(host)
  await tick()
  expect(host.querySelector("svg")).toBe(svg)
  host.click()
  expect(clicks).toBe(1)
  host.remove()
  await tick()
  expect(host.innerHTML).toBe("<b>Save</b>")
  document.body.append(host)
  await tick()
  expect(host.firstChild).toBe(child)
  expect(host.querySelectorAll("svg")).toHaveLength(1)
  icons.destroy()
  host.setAttribute("icon-name", "app:heart")
  await tick()
  expect(host.querySelector("svg")).toBeNull()
})

test("observes nested additions and names added to existing i tags, but not inert template content", async () => {
  const { document } = setup(
    "<main><i></i></main><template><i icon-name='app:heart'></i></template>"
  )
  document.querySelector("main i")!.setAttribute("icon-name", "app:star")
  await tick()
  expect(document.querySelector("main svg")).not.toBeNull()
  const template = document.querySelector("template")!
  expect(template.content.querySelector("svg")).toBeNull()
  document.body.append(template.content.cloneNode(true))
  await tick()
  expect(document.querySelectorAll("svg")).toHaveLength(2)
})

test("scoped roots include themselves; overlapping initializers do not take ownership", () => {
  const { document, scope, host, icons } = setup()
  const nested = bindIcons({ root: host, scope })!
  nested.destroy()
  expect(host.querySelectorAll("svg")).toHaveLength(1)
  icons.destroy()
  const scoped = bindIcons({ root: host, scope })!
  cleanups.push(() => scoped.destroy())
  const outside = document.createElement("i")
  outside.setAttribute("icon-name", "app:star")
  document.body.append(outside)
  scoped.refresh()
  expect(host.querySelectorAll("svg")).toHaveLength(1)
  expect(outside.querySelector("svg")).toBeNull()
})

test("observe:false only refreshes explicitly and unchanged SVGs do not repaint", async () => {
  const { host, icons } = setup(undefined, false)
  const path = host.querySelector("path")
  icons.refresh()
  expect(host.querySelector("path")).toBe(path)
  host.setAttribute("icon-name", "app:heart")
  await tick()
  expect(host.querySelector("path")).toBe(path)
  icons.refresh()
  expect(host.querySelector("circle")).not.toBeNull()
})

test("a destroyed initializer can be recreated and late requests cannot resurrect its icons", async () => {
  const { document, icons } = setup(
    '<i icon-name="remote"></i><i icon-name="remote"></i>'
  )
  icons.destroy()
  let requests = 0
  let resolve!: (value: typeof data) => void
  const scope = createIconConfig({
    api: () => {
      requests++
      return new Promise((done) => {
        resolve = done
      })
    },
  })
  const next = bindIcons({ root: document, scope })!
  const loading = next.load()
  await tick()
  expect(requests).toBe(1)
  next.destroy()
  resolve(data)
  await loading
  expect(document.querySelector("svg")).toBeNull()
})

test("standard entry can be imported during SSR without DOM or custom-element globals", async () => {
  expect(bindIcons()).toBeUndefined()
  expect(
    (await import("../src/standard-element")).standardElements
  ).toBeUndefined()
})

test("source and built entries export bindIcons without the previous API alias", async () => {
  const [source, built] = await Promise.all([
    import("../src"),
    import("@icones/vanilla"),
  ])
  for (const entry of [source, built]) {
    expect(typeof entry.bindIcons).toBe("function")
    expect(entry.bindIcons()).toBeUndefined()
    expect(Object.hasOwn(entry, "initStandardElements")).toBe(false)
  }
})

class IntersectionMock {
  targets = new Set<Element>()
  disconnected = false
  constructor(readonly callback: IntersectionObserverCallback) {}
  observe(host: Element) {
    this.targets.add(host)
  }
  unobserve(host: Element) {
    this.targets.delete(host)
  }
  disconnect() {
    this.targets.clear()
    this.disconnected = true
  }
  emit(host: Element, isIntersecting = true) {
    this.callback(
      [{ target: host, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    )
  }
}
async function deferred(
  attributes = 'icon-defer="intersect"',
  readyState = "complete",
  intersection = true,
  prefix = "icon-"
) {
  const dom = new JSDOM(
    "<i " + prefix + 'name="remote" ' + attributes + "></i>"
  )
  const document = dom.window.document
  cleanups.push(() => dom.window.close())
  await tick()
  Object.defineProperty(document, "readyState", { get: () => readyState })
  const observers: IntersectionMock[] = []
  Object.defineProperty(dom.window, "IntersectionObserver", {
    value: intersection
      ? class extends IntersectionMock {
          constructor(callback: IntersectionObserverCallback) {
            super(callback)
            observers.push(this)
          }
        }
      : undefined,
  })
  const requests: string[] = []
  const scope = createIconConfig({
    api: (name) => {
      requests.push(name)
      return Promise.resolve(data)
    },
  })
  const icons = bindIcons({
    root: document,
    scope,
    attrPrefix: prefix,
  })!
  cleanups.push(() => icons.destroy())
  return {
    document,
    host: document.querySelector("i")!,
    icons,
    observers,
    requests,
    scope,
    ready() {
      readyState = "interactive"
      document.dispatchEvent(new dom.window.Event("DOMContentLoaded"))
    },
  }
}

test("custom defer attributes support both triggers, cancellation and the latest prefixed props", async () => {
  const { host, icons, requests, ready, observers } = await deferred(
    'ui-defer="intersect"',
    "loading",
    true,
    "ui-"
  )
  await icons.load()
  expect(requests).toEqual([])
  host.setAttribute("icon-defer", "")
  host.setAttribute("ui-size", "48")
  await tick()
  expect(host.querySelector("svg")).toBeNull()
  host.setAttribute("ui-defer", "domready")
  await tick()
  expect(observers[0]!.disconnected).toBe(true)
  observers[0]!.emit(host)
  expect(requests).toEqual([])
  ready()
  await icons.load()
  expect(requests).toEqual(["remote"])
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("48")
})

test("standard intersect defers SVG and requests, reads latest attributes, and does not defer after reconnect", async () => {
  const { document, host, icons, observers, requests } = await deferred()
  await icons.load()
  expect(host.querySelector("svg")).toBeNull()
  expect(requests).toEqual([])
  host.setAttribute("icon-name", "latest")
  host.setAttribute("icon-size", "48")
  observers[0]!.emit(host, false)
  expect(requests).toEqual([])
  observers[0]!.emit(host)
  await icons.load()
  expect(requests).toEqual(["latest"])
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("48")
  expect(observers[0]!.disconnected).toBe(true)
  host.remove()
  await tick()
  document.body.append(host)
  await icons.load()
  expect(host.querySelector("path")).not.toBeNull()
  expect(observers).toHaveLength(1)
})

test("standard domready waits only while loading and ignores unprefixed/legacy defer attributes", async () => {
  const { host, icons, ready, requests } = await deferred(
    'icon-defer="domready"',
    "loading"
  )
  await icons.load()
  expect(requests).toEqual([])
  host.setAttribute("defer", "intersect")
  host.setAttribute("data-defer", "intersect")
  ready()
  await icons.load()
  expect(requests).toEqual(["remote"])
  expect(host.querySelector("path")).not.toBeNull()
})

test("pending mode changes and removal cancel stale triggers even before MutationObserver runs", async () => {
  const { host, icons, observers, requests, ready, document } = await deferred(
    undefined,
    "loading"
  )
  host.setAttribute("icon-defer", "domready")
  await tick()
  observers[0]!.emit(host)
  expect(requests).toEqual([])
  host.setAttribute("icon-defer", "intersect")
  await tick()
  ready()
  expect(host.querySelector("svg")).toBeNull()
  host.remove()
  observers[1]!.emit(host)
  await icons.load()
  expect(requests).toEqual([])
  document.body.append(host)
  await tick()
  host.removeAttribute("icon-name")
  observers[2]!.emit(host)
  expect(requests).toEqual([])
})

test("defer changes are respected even if the old trigger arrives before mutation delivery", async () => {
  const { host, icons, requests, ready, observers } = await deferred(
    undefined,
    "loading"
  )
  host.setAttribute("icon-defer", "domready")
  observers[0]!.emit(host)
  expect(host.querySelector("svg")).toBeNull()
  expect(requests).toEqual([])
  ready()
  await icons.load()
  expect(requests).toEqual(["remote"])
})

test("destroy cancels pending domready listeners and intersection observers", async () => {
  const domready = await deferred('icon-defer="domready"', "loading")
  domready.icons.destroy()
  domready.ready()
  await tick()
  expect(domready.requests).toEqual([])
  const intersect = await deferred()
  intersect.icons.destroy()
  intersect.observers[0]!.emit(intersect.host)
  expect(intersect.requests).toEqual([])
  expect(intersect.observers[0]!.disconnected).toBe(true)
})

for (const [attributes, readyState, intersection] of [
  ['icon-defer="intersect"', "complete", false],
  ['icon-defer="domready"', "complete", true],
  ['icon-defer="domready"', "interactive", true],
  ['data-defer="intersect"', "loading", true],
  ['defer="intersect"', "loading", true],
  ['icon-defer="unknown"', "complete", true],
] as const)
  test(
    "standard immediate fallback: " +
      attributes +
      "/" +
      readyState +
      "/" +
      intersection,
    async () => {
      const { host, icons, requests, observers } = await deferred(
        attributes,
        readyState,
        intersection
      )
      await icons.load()
      expect(host.querySelector("path")).not.toBeNull()
      expect(requests).toEqual(["remote"])
      expect(observers).toHaveLength(0)
    }
  )
