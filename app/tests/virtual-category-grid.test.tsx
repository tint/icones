import { expect, test } from "bun:test"
import { act } from "react"
import { JSDOM } from "jsdom"
import { IconConfig } from "@icones/react"
import {
  VirtualCategoryGrid,
  type VirtualIconCategory,
} from "../src/features/catalog/components/virtual-category-grid.tsx"

test("virtualized categories retain sticky headings and measure geometry only on layout changes", async () => {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "https://icons.test/icons", pretendToBeVisual: true }
  )
  const categories: VirtualIconCategory[] = [
    "arrows",
    "buildings",
    "devices",
  ].map((category, group) => ({
    category: { id: category, category: "Tabler · " + category },
    icons: Array.from({ length: group === 2 ? 4 : 80 }, (_, index) => ({
      name: `tabler:${category}-${index}`,
      slug: `${category}-${index}`,
      prefix: "tabler",
      category,
      variant: "outline",
    })),
  }))
  let gridWidth = 1000
  let rectReads = 0
  let observerDisconnected = false
  let observed: Element[] = []
  let onResize = () => {}
  Object.defineProperty(dom.window, "innerHeight", {
    configurable: true,
    value: 400,
  })
  Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return gridWidth
    },
  })
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains("virtual-category-grid")) rectReads++
    return new dom.window.DOMRect(0, 300 - dom.window.scrollY, gridWidth, 1000)
  }
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      constructor(callback: () => void) {
        onResize = callback
      }
      observe(element: Element) {
        observed.push(element)
      }
      disconnect() {
        observerDisconnected = true
      }
    },
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  const { createRoot } = await import("react-dom/client")
  const host = dom.window.document.getElementById("root")!
  const root = createRoot(host)
  const scroll = async (top: number) => {
    await act(async () => {
      Object.defineProperty(dom.window, "scrollY", {
        configurable: true,
        value: top,
      })
      dom.window.dispatchEvent(new dom.window.Event("scroll"))
      await new Promise((resolve) => dom.window.requestAnimationFrame(resolve))
    })
  }
  try {
    await act(async () => {
      root.render(
        <section
          id="catalog"
          style={{ "--catalog-toolbar-height": "118px" } as React.CSSProperties}
        >
          <IconConfig api={false}>
            <VirtualCategoryGrid
              categories={categories}
              color="currentColor"
              onSelect={() => {}}
            />
          </IconConfig>
        </section>
      )
    })
    const grid = host.querySelector<HTMLElement>(".virtual-category-grid")!
    expect(grid.style.getPropertyValue("--virtual-grid-columns")).toBe("8")
    expect(observed).toContain(grid)
    expect(observed).toContain(host.querySelector("#catalog")!)
    expect(host.querySelector("#category-arrows")).not.toBeNull()
    const initialReads = rectReads
    await scroll(2500)
    expect(host.querySelector("#category-arrows")).toBeNull()
    const heading = host.querySelector<HTMLElement>("#category-buildings")!
    expect(heading).not.toBeNull()
    expect(heading.style.transform).toBe("")
    expect(heading.parentElement?.className).toBe("virtual-category-section")
    expect(heading.parentElement?.style.top).toBe("1412px")
    expect(heading.parentElement?.getAttribute("aria-labelledby")).toBe(
      heading.id
    )
    expect(
      host.querySelector('[aria-label="View tabler:buildings-0 details"]')
    ).toBeNull()
    expect(host.querySelectorAll(".icon-card").length).toBeLessThan(80)
    await scroll(2600)
    await scroll(2400)
    expect(rectReads).toBe(initialReads)
    gridWidth = 600
    await act(async () => {
      onResize()
      await new Promise((resolve) => dom.window.requestAnimationFrame(resolve))
    })
    expect(rectReads).toBe(initialReads + 1)
    expect(grid.style.getPropertyValue("--virtual-grid-columns")).toBe("5")
    await scroll(0)
    expect(host.querySelector("#category-arrows")).not.toBeNull()
  } finally {
    await act(async () => root.unmount())
    expect(observerDisconnected).toBe(true)
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
