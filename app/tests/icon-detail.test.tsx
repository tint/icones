import { expect, test } from "bun:test"
import { act } from "react"
import { JSDOM } from "jsdom"
import { MemoryRouter } from "react-router"
import { IconConfig } from "@icones/react"
import { IconDetail } from "../src/features/catalog/components/icon-detail.tsx"
import { elementDataToIcon } from "@icones/core/svg-data"
import { getIconSource } from "../src/features/licenses/sources.ts"

const data = [
  [
    "svg",
    {
      viewBox: "0 0 256 128",
      key: "root",
      children: [
        [
          "path",
          {
            stroke: "currentColor",
            strokeWidth: "16",
            fill: "none",
            d: "M0 0h256",
            key: "source-path",
          },
        ],
      ],
    },
  ],
] as const
async function withDetail(
  run: (context: {
    host: HTMLElement
    copies: string[]
    requests: string[]
    click: (label: string) => Promise<void>
    choose: (label: string, option: string) => Promise<void>
    change: (
      element: HTMLSelectElement | HTMLInputElement,
      value: string
    ) => Promise<void>
    failClipboard: () => void
    closeCount: () => number
  }) => Promise<void>,
  failFirstLoad = false,
  darkTheme = false,
  sourceData: unknown = data
) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://icons.test/",
    pretendToBeVisual: true,
  })
  dom.window.matchMedia = (() => ({
    matches: false,
  })) as unknown as typeof dom.window.matchMedia
  dom.window.document.documentElement.classList.toggle("dark", darkTheme)
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false
    this.dispatchEvent(new dom.window.Event("close"))
  }
  const copies: string[] = []
  let closes = 0
  let clipboardFails = false
  Object.defineProperty(dom.window.navigator, "clipboard", {
    value: {
      writeText: async (value: string) => {
        if (clipboardFails) throw new Error("denied")
        copies.push(value)
      },
    },
  })
  const requests: string[] = []
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (input: RequestInfo | URL) => {
      requests.push(String(input))
      if (failFirstLoad && requests.length === 1)
        return new Response("Unavailable", { status: 503 })
      if (String(input).endsWith("/tabler/data/arrow-bar-up.json"))
        return Response.json(sourceData)
      return Response.json({
        prefix: "tabler",
        icons: { "arrow-bar-up": elementDataToIcon(data) },
      })
    },
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
  const host = dom.window.document.getElementById("root")!
  const root = createRoot(host)
  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <IconConfig api={false}>
            <IconDetail
              icon={{
                name: "tabler:arrow-bar-up",
                slug: "arrow-bar-up",
                category: "arrows",
                prefix: "tabler",
              }}
              onClose={() => {
                closes++
              }}
            />
          </IconConfig>
        </MemoryRouter>
      )
    )
    await flush()
    await run({
      host,
      copies,
      requests,
      closeCount: () => closes,
      failClipboard: () => {
        clipboardFails = true
      },
      click: async (label) => {
        const button = [...host.querySelectorAll("button")].find(
          (element) =>
            element.getAttribute("aria-label") === label ||
            element.textContent?.trim() === label
        )
        if (!button) throw new Error("Missing button: " + label)
        await act(async () => button.click())
        await flush()
      },
      change: async (element, value) => {
        const prototype =
          element.tagName === "SELECT"
            ? dom.window.HTMLSelectElement.prototype
            : dom.window.HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
          element,
          value
        )
        await act(async () =>
          element.dispatchEvent(
            new dom.window.Event("change", { bubbles: true })
          )
        )
        await flush()
      },
      choose: async (label, option) => {
        const trigger = [...host.querySelectorAll("button")].find(
          (button) => button.getAttribute("aria-label") === label
        )
        if (!trigger) throw new Error("Missing Select: " + label)
        await act(async () => trigger.click())
        const list = host.ownerDocument.getElementById(
          trigger.getAttribute("aria-controls")!
        )!
        const item = [
          ...list.querySelectorAll<HTMLElement>('[role="option"]'),
        ].find((item) => item.textContent?.trim() === option)
        if (!item) throw new Error("Missing option: " + option)
        await act(async () => item.click())
        await flush()
      },
    })
  } finally {
    await act(async () => root.unmount())
    expect(dom.window.document.body.style.overflow).toBe("")
    expect(dom.window.document.documentElement.style.scrollbarGutter).toBe("")
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

test("detail scrolls in the full-screen overlay while the content card grows naturally", async () => {
  await withDetail(async ({ host, click, closeCount }) => {
    const dialog = host.querySelector("dialog")!
    const overlay = host.querySelector<HTMLElement>(
      '[data-slot="icon-detail-overlay"]'
    )!
    const card = host.querySelector<HTMLElement>(
      '[data-slot="icon-detail-content"]'
    )!
    expect(dialog.open).toBe(true)
    expect(dialog.classList.contains("overflow-hidden")).toBe(true)
    expect(dialog.classList.contains("h-dvh")).toBe(true)
    expect(overlay.classList.contains("overflow-y-auto")).toBe(true)
    expect(overlay.classList.contains("overscroll-y-contain")).toBe(true)
    expect(card.closest('[data-slot="icon-detail-overlay"]')).toBe(overlay)
    expect(card.classList.contains("rounded-2xl")).toBe(true)
    expect(
      card.querySelector('[role="tab"]')?.classList.contains("rounded-lg")
    ).toBe(true)
    for (const input of card.querySelectorAll('input[type="number"]'))
      expect(input.classList.contains("rounded-lg")).toBe(true)
    expect(card.className).not.toMatch(/overflow-|max-h-/)
    expect(card.parentElement?.classList.contains("min-h-full")).toBe(true)
    expect(document.body.style.overflow).toBe("hidden")
    await act(async () =>
      card.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }))
    )
    expect(closeCount()).toBe(0)
    expect(dialog.open).toBe(true)
    await click("Close icon details")
    expect(closeCount()).toBe(1)
    expect(dialog.open).toBe(false)
  })
})

