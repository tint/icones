import { expect, test } from "bun:test"
import { act, createRef, type ReactNode } from "react"
import { renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import { Dropdown } from "../src/shared/ui/dropdown.tsx"

async function withDropdown(
  run: (
    host: HTMLElement,
    render: (node: ReactNode) => Promise<void>,
    dom: JSDOM
  ) => Promise<void>
) {
  const dom = new JSDOM(
    '<!doctype html><div id="root"></div><button id="outside">Outside</button>',
    {
      url: "https://icons.test/",
    }
  )
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
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
  try {
    await run(
      host,
      async (node) => {
        await act(async () => root.render(node))
      },
      dom
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
  type: "pointerover" | "pointerout" | "pointerdown",
  pointerType = "mouse",
  relatedTarget: EventTarget | null = null
) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    relatedTarget,
  })
  Object.defineProperty(event, "pointerType", { value: pointerType })
  await act(async () => target.dispatchEvent(event))
}

async function escape(target: Element) {
  await act(async () =>
    target.dispatchEvent(
      new window.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    )
  )
}

test("Dropdown renders independent native disclosures and arbitrary content during SSR", () => {
  const fragment = JSDOM.fragment(
    renderToString(
      <>
        <Dropdown
          trigger="Links"
          align="end"
          triggerProps={{ "data-active": true, className: "px-6" }}
          panelClassName="rounded-2xl"
        >
          <ul>
            <li>
              <a href="/guide">Guide</a>
            </li>
          </ul>
        </Dropdown>
        <Dropdown trigger="Settings" align="center" open>
          <label>
            Query
            <input name="query" />
          </label>
        </Dropdown>
      </>
    )
  )
  const [first, second] = fragment.querySelectorAll("details")
  const triggers = [...fragment.querySelectorAll("summary")]
  const ids = triggers.map((trigger) => trigger.getAttribute("aria-controls")!)
  expect(new Set(ids).size).toBe(2)
  for (const id of ids) expect(fragment.getElementById(id)).not.toBeNull()
  expect(first!.open).toBe(false)
  expect(second!.open).toBe(true)
  expect(triggers[0]!.getAttribute("data-active")).toBe("true")
  expect(triggers[0]!.classList.contains("px-6")).toBe(true)
  expect(triggers[0]!.classList.contains("px-3")).toBe(false)
  expect(triggers[0]!.nextElementSibling!.classList.contains("right-0")).toBe(
    true
  )
  expect(
    triggers[1]!.nextElementSibling!.classList.contains("-translate-x-1/2")
  ).toBe(true)
  expect(
    fragment.getElementById(ids[0]!)!.classList.contains("rounded-2xl")
  ).toBe(true)
  expect(fragment.querySelector("input")?.name).toBe("query")
  expect(fragment.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
})

test("mouse hover is opt-in, preserves focus and stays open across the panel gap", async () => {
  await withDropdown(async (host, render) => {
    const content = <a href="/guide">Guide</a>
    await render(<Dropdown trigger="Links">{content}</Dropdown>)
    const details = host.querySelector("details")!
    const trigger = host.querySelector("summary")!
    const initialFocus = document.activeElement
    await pointer(trigger, "pointerover")
    expect(details.open).toBe(false)
    await render(
      <Dropdown trigger="Links" openOnHover>
        {content}
      </Dropdown>
    )
    await pointer(trigger, "pointerover", "touch")
    expect(details.open).toBe(false)
    await pointer(trigger, "pointerover", "pen")
    expect(details.open).toBe(false)
    await pointer(trigger, "pointerover")
    expect(details.open).toBe(true)
    expect(document.activeElement).toBe(initialFocus)
    const bridge = trigger.nextElementSibling!
    const link = host.querySelector("a")!
    expect(bridge.classList.contains("pt-2")).toBe(true)
    await pointer(trigger, "pointerout", "mouse", bridge)
    await pointer(bridge, "pointerout", "mouse", link)
    expect(details.open).toBe(true)
    await pointer(link, "pointerout", "mouse", document.body)
    expect(details.open).toBe(false)
  })
})

test("native click toggles and touch leave does not close the disclosure", async () => {
  await withDropdown(async (host, render) => {
    const toggles: boolean[] = []
    await render(
      <Dropdown
        trigger="Links"
        openOnHover
        onToggle={(event) => toggles.push(event.currentTarget.open)}
      >
        Panel
      </Dropdown>
    )
    const trigger = host.querySelector("summary")!
    const details = host.querySelector("details")!
    await act(async () => {
      trigger.click()
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    expect(details.open).toBe(true)
    expect(toggles).toEqual([true])
    await pointer(trigger, "pointerout", "touch", document.body)
    expect(details.open).toBe(true)
    await act(async () => trigger.click())
    expect(details.open).toBe(false)
  })
})

test("focus stays within arbitrary panel controls; blur and outside press close without stealing focus", async () => {
  await withDropdown(async (host, render) => {
    await render(
      <Dropdown trigger="Settings" openOnHover>
        <input aria-label="Query" />
        <button>Apply</button>
      </Dropdown>
    )
    const details = host.querySelector("details")!
    const trigger = host.querySelector("summary")!
    const input = host.querySelector("input")!
    const button = host.querySelector("button")!
    const outside = document.getElementById("outside")!
    await act(async () => trigger.click())
    await act(async () => input.focus())
    await pointer(input, "pointerout", "mouse", document.body)
    expect(details.open).toBe(true)
    await act(async () => button.focus())
    await pointer(button, "pointerdown")
    expect(details.open).toBe(true)
    await act(async () => outside.focus())
    expect(details.open).toBe(false)
    await act(async () => trigger.click())
    await pointer(outside, "pointerdown")
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(outside)
  })
})

test("Escape closes only the innermost open disclosure and restores its summary focus", async () => {
  await withDropdown(async (host, render) => {
    await render(
      <Dropdown trigger="Outer" open>
        <Dropdown trigger="Inner" open>
          <button>Action</button>
        </Dropdown>
      </Dropdown>
    )
    const [outer, inner] = host.querySelectorAll("details")
    await act(async () => host.querySelector("button")!.focus())
    await escape(host.querySelector("button")!)
    expect(inner!.open).toBe(false)
    expect(outer!.open).toBe(true)
    expect(document.activeElement).toBe(inner!.querySelector("summary"))
    await escape(inner!.querySelector("summary")!)
    expect(outer!.open).toBe(false)
    expect(document.activeElement).toBe(outer!.querySelector("summary"))
  })
})

test("consumer event handlers can cancel default hover, click and Escape behavior", async () => {
  await withDropdown(async (host, render) => {
    await render(
      <Dropdown
        trigger="Settings"
        openOnHover
        onPointerEnter={(event) => event.preventDefault()}
        onKeyDown={(event) => event.preventDefault()}
        triggerProps={{ onClick: (event) => event.preventDefault() }}
      >
        Panel
      </Dropdown>
    )
    const details = host.querySelector("details")!
    const trigger = host.querySelector("summary")!
    await pointer(trigger, "pointerover")
    expect(details.open).toBe(false)
    await act(async () => trigger.click())
    expect(details.open).toBe(false)
    await act(async () => {
      details.open = true
    })
    await escape(trigger)
    expect(details.open).toBe(true)
  })
})

test("root refs and native open updates work, and outside listeners are removed on unmount", async () => {
  const ref = createRef<HTMLDetailsElement>()
  await withDropdown(async (host, render) => {
    await render(
      <Dropdown ref={ref} trigger="Links" id="links" open>
        Panel
      </Dropdown>
    )
    const details = host.querySelector("details")!
    expect(ref.current).toBe(details)
    expect(details.id).toBe("links")
    expect(details.open).toBe(true)
    await render(
      <Dropdown ref={ref} trigger="Links" open={false}>
        Panel
      </Dropdown>
    )
    expect(details.open).toBe(false)
    await render(null)
    expect(ref.current).toBeNull()
    details.open = true
    await pointer(document.body, "pointerdown")
    expect(details.open).toBe(true)
  })
})
