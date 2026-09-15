import { afterEach, expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import {
  createIcon,
  createIconConfig,
  defineIconElement,
  type IconElement,
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
const attrs = (svg: Element) =>
  Object.fromEntries([...svg.attributes].map((attr) => [attr.name, attr.value]))

function fixture(html = '<icones-icon name="app:star"></icones-icon>') {
  const dom = new JSDOM(html)
  cleanups.push(() => {
    dom.window.document.body.replaceChildren()
    dom.window.close()
  })
  const document = dom.window.document
  const scope = createIconConfig({
    api: false,
    defaultSize: "lg",
    strokeWidth: 1.5,
    sources: { "app:star": data, "app:heart": alternate },
  })
  const constructor = defineIconElement({ window: dom.window, scope })!
  return {
    dom,
    document,
    scope,
    constructor,
    host: document.querySelector("icones-icon")!,
  }
}

test("upgrades existing HTML into a light-DOM SVG with imperative presentation parity", async () => {
  const { host, document, scope } = fixture(
    '<icones-icon name="app:star" size="64" color="#123456" fill="red" stroke-width="2.5" rotate="3" h-flip v-flip="false" absolute-stroke-width="true" label="Favorite" svg-class="art"></icones-icon>'
  )
  await host.load()
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
  const actual = host.querySelector("svg")!
  expect(host.shadowRoot).toBeNull()
  expect(actual.parentElement).toBe(host)
  expect(attrs(actual)).toEqual(attrs(expected.element))
  expect(actual.innerHTML).toBe(expected.element.innerHTML)
  expected.destroy()
})

test("host identity, native attributes, fallback children and listeners are preserved", () => {
  const { host } = fixture(
    '<icones-icon name="app:star" class="action" role="img" aria-label="Favorite" style="color: red" hidden><b>Save</b></icones-icon>'
  )
  const child = host.firstChild
  let clicks = 0
  host.addEventListener("click", () => clicks++)
  const svg = host.querySelector("svg")!
  expect(svg.getAttribute("aria-hidden")).toBe("true")
  expect(svg.hasAttribute("class")).toBe(false)
  expect(svg.hasAttribute("role")).toBe(false)
  host.setAttribute("name", "app:heart")
  host.click()
  expect(clicks).toBe(1)
  expect(host.firstChild).toBe(child)
  expect(host.className).toBe("action")
  expect(host.hidden).toBe(true)
  expect(host.style.color).toBe("red")
  expect(host.getAttribute("aria-label")).toBe("Favorite")
  expect(host.querySelector("circle")).not.toBeNull()
  host.remove()
  expect(host.innerHTML).toBe("<b>Save</b>")
})

test("global CSS can directly style the SVG without a shadow boundary", () => {
  const { host, dom } = fixture(
    '<style>icones-icon > svg { width: 42px; }</style><icones-icon name="app:star"></icones-icon>'
  )
  expect(dom.window.getComputedStyle(host.querySelector("svg")!).width).toBe(
    "42px"
  )
  expect(host.shadowRoot).toBeNull()
})

test("observes presentation, false booleans and removal of overrides without replacing the SVG", () => {
  const { host } = fixture(
    '<icones-icon name="app:star" alt-name="app:heart" show-alt="false" size="48"></icones-icon>'
  )
  const svg = host.querySelector("svg")!
  host.setAttribute("show-alt", "")
  expect(host.querySelector("svg")).toBe(svg)
  expect(svg.querySelector("circle")).not.toBeNull()
  host.setAttribute("show-alt", "false")
  host.setAttribute("stroke-width", "original")
  host.setAttribute("size", "1.5rem")
  expect(svg.querySelector("path")).not.toBeNull()
  expect(svg.style.getPropertyValue("--icones-stroke-width")).toBe("initial")
  expect(svg.getAttribute("width")).toBe("1.5rem")
  host.removeAttribute("size")
  host.removeAttribute("stroke-width")
  expect(svg.getAttribute("width")).toBe("24")
  expect(svg.getAttribute("stroke-width")).toBe("1.5")
})

test("connected, disconnected, moved and reconnected elements manage exactly one SVG", () => {
  const { document, host } = fixture()
  const section = document.createElement("section")
  document.body.append(section)
  section.append(host)
  expect(host.querySelectorAll("svg")).toHaveLength(1)
  host.remove()
  expect(host.querySelector("svg")).toBeNull()
  document.body.append(host)
  expect(host.querySelectorAll("svg")).toHaveLength(1)
  host.removeAttribute("name")
  expect(host.querySelector("svg")).toBeNull()
  host.setAttribute("name", "app:heart")
  expect(host.querySelector("circle")).not.toBeNull()
  const added = document.createElement("icones-icon")
  added.setAttribute("name", "app:star")
  expect(added.querySelector("svg")).toBeNull()
  document.body.append(added)
  expect(added.querySelectorAll("svg")).toHaveLength(1)
})

test("registration is idempotent and never changes an existing registration's scope", () => {
  const { dom, document, constructor } = fixture()
  expect(
    defineIconElement({
      window: dom.window,
      scope: createIconConfig({ api: false }),
    })
  ).toBe(constructor)
  const added = document.createElement("icones-icon")
  added.setAttribute("name", "app:heart")
  document.body.append(added)
  expect(added.querySelectorAll("svg")).toHaveLength(1)
  expect(added.querySelector("circle")).not.toBeNull()
})

test("another component using the reserved tag is not silently taken over", () => {
  const { dom } = fixture("<main></main>")
  const other = new JSDOM()
  try {
    other.window.customElements.define(
      "icones-icon",
      class extends other.window.HTMLElement {}
    )
    expect(() => defineIconElement({ window: other.window })).toThrow(
      "already registered"
    )
    expect(dom.window.customElements.get("icones-icon")).toBeDefined()
  } finally {
    other.window.close()
  }
})

test("ordinary icon attributes and legacy aliases never activate elements", () => {
  const { document, host } = fixture(
    '<span icon="app:star"></span><my-button icon="app:star"></my-button><i icon-name="app:star"></i><b data-icon="app:star"></b><icones-icon icon="app:star" icon-name="app:star" data-icon="app:star"></icones-icon>'
  )
  expect(document.querySelector("svg")).toBeNull()
  host.setAttribute("name", "app:star")
  host.setAttribute("icon-size", "64")
  host.setAttribute("data-icon-color", "red")
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("24")
  expect(host.querySelector("svg")!.getAttribute("color")).toBe("currentColor")
  host.removeAttribute("name")
  expect(host.querySelector("svg")).toBeNull()
})

test("templates and detached fragments wait until connection", () => {
  const { document } = fixture(
    '<template><icones-icon name="app:star"></icones-icon></template>'
  )
  const content = document.querySelector("template")!.content
  expect(content.querySelector("svg")).toBeNull()
  document.body.append(content.cloneNode(true))
  expect(document.querySelector("icones-icon > svg")).not.toBeNull()
  const fragment = document.createDocumentFragment()
  const host = document.createElement("icones-icon")
  host.setAttribute("name", "app:heart")
  fragment.append(host)
  expect(host.querySelector("svg")).toBeNull()
  document.body.append(fragment)
  expect(host.querySelector("circle")).not.toBeNull()
})

test("invalid values are ignored; blank names disable without falling back to old names", () => {
  const { host } = fixture(
    '<icones-icon name="app:star" alt-name="app:heart" show-alt="no" rotate="NaN" stroke-width="Infinity"></icones-icon>'
  )
  expect(host.querySelector("path")).not.toBeNull()
  expect(host.querySelector("svg")!.innerHTML).not.toMatch(/NaN|Infinity/)
  const path = host.querySelector("path")
  host.setAttribute("name", "app:star")
  expect(host.querySelector("path")).toBe(path)
  host.setAttribute("icon", "app:heart")
  host.setAttribute("name", " ")
  expect(host.querySelector("svg")).toBeNull()
})

test("size, accessibility and SVG-specific attributes are observed independently of native host attributes", () => {
  const { host } = fixture(
    '<icones-icon name="app:star" width="32" height="16" label="Favorite"></icones-icon>'
  )
  const svg = host.querySelector("svg")!
  expect(svg.getAttribute("width")).toBe("32")
  expect(svg.getAttribute("height")).toBe("16")
  expect(svg.getAttribute("aria-label")).toBe("Favorite")
  expect(svg.hasAttribute("aria-hidden")).toBe(false)
  host.setAttribute("label", "Star")
  host.setAttribute("decorative", "false")
  host.setAttribute("svg-role", "img")
  expect(svg.getAttribute("aria-label")).toBe("Star")
  expect(svg.getAttribute("aria-hidden")).toBe("false")
  expect(svg.getAttribute("role")).toBe("img")
  host.removeAttribute("label")
  host.removeAttribute("decorative")
  host.removeAttribute("svg-role")
  expect(svg.getAttribute("aria-hidden")).toBe("true")
})

test("element.scope overrides and restores the registration scope", () => {
  const { host } = fixture()
  host.scope = createIconConfig({
    api: false,
    defaultSize: "xl",
    sources: { "app:star": alternate },
  })
  expect(host.querySelector("circle")).not.toBeNull()
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("28")
  host.scope = undefined
  expect(host.querySelector("path")).not.toBeNull()
  expect(host.querySelector("svg")!.getAttribute("width")).toBe("24")
})

test("scope assigned before upgrade is respected on the first render", () => {
  const dom = new JSDOM('<icones-icon name="private"></icones-icon>')
  try {
    const host = dom.window.document.querySelector("icones-icon")!
    host.scope = createIconConfig({ api: false, sources: { private: data } })
    defineIconElement({
      window: dom.window,
      scope: createIconConfig({ api: false }),
    })
    expect(Object.hasOwn(host, "scope")).toBe(false)
    expect(host.querySelector("path")).not.toBeNull()
    host.remove()
  } finally {
    dom.window.close()
  }
})

test("shares asynchronous requests and ignores late results after disconnection", async () => {
  const { document } = fixture("<main></main>")
  let calls = 0
  let resolve!: (value: typeof data) => void
  const scope = createIconConfig({
    api: () => {
      calls++
      return new Promise((done) => {
        resolve = done
      })
    },
  })
  const hosts: IconElement[] = []
  for (let i = 0; i < 2; i++) {
    const host = document.createElement("icones-icon")
    host.scope = scope
    host.setAttribute("name", "remote")
    document.body.append(host)
    hosts.push(host)
  }
  const loading = Promise.all(hosts.map((host) => host.load()))
  await tick()
  expect(calls).toBe(1)
  hosts.forEach((host) => host.remove())
  resolve(data)
  await loading
  expect(document.querySelector("svg")).toBeNull()
  hosts.forEach((host) => expect(host.querySelector("svg")).toBeNull())
})

test("adoption into another document recreates only the owned SVG in its new document", () => {
  const { document, host } = fixture()
  const other = new JSDOM()
  try {
    other.window.document.adoptNode(host)
    expect(host.querySelector("svg")).toBeNull()
    other.window.document.body.append(host)
    expect(host.querySelector("svg")!.ownerDocument).toBe(other.window.document)
    expect(document.querySelector("svg")).toBeNull()
    host.remove()
  } finally {
    other.window.close()
  }
})

test("main entry and registration entry can be imported without DOM globals", async () => {
  expect(typeof globalThis.window).toBe("undefined")
  expect(defineIconElement()).toBeUndefined()
  await import("../src/web-element")
})