test("clicking the outer padding dismisses icon details", async () => {
  await withDetail(async ({ host, closeCount }) => {
    const backdrop = host.querySelector(
      '[data-slot="icon-detail-content"]'
    )!.parentElement!
    await act(async () =>
      backdrop.dispatchEvent(
        new window.MouseEvent("mousedown", { bubbles: true })
      )
    )
    expect(closeCount()).toBe(1)
    expect(host.querySelector("dialog")?.open).toBe(false)
  })
})

test("detail license notices open separately without changing the card or closing its dialog", async () => {
  await withDetail(async ({ host, click, closeCount }) => {
    const detail = host.querySelector("dialog")!
    const section = detail.querySelector(
      'section[aria-label="Source and license"]'
    )!
    const trigger = section.querySelector("button")!
    const overlay = detail.querySelector<HTMLElement>(
      '[data-slot="icon-detail-overlay"]'
    )!
    const content = section.innerHTML
    overlay.scrollTop = 480
    expect(section.querySelector("details, pre")).toBeNull()
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog")

    for (const dismissal of ["button", "backdrop", "native"]) {
      await click("Read license notice")
      const dialogs = host.querySelectorAll("dialog")
      expect(dialogs).toHaveLength(2)
      const notice = dialogs[1]!
      expect(notice.open).toBe(true)
      expect(detail.contains(notice)).toBe(false)
      expect(notice.firstElementChild?.classList.contains("rounded-2xl")).toBe(
        true
      )
      expect(
        notice.querySelector("button")?.classList.contains("rounded-lg")
      ).toBe(true)
      expect(notice.querySelector("h2")?.textContent).toBe(
        "tabler · License notice"
      )
      expect(notice.querySelector("pre")?.textContent).toBe(
        getIconSource("tabler")!.licenseText
      )
      expect(document.activeElement).toBe(notice.querySelector("button"))
      expect(section.innerHTML).toBe(content)
      await act(async () => notice.querySelector("pre")!.click())
      expect(notice.open).toBe(true)

      if (dismissal === "button") await click("Close license notice")
      else
        await act(async () =>
          dismissal === "backdrop" ? notice.click() : notice.close()
        )

      expect(host.querySelectorAll("dialog")).toHaveLength(1)
      expect(detail.open).toBe(true)
      expect(closeCount()).toBe(0)
      expect(document.activeElement).toBe(trigger)
      expect(overlay.scrollTop).toBe(480)
      expect(section.innerHTML).toBe(content)
      expect(document.body.style.overflow).toBe("hidden")
      expect(document.documentElement.style.scrollbarGutter).toBe("stable")
    }
  })
})

