import { expect, test } from "bun:test"
import { act } from "react"
import { JSDOM } from "jsdom"
import { Select } from "../src/shared/ui/select.tsx"

const options = [
  { value: "tabler", label: "Tabler" },
  { value: "lucide", label: "Lucide" },
  { value: "bootstrap", label: "Bootstrap" },
]

async function withSelect(
  run: (
    container: HTMLElement,
    render: (
      props?: Partial<React.ComponentProps<typeof Select<string>>>
    ) => Promise<void>,
    key: (name: string) => Promise<void>,
    resize: (target: Element) => Promise<void>
  ) => Promise<void>
) {
  const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', {
    url: "https://test.local",
    pretendToBeVisual: true,
  })
  const observers = new Map<() => void, Set<Element>>()
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    ResizeObserver: class {
      constructor(private callback: () => void) {
        observers.set(callback, new Set())
      }
      observe(target: Element) {
        observers.get(this.callback)!.add(target)
      }
      disconnect() {
        observers.delete(this.callback)
      }
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  const { createRoot } = await import("react-dom/client")
  const container = dom.window.document.getElementById("root")!
  const root = createRoot(container)
  try {
    await run(
      container,
      async (props = {}) => {
        await act(async () =>
          root.render(
            <Select options={options} aria-label="Icon set" {...props} />
          )
        )
      },
      async (key) => {
        await act(async () => {
          dom.window.document.activeElement!.dispatchEvent(
            new dom.window.KeyboardEvent("keydown", { key, bubbles: true })
          )
        })
      },
      async (target) => {
        await act(async () => {
          for (const [callback, targets] of observers) {
            if (targets.has(target)) callback()
          }
        })
      }
    )
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

async function pointer(
  target: Element,
  type: "pointerover" | "pointerout",
  pointerType = "mouse",
  relatedTarget: EventTarget | null = null
) {
  const event = new window.MouseEvent(type, { bubbles: true, relatedTarget })
  Object.defineProperty(event, "pointerType", { value: pointerType })
  await act(async () => target.dispatchEvent(event))
}

test("Select hover is opt-in and bridges the menu gap without moving focus", async () => {
  await withSelect(async (container, render) => {
    await render()
    const trigger =
      container.querySelector<HTMLButtonElement>("[aria-haspopup]")!
    await pointer(trigger, "pointerover")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await render({ openOnHover: true, defaultValue: "lucide" })
    const focus = document.activeElement
    await pointer(trigger, "pointerover", "touch")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await pointer(trigger, "pointerover")
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(document.activeElement).toBe(focus)
    const bridge = trigger.nextElementSibling!
    expect(bridge.className).toContain("data-[above=false]:pt-1")
    const option = bridge.querySelector('[role="option"]')!
    await pointer(trigger, "pointerout", "mouse", bridge)
    await pointer(bridge, "pointerout", "mouse", option)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    await pointer(option, "pointerout", "mouse", document.body)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })
})

test("hover menus retain keyboard focus, close on blur/outside press and preserve touch selection", async () => {
  await withSelect(async (container, render, key) => {
    await render({ openOnHover: true, defaultValue: "lucide" })
    const trigger =
      container.querySelector<HTMLButtonElement>("[aria-haspopup]")!
    await pointer(trigger, "pointerover")
    trigger.focus()
    await key("ArrowDown")
    expect(document.activeElement?.textContent).toBe("Lucide")
    await pointer(document.activeElement!, "pointerout", "mouse", document.body)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    await key("Escape")
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await act(async () => trigger.click())
    await act(async () => (document.activeElement as HTMLElement).blur())
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await pointer(trigger, "pointerover")
    await act(async () =>
      document.body.dispatchEvent(
        new window.Event("pointerdown", { bubbles: true })
      )
    )
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    await pointer(trigger, "pointerover", "touch")
    await act(async () => trigger.click())
    await key("End")
    await key("Enter")
    expect(trigger.textContent).toBe("Bootstrap")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })
})

test("Select supports arrows, Home/End, selection, Escape and focus restoration", async () => {
  await withSelect(async (container, render, key) => {
    const changes: (string | undefined)[] = []
    await render({
      defaultValue: "lucide",
      onValueChange: (value) => changes.push(value),
    })
    const trigger =
      container.querySelector<HTMLButtonElement>("[aria-haspopup]")!
    expect(trigger.textContent).toBe("Lucide")
    trigger.focus()
    await key("ArrowDown")
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(document.activeElement?.textContent).toBe("Lucide")
    expect(container.querySelector("[role=listbox]")?.id).toBe(
      trigger.getAttribute("aria-controls")!
    )
    await key("End")
    expect(document.activeElement?.textContent).toBe("Bootstrap")
    await key("Home")
    expect(document.activeElement?.textContent).toBe("Tabler")
    await key("ArrowDown")
    await key("ArrowDown")
    await key("Enter")
    expect(changes).toEqual(["bootstrap"])
    expect(document.activeElement).toBe(trigger)
    expect(trigger.textContent).toBe("Bootstrap")
    await key("ArrowUp")
    await key("Escape")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(trigger)
    expect(changes).toHaveLength(1)
  })
})

test("Select distinguishes controlled undefined from defaultValue and closes on outside click", async () => {
  await withSelect(async (container, render, key) => {
    await render({ defaultValue: "tabler" })
    const trigger =
      container.querySelector<HTMLButtonElement>("[aria-haspopup]")!
    expect(trigger.textContent).toBe("Tabler")
    await render({ value: undefined, defaultValue: "tabler" })
    expect(trigger.textContent).toBe("Select an option")
    trigger.focus()
    await key("ArrowDown")
    await key("Enter")
    expect(trigger.textContent).toBe("Select an option")
    await key("ArrowDown")
    await act(async () => {
      document.body.click()
    })
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })
})

test("Select keeps header/footer outside the scroll viewport and tracks available space", async () => {
  await withSelect(async (container, render, key, resize) => {
    await render({ header: <p>Collections</p>, footer: <p>3 collections</p> })
    const list = container.querySelector<HTMLElement>("[role=listbox]")!
    const viewport = list.parentElement!
    const panel = viewport.parentElement!
    const header = panel.firstElementChild!
    const footer = panel.lastElementChild!
    expect(header.textContent).toBe("Collections")
    expect(footer.textContent).toBe("3 collections")
    expect(header.classList.contains("shrink-0")).toBe(true)
    expect(footer.classList.contains("shrink-0")).toBe(true)
    expect(viewport.contains(header)).toBe(false)
    expect(viewport.contains(footer)).toBe(false)
    expect(viewport.classList.contains("min-h-0")).toBe(true)
    expect(viewport.classList.contains("flex-auto")).toBe(true)
    expect(panel.className).not.toContain("data-[scrollable=true]:h-")

    let availableHeight = 72
    let contentHeight = 108
    Object.defineProperties(viewport, {
      clientHeight: { get: () => availableHeight },
      scrollHeight: { get: () => contentHeight },
    })
    container.querySelector<HTMLButtonElement>("[aria-haspopup]")!.focus()
    await key("ArrowDown")
    await resize(viewport)
    expect(
      panel.querySelector('[aria-label="Scroll options down"]')
    ).not.toBeNull()

    // A shorter header/footer leaves enough room for all options.
    availableHeight = 108
    await resize(viewport)
    expect(panel.querySelector('[aria-label="Scroll options down"]')).toBeNull()

    // Content can grow without changing the number of options.
    contentHeight = 180
    await resize(list)
    expect(
      panel.querySelector('[aria-label="Scroll options down"]')
    ).not.toBeNull()
    expect(panel.firstElementChild).toBe(header)
    expect(panel.lastElementChild).toBe(footer)
  })
})

test("Select keyboard scrolling uses the viewport position, not header or option offset parents", async () => {
  await withSelect(async (container, render, key) => {
    await render({ header: <p>Collections</p>, footer: <p>3 collections</p> })
    const list = container.querySelector<HTMLElement>("[role=listbox]")!
    const viewport = list.parentElement!
    Object.defineProperties(viewport, {
      clientHeight: { value: 72 },
      offsetTop: { value: 100 },
      getBoundingClientRect: { value: () => ({ top: 100 }) },
    })
    list
      .querySelectorAll<HTMLElement>("[role=option]")
      .forEach((item, index) => {
        Object.defineProperties(item, {
          offsetTop: { value: 0 },
          offsetHeight: { value: 36 },
          getBoundingClientRect: {
            value: () => ({ top: 100 + index * 36 - viewport.scrollTop }),
          },
        })
      })
    container.querySelector<HTMLButtonElement>("[aria-haspopup]")!.focus()
    await key("ArrowDown")
    expect(viewport.scrollTop).toBe(0)
    await key("End")
    expect(viewport.scrollTop).toBe(36)
    expect(document.activeElement?.textContent).toBe("Bootstrap")
    await key("Home")
    expect(viewport.scrollTop).toBe(0)
  })
})