test("unmounting icon details with a license modal open releases both scroll locks", async () => {
  await withDetail(async ({ host, click, closeCount }) => {
    await click("Read license notice")
    expect(host.querySelectorAll("dialog[open]")).toHaveLength(2)
    expect(document.body.style.overflow).toBe("hidden")
    expect(closeCount()).toBe(0)
    // withDetail unmounts the whole tree and checks both original scroll styles.
  })
})

test("detail offers eight formats, source notices, native dimensions and copyable endpoints", async () => {
  await withDetail(async ({ host, click, copies }) => {
    expect(host.querySelector("dialog")?.open).toBe(true)
    expect(host.querySelectorAll('[role="tab"]')).toHaveLength(8)
    expect(
      host.querySelector('section[aria-label="Icon information"]')?.textContent
    ).toContain("256 × 128")
    expect(
      host.querySelector('section[aria-label="Source and license"]')
        ?.textContent
    ).toContain("MIT License")
    expect(host.querySelector('a[target="_blank"]')?.getAttribute("href")).toBe(
      "https://github.com/tabler/tabler-icons"
    )
    await click("Copy Icon JSON URL")
    expect(copies.at(-1)).toBe(
      "https://icons.test/icons/tabler/data/arrow-bar-up.json"
    )
    await click("Copy SVG symbol URL")
    expect(copies.at(-1)).toBe(
      "https://icons.test/icons/tabler/arrow-bar-up.svg#icon"
    )
    for (const format of [
      "React",
      "Vue",
      "Svelte",
      "SolidJS",
      "Astro",
      "Vanilla",
    ]) {
      await click(format)
      expect(host.querySelector('[role="tabpanel"]')?.textContent).toContain(
        `@icones/${format.toLowerCase()}`
      )
      await click("Copy install command")
      expect(copies.at(-1)).toBe(`bun add @icones/${format.toLowerCase()}`)
      await click(`Copy ${format} code`)
      expect(copies.at(-1)).toContain("tabler:arrow-bar-up")
      expect(copies.at(-1)).not.toContain("IconConfig")
      expect(copies.at(-1)).not.toContain("scope")
      expect(copies.at(-1)).not.toContain("export function")
    }
  })
})

test("endpoint copy buttons show independent success feedback and handle clipboard failure", async () => {
  await withDetail(async ({ host, click, copies, failClipboard }) => {
    const json = host.querySelector<HTMLButtonElement>(
      '[aria-label="Copy Icon JSON URL"]'
    )!
    const symbol = host.querySelector<HTMLButtonElement>(
      '[aria-label="Copy SVG symbol URL"]'
    )!
    expect(json.textContent).toBe("Copy URL")
    expect(symbol.textContent).toBe("Copy URL")
    expect(json.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(symbol.querySelector('[aria-hidden="true"]')).not.toBeNull()

    await click("Copy Icon JSON URL")
    expect(copies.at(-1)).toBe(
      "https://icons.test/icons/tabler/data/arrow-bar-up.json"
    )
    expect(json.getAttribute("data-copied")).toBe("true")
    expect(json.textContent).toBe("Copied")
    expect(symbol.getAttribute("data-copied")).toBe("false")
    expect(host.querySelector('p.sr-only[role="status"]')?.textContent).toBe(
      "Copied to clipboard."
    )

    await click("Copy SVG symbol URL")
    expect(copies.at(-1)).toBe(
      "https://icons.test/icons/tabler/arrow-bar-up.svg#icon"
    )
    expect(symbol.getAttribute("data-copied")).toBe("true")
    expect(symbol.textContent).toBe("Copied")
    expect(json.getAttribute("data-copied")).toBe("false")
    expect(json.textContent).toBe("Copy URL")

    failClipboard()
    await click("Copy Icon JSON URL")
    expect(json.getAttribute("data-copied")).toBe("false")
    expect(symbol.getAttribute("data-copied")).toBe("false")
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Clipboard access is unavailable"
    )
  })
})

test("preview default color respects manual dark theme even when the OS is light", async () => {
  await withDetail(
    async ({ host, click, copies }) => {
      expect(
        host.querySelector<HTMLInputElement>('input[type="color"]')?.value
      ).toBe("#e2e8f0")
      await click("Copy SVG")
      expect(copies.at(-1)).toContain('color="#e2e8f0"')
    },
    false,
    true
  )
})

test("preview Selects preserve defaults and can reset stroke, size and all quarter-turn rotations", async () => {
  await withDetail(async ({ host, click, choose, copies }) => {
    expect(host.querySelector("select")).toBeNull()
    for (const [label, value] of [
      ["Stroke", "Original"],
      ["Size", "64px"],
      ["Rotate", "0°"],
    ]) {
      const trigger = host.querySelector(`[aria-label="${label}"]`)!
      expect(trigger.getAttribute("aria-haspopup")).toBe("listbox")
      expect(trigger.textContent).toBe(value!)
    }
    await click("Copy SVG code")
    const originalSvg = copies.at(-1)
    await choose("Stroke", "2.5px")
    await choose("Size", "24px")
    await click("Copy SVG code")
    expect(copies.at(-1)).not.toBe(originalSvg)
    await choose("Stroke", "Original")
    await choose("Size", "64px")
    await click("Copy SVG code")
    expect(copies.at(-1)).toBe(originalSvg)

    for (const rotation of [90, 180, 270, 0]) {
      await choose("Rotate", `${rotation}°`)
      expect(host.querySelector('[aria-label="Rotate"]')?.textContent).toBe(
        `${rotation}°`
      )
      expect(
        host.querySelector<HTMLElement>("span.transition-transform")?.style
          .transform
      ).toBe(`rotate(${rotation}deg)`)
      await click("Copy SVG code")
      if (rotation === 0) expect(copies.at(-1)).toBe(originalSvg)
      else expect(copies.at(-1)).not.toBe(originalSvg)
    }
  })
})

test("preview settings update code and copies while JSON remains original", async () => {
  await withDetail(async ({ host, click, change, copies, choose }) => {
    await choose("Stroke", "2.5px")
    await choose("Size", "96px")
    await change(
      host.querySelector<HTMLInputElement>('input[type="color"]')!,
      "#ff0000"
    )
    await choose("Rotate", "90°")
    await click("React")
    await click("Copy React code")
    expect(copies.at(-1)).toContain("size={96}")
    expect(copies.at(-1)).toContain("strokeWidth={2.5}")
    expect(copies.at(-1)).toContain("rotate={1}")
    expect(copies.at(-1)).toContain('color="#ff0000"')
    await click("SVG")
    expect(host.querySelector('p.sr-only[role="status"]')?.textContent).toBe("")
    await click("Copy SVG code")
    const code = copies.at(-1)
    await click("Copy SVG")
    expect(copies.at(-1)).toBe(code)
    expect(code).toContain('width="96"')
    await click("JSON")
    await click("Copy JSON code")
    expect(JSON.parse(copies.at(-1)!)).toEqual(data)
  })
})

test("JSON displays and copies the original tuple file, and its URL points to the same source", async () => {
  await withDetail(async ({ host, click, copies, requests }) => {
    expect(requests).toEqual(["/icons/tabler/data/arrow-bar-up.json"])
    expect(
      host.querySelector('use[href="/icons/tabler/arrow-bar-up.svg#icon"]')
    ).not.toBeNull()
    await click("JSON")
    const code = host.querySelector(
      '[aria-label="JSON code"] code'
    )!.textContent!
    expect(JSON.parse(code)).toEqual(data)
    expect(code).toContain('"key": "source-path"')
    expect(code).toContain('"strokeWidth": "16"')
    expect(code).not.toContain('"body":')
    expect(code).not.toContain("<path")
    expect(host.querySelector('[role="tabpanel"]')?.textContent).toContain(
      "parseElementData"
    )
    await click("Copy JSON code")
    expect(copies.at(-1)).toBe(code)
    await click("Copy Icon JSON URL")
    expect(copies.at(-1)).toBe(new URL(requests[0]!, window.location.href).href)
    expect(requests).toHaveLength(1)
  })
})

test("invalid source JSON does not silently become a body export or enable copying", async () => {
  for (const invalid of [
    { width: 24, height: 24, body: "<path/>" },
    [],
    [["svg", { viewBox: "0 0 0 24", children: [["path", { d: "M0 0h24" }]] }]],
  ]) {
    await withDetail(
      async ({ host, click, copies }) => {
        expect(host.textContent).toContain("Unable to load icon data")
        expect(
          host.querySelector<HTMLButtonElement>('[aria-label="Copy SVG code"]')!
            .disabled
        ).toBe(true)
        await click("JSON")
        expect(
          host.querySelector<HTMLButtonElement>(
            '[aria-label="Copy JSON code"]'
          )!.disabled
        ).toBe(true)
        expect(
          host.querySelector('[aria-label="JSON code"]')?.textContent
        ).toContain("Unable to load icon data")
        expect(copies).toEqual([])
      },
      false,
      false,
      invalid
    )
  }
})

test("format tabs support arrow keys, Home/End and one keyboard tab stop", async () => {
  await withDetail(async ({ host }) => {
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    const key = async (value: string) => {
      await act(async () =>
        host
          .querySelector('[role="tab"][aria-selected="true"]')!
          .dispatchEvent(
            new window.KeyboardEvent("keydown", { key: value, bubbles: true })
          )
      )
    }
    await act(async () => tabs[0]!.focus())
    await key("ArrowRight")
    expect(document.activeElement?.textContent).toBe("React")
    await key("End")
    expect(document.activeElement?.textContent).toBe("JSON")
    await key("ArrowRight")
    expect(document.activeElement?.textContent).toBe("SVG")
    await key("ArrowLeft")
    expect(document.activeElement?.textContent).toBe("JSON")
    await key("Home")
    expect(document.activeElement?.textContent).toBe("SVG")
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1)
    expect(
      host.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")
    ).toBe(document.activeElement?.id)
  })
})

test("code viewport owns its height and resets scrolling when switching formats", async () => {
  await withDetail(async ({ host, click }) => {
    const viewport = host.querySelector<HTMLPreElement>(
      '[role="tabpanel"] pre'
    )!
    expect(viewport.tabIndex).toBe(0)
    expect(viewport.getAttribute("aria-label")).toBe("SVG code")
    expect(viewport.classList.contains("overflow-auto")).toBe(true)
    expect(viewport.classList.contains("min-h-40")).toBe(true)
    expect(viewport.parentElement?.classList.contains("min-h-52")).toBe(false)
    expect(viewport.querySelector("code")?.classList.contains("w-max")).toBe(
      true
    )
    viewport.scrollLeft = 300
    viewport.scrollTop = 100
    await click("React")
    const nextViewport = host.querySelector<HTMLPreElement>(
      '[role="tabpanel"] pre'
    )!
    expect(nextViewport).not.toBe(viewport)
    expect(nextViewport.getAttribute("aria-label")).toBe("React code")
    expect(nextViewport.scrollLeft).toBe(0)
    expect(nextViewport.scrollTop).toBe(0)
    expect(nextViewport.querySelector("code")?.textContent).toStartWith("<Icon")
  })
})

test("examples default to compact, preserve customization and copy the selected mode", async () => {
  await withDetail(async ({ host, click, copies, choose }) => {
    expect(host.querySelector('[aria-label="Example mode"]')).toBeNull()
    await click("Vue")
    expect(
      host
        .querySelector('[aria-label="Compact example"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true")
    await click("Copy Vue code")
    expect(copies.at(-1)).toStartWith("<Icon")
    expect(copies.at(-1)).not.toContain("<script")
    expect(copies.at(-1)).not.toContain("<template")
    const viewport = host.querySelector<HTMLPreElement>(
      '[role="tabpanel"] pre'
    )!
    viewport.scrollLeft = 200
    viewport.scrollTop = 100
    await click("Full example")
    expect(
      host
        .querySelector('[aria-label="Full example"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true")
    expect(host.querySelector('p.sr-only[role="status"]')?.textContent).toBe("")
    const fullViewport = host.querySelector<HTMLPreElement>(
      '[role="tabpanel"] pre'
    )!
    expect(fullViewport).not.toBe(viewport)
    expect(fullViewport.scrollLeft).toBe(0)
    expect(fullViewport.scrollTop).toBe(0)
    await choose("Size", "96px")
    await click("Copy Vue code")
    expect(copies.at(-1)).toContain("<script setup")
    expect(copies.at(-1)).toContain('import { Icon } from "@icones/vue"')
    expect(copies.at(-1)).toContain("<template>")
    expect(copies.at(-1)).toContain(':size="96"')
    expect(copies.at(-1)).not.toContain("IconConfig")
    await click("Compact example")
    await click("Copy Vue code")
    expect(copies.at(-1)).toStartWith("<Icon")
    expect(copies.at(-1)).toContain(':size="96"')
    await click("React")
    expect(
      host
        .querySelector('[aria-label="Compact example"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true")
    await click("Full example")
    await click("Svelte")
    expect(
      host
        .querySelector('[aria-label="Full example"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true")
    await click("JSON")
    expect(host.querySelector('[aria-label="Example mode"]')).toBeNull()
    await click("Copy JSON code")
    expect(JSON.parse(copies.at(-1)!)).toEqual(data)
  })
})

test("Vanilla Select switches markup, entry, copied content and code scroll", async () => {
  await withDetail(async ({ host, click, copies, closeCount }) => {
    await click("Vanilla")
    const select = host.querySelector<HTMLButtonElement>(
      '[aria-label="Vanilla element"]'
    )!
    expect(select.tagName).toBe("BUTTON")
    expect(select.getAttribute("aria-haspopup")).toBe("listbox")
    expect(select.textContent).toBe("Web Component (<icones-icon>)")
    expect(
      host.querySelector('a[href^="/guide/vanilla/"]')?.getAttribute("href")
    ).toBe("/guide/vanilla/web/getting-started")
    await click("Copy Vanilla code")
    expect(copies.at(-1)).toStartWith("<icones-icon")
    const viewport = host.querySelector<HTMLPreElement>(
      '[role="tabpanel"] pre'
    )!
    viewport.scrollLeft = 100
    viewport.scrollTop = 50
    await click("Vanilla element")
    expect(select.getAttribute("aria-expanded")).toBe("true")
    expect(
      host.ownerDocument
        .getElementById(select.getAttribute("aria-controls")!)
        ?.querySelector('[role="option"][aria-selected="true"]')?.textContent
    ).toBe("Web Component (<icones-icon>)")
    await click("Standard element (<i>)")
    expect(select.textContent).toBe("Standard element (<i>)")
    expect(select.getAttribute("aria-expanded")).toBe("false")
    expect(host.ownerDocument.activeElement).toBe(select)
    const next = host.querySelector<HTMLPreElement>('[role="tabpanel"] pre')!
    expect(next).not.toBe(viewport)
    expect(next.scrollLeft).toBe(0)
    expect(next.scrollTop).toBe(0)
    expect(host.querySelector('p.sr-only[role="status"]')?.textContent).toBe("")
    await click("Copy Vanilla code")
    expect(copies.at(-1)).toStartWith("<i\n")
    expect(copies.at(-1)).toContain('icon-name="tabler:arrow-bar-up"')
    expect(copies.at(-1)).not.toContain("<script")
    await click("Full example")
    await click("Copy Vanilla code")
    expect(copies.at(-1)).toContain("@icones/vanilla/standard-element")
    expect(copies.at(-1)).not.toContain("@icones/vanilla/web-element")
    expect(
      host.querySelector('a[href^="/guide/vanilla/"]')?.getAttribute("href")
    ).toBe("/guide/vanilla/standard/getting-started")
    const pressKey = async (key: string) => {
      await act(async () => {
        host.ownerDocument.activeElement!.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          })
        )
      })
    }
    select.focus()
    await pressKey("ArrowDown")
    expect(select.getAttribute("aria-expanded")).toBe("true")
    await pressKey("Escape")
    expect(select.getAttribute("aria-expanded")).toBe("false")
    expect(host.ownerDocument.activeElement).toBe(select)
    expect(closeCount()).toBe(0)
    expect(host.querySelector("dialog")?.open).toBe(true)
    await pressKey("ArrowDown")
    await pressKey("Home")
    await pressKey("Enter")
    expect(select.textContent).toBe("Web Component (<icones-icon>)")
    expect(select.getAttribute("aria-expanded")).toBe("false")
    await click("Copy Vanilla code")
    expect(copies.at(-1)).toContain("@icones/vanilla/web-element")
    await click("React")
    expect(host.querySelector('[aria-label="Vanilla element"]')).toBeNull()
  })
})

test("failed data loads disable export until retry succeeds", async () => {
  await withDetail(async ({ host, click }) => {
    expect(host.textContent).toContain("Unable to load icon data")
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="Copy SVG code"]')
        ?.disabled
    ).toBe(true)
    await click("Retry")
    expect(host.textContent).not.toContain("Unable to load icon data")
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="Copy SVG code"]')
        ?.disabled
    ).toBe(false)
  }, true)
})

test("clipboard failures leave code selectable and do not trigger a data retry", async () => {
  await withDetail(async ({ host, click, failClipboard }) => {
    failClipboard()
    await click("Copy SVG code")
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Select and copy the text manually"
    )
    expect(
      host.querySelector('[role="tabpanel"] pre code')?.textContent
    ).toContain("<svg")
    expect(
      [...host.querySelectorAll("button")].some(
        (button) => button.textContent === "Retry"
      )
    ).toBe(false)
  })
})
