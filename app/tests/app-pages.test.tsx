import { expect, test } from "bun:test"
import { act, type ReactNode } from "react"
import { JSDOM } from "jsdom"
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router"
import App from "./support/app.tsx"
import { Header } from "../src/app/components/header.tsx"
import { ActionLink } from "../src/shared/ui/action-link.tsx"
import { useCatalogFilters } from "../src/features/catalog/state.ts"
import { paths } from "../src/shared/routing/paths.ts"
import { IconConfig } from "@icones/react"
import {
  guidePages,
  guideHref,
  readGuidePath,
} from "../src/features/guide/content.ts"
import { createGalleryCatalogIndex } from "../src/features/catalog/query.ts"
import type { CatalogIcon } from "../src/features/catalog/protocol.ts"
import {
  packageInstall,
  packageManagers,
} from "../src/shared/integrations/package-install.ts"
import { packageManagerStorageKey } from "../src/shared/integrations/package-manager.ts"
import { getCollectionSources } from "../src/features/licenses/sources.ts"
import { publicSets } from "../src/features/catalog/types.ts"
import { InstallCodeBlock } from "../src/shared/code/install-code-block.tsx"
import { guideFrameworks } from "../src/shared/integrations/frameworks.ts"
import { mcpTutorialSteps } from "../src/features/mcp/content.ts"
import { dashboardIconSets } from "../src/features/home/components/dashboard-icon-sets.ts"
import {
  llmsScopes,
  llmsDocumentHref,
  llmsGuideHref,
  llmsScopeLabel,
} from "../src/features/llms/config.ts"

async function withApp(
  route: string,
  content: ReactNode,
  run: (
    host: HTMLElement,
    click: (selector: string) => Promise<void>,
    requests: string[]
  ) => Promise<void>,
  catalogIcons?: readonly CatalogIcon[],
  savedPackageManager?: string
) {
  const dom = new JSDOM(
    '<!doctype html><head><meta name="description" content="Icones"></head><body><div id="root"></div></body>',
    {
      url: "https://icons.test" + route,
      pretendToBeVisual: true,
    }
  )
  if (savedPackageManager !== undefined)
    dom.window.localStorage.setItem(
      packageManagerStorageKey,
      savedPackageManager
    )
  dom.window.scrollTo = () => {}
  dom.window.matchMedia = (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof dom.window.matchMedia
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  dom.window.HTMLDialogElement.prototype.close = function () {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new dom.window.Event("close"))
  }
  const requests: string[] = []
  const queryCatalog = catalogIcons && createGalleryCatalogIndex(catalogIcons)
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    fetch: async (input: RequestInfo | URL) => {
      requests.push(String(input))
      const url = new URL(String(input), dom.window.location.href)
      if (queryCatalog && url.pathname.endsWith("/catalog")) {
        const params = url.searchParams
        return Response.json(
          queryCatalog({
            set: params.get("set") ?? undefined,
            category: params.get("category") ?? undefined,
            variant: params.get("variant") ?? undefined,
            q: params.get("q") ?? undefined,
            suffix: params.get("suffix") ?? undefined,
            excludeSuffix: params.get("excludeSuffix") ?? undefined,
            offset: Number(params.get("offset") ?? 0),
            limit: Number(params.get("limit") ?? 100),
          })
        )
      }
      return Response.json({
        icons: [],
        total: 0,
        sets: [{ id: "tabler", count: 1 }],
        categories: [],
        nextOffset: null,
        offset: 0,
        limit: 100,
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
  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  }
  try {
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={[route]}>{content}</MemoryRouter>
      )
    )
    await flush()
    await run(
      host,
      async (selector) => {
        const target = host.querySelector<HTMLElement>(selector)
        if (!target) throw new Error("Missing click target: " + selector)
        await act(async () => target.click())
        await flush()
      },
      requests
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

test("homepage connects its workflow, framework tutorials and resource pages", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    expect(
      host.querySelector("#from-search-to-interface h2")?.textContent
    ).toBe("From finding an icon to using it.")
    expect(host.querySelector("#beyond-the-gallery h2")?.textContent).toBe(
      "The resources behind your icons."
    )
    const tutorials = host.querySelector(
      'nav[aria-label="Framework tutorials"]'
    )!
    expect(tutorials.querySelectorAll("a")).toHaveLength(guideFrameworks.length)
    expect(requests.every((url) => url.includes("catalog"))).toBe(true)
    await click(
      'nav[aria-label="Framework tutorials"] a[href="/guide/vue/getting-started"]'
    )
    expect(host.querySelector("h1")?.textContent).toBe("Getting started")
    expect(host.querySelector("#guide article pre")?.textContent).toContain(
      "@icones/vue"
    )
  })
})

test("homepage UI previews expose keyboard navigation without changing the page", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    const showcase = host.querySelector("#ui-examples")!
    expect(showcase.querySelectorAll("article")).toHaveLength(4)
    expect(
      host.querySelector('.hero-background a[href="#ui-examples"]')
    ).not.toBeNull()
    expect(showcase.querySelector('a[href="/icons?set=tabler"]')).not.toBeNull()
    const tabs = showcase.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    expect(tabs).toHaveLength(4)
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true")
    await click('#ui-examples [role="tab"]:nth-child(2)')
    expect(showcase.querySelector('[role="tabpanel"]')?.textContent).toContain(
      "Keep the conversation going."
    )
    for (const [key, expected] of [
      ["ArrowRight", 2],
      ["End", 3],
      ["ArrowRight", 0],
      ["ArrowLeft", 3],
      ["Home", 0],
    ] as const) {
      const selected = showcase.querySelector('[aria-selected="true"]')!
      await act(async () =>
        selected.dispatchEvent(
          new window.KeyboardEvent("keydown", { key, bubbles: true })
        )
      )
      expect(tabs[expected]!.getAttribute("aria-selected")).toBe("true")
      expect(document.activeElement).toBe(tabs[expected])
      expect([...tabs].filter((tab) => tab.tabIndex === 0)).toHaveLength(1)
      const panel = showcase.querySelector('[role="tabpanel"]')!
      expect(panel.id).toBe(tabs[expected]!.getAttribute("aria-controls")!)
      expect(panel.getAttribute("aria-labelledby")).toBe(tabs[expected]!.id)
    }
    expect(requests).toHaveLength(1)
    expect(host.querySelector("#catalog")).toBeNull()
  })
})

test("homepage dashboard layers are accessible and its theme stays local to the preview", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    const figure = host.querySelector(".dashboard-showcase")!
    const front = figure.querySelector<HTMLElement>(
      '[data-dashboard-interactive="true"]'
    )!
    const back = figure.querySelector(".dashboard-layer-back")!
    const rootClass = document.documentElement.className
    const storage = JSON.stringify(window.localStorage)
    expect(figure.querySelectorAll(".dashboard-panel")).toHaveLength(2)
    expect(back.getAttribute("aria-hidden")).toBe("true")
    expect(back.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(
      0
    )
    expect(front.dataset.dashboardTheme).toBe("dark")
    expect(front.querySelectorAll(".dashboard-nav button")).toHaveLength(6)
    for (const button of front.querySelectorAll(".dashboard-nav button")) {
      expect(button.getAttribute("aria-label")).toBeTruthy()
      expect(button.querySelector("svg")).not.toBeNull()
    }
    expect(
      front.querySelector('a[aria-label="Usage guide"]')?.getAttribute("href")
    ).toBe("/guide")
    await click(".dashboard-theme-picker button:first-child")
    expect(front.dataset.dashboardTheme).toBe("light")
    expect(
      back
        .querySelector(".dashboard-panel")
        ?.getAttribute("data-dashboard-theme")
    ).toBe("dark")
    expect(
      figure
        .querySelector(".dashboard-theme-picker button:first-child")
        ?.getAttribute("aria-pressed")
    ).toBe("true")
    await click(".dashboard-theme-picker button:last-child")
    expect(front.dataset.dashboardTheme).toBe("dark")
    expect(document.documentElement.className).toBe(rootClass)
    expect(JSON.stringify(window.localStorage)).toBe(storage)
    expect(requests).toHaveLength(1)
  })
})

test("dashboard icon set buttons switch both panels without resetting the preview", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    const figure = host.querySelector("#dashboard-preview")!
    const picker = figure.querySelector('[aria-label="Dashboard icon set"]')!
    const buttons = picker.querySelectorAll<HTMLButtonElement>("button")
    expect([...buttons].map((button) => button.textContent)).toEqual(
      dashboardIconSets.map((set) => set.label)
    )
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("true")
    expect(buttons[0]!.getAttribute("aria-controls")).toBe("dashboard-stage")
    await click('.dashboard-nav button[aria-label="Customers"]')
    await click(
      '[data-dashboard-interactive="true"] .dashboard-period button:first-child'
    )
    await click(".dashboard-theme-picker button:first-child")
    const front = figure.querySelector<HTMLElement>(
      '[data-dashboard-interactive="true"]'
    )!
    const chart = front
      .querySelector('[data-series="current"]')!
      .getAttribute("d")
    const storage = JSON.stringify(window.localStorage)
    for (const [index, set] of dashboardIconSets.entries()) {
      await click(`.dashboard-set-picker button:nth-child(${index + 1})`)
      expect(picker.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1)
      expect(buttons[index]!.getAttribute("aria-pressed")).toBe("true")
      for (const panel of figure.querySelectorAll<HTMLElement>(
        ".dashboard-panel"
      )) {
        expect(panel.dataset.dashboardIconSet).toBe(set.id)
        const names = new Set(
          [...panel.querySelectorAll("svg[data-icon]")].map((svg) =>
            svg.getAttribute("data-icon")!
          )
        )
        expect(names.size).toBe(13)
        for (const name of names) {
          expect(name.startsWith(set.id + ":")).toBe(true)
          const [family, slug] = name.split(":")
          expect(
            await Bun.file(
              new URL(
                `../../packages/icons/${family}/data/${slug}.json`,
                import.meta.url
              )
            ).exists()
          ).toBe(true)
        }
      }
      expect(front.querySelector("h4")?.textContent).toBe("Customers")
      expect(front.querySelector("dd")?.textContent).toBe("223")
      expect(
        front.querySelector('[data-series="current"]')?.getAttribute("d")
      ).toBe(chart)
      expect(front.dataset.dashboardTheme).toBe("light")
      expect(
        figure
          .querySelector(".dashboard-layer-back .dashboard-panel")
          ?.getAttribute("data-dashboard-theme")
      ).toBe("dark")
    }
    expect(requests).toHaveLength(1)
    expect(JSON.stringify(window.localStorage)).toBe(storage)
  })
})

test("homepage dashboard sections and date ranges update metrics and chart without navigation", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    const front = host.querySelector('[data-dashboard-interactive="true"]')!
    const initialPath = front
      .querySelector('[data-series="current"]')
      ?.getAttribute("d")
    expect(front.querySelector("h4")?.textContent).toBe("Overview")
    expect(front.querySelector("dd")?.textContent).toBe("$48,560")
    await click('.dashboard-nav button[aria-label="Orders"]')
    expect(front.querySelector("h4")?.textContent).toBe("Orders")
    expect(front.querySelector("dd")?.textContent).toBe("1,284")
    expect(front.querySelector(".dashboard-chart h5")?.textContent).toBe(
      "Order activity"
    )
    const ordersPath = front
      .querySelector('[data-series="current"]')
      ?.getAttribute("d")
    expect(ordersPath).not.toBe(initialPath)
    await click(
      '[data-dashboard-interactive="true"] .dashboard-period button:first-child'
    )
    expect(front.querySelector("dd")?.textContent).toBe("321")
    expect(
      front.querySelector(".dashboard-chart-svg")?.getAttribute("aria-label")
    ).toContain("Last 7 days")
    expect(
      front.querySelector('[data-series="current"]')?.getAttribute("d")
    ).not.toBe(ordersPath)
    for (const [section, metric] of [
      ["Revenue", "Gross revenue"],
      ["Customers", "Active customers"],
      ["Reports", "Completed reports"],
      ["Payouts", "Paid out"],
    ]) {
      await click(`.dashboard-nav button[aria-label="${section}"]`)
      expect(front.querySelector("h4")?.textContent).toBe(section!)
      expect(front.querySelector("dt")?.textContent).toBe(metric!)
      expect(
        front.querySelectorAll('.dashboard-nav [aria-pressed="true"]')
      ).toHaveLength(1)
    }
    expect(requests).toHaveLength(1)
    expect(host.querySelector(".hero-background")).not.toBeNull()
  })
})

test("homepage favorites and switches are reversible, local-only previews", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    const initialRequests = [...requests]
    const initialStorage = JSON.stringify(window.localStorage)
    const like = host.querySelector('[aria-label="Like this example"]')!
    const save = host.querySelector('[aria-label="Save this example"]')!
    expect(like.getAttribute("aria-pressed")).toBe("false")
    expect(like.textContent).toBe("24")
    await click('[aria-label="Like this example"]')
    expect(like.getAttribute("aria-pressed")).toBe("true")
    expect(like.textContent).toBe("25")
    expect(
      like.querySelector('[data-icon="tabler:heart-filled"]')
    ).not.toBeNull()
    await click('[aria-label="Like this example"]')
    expect(like.textContent).toBe("24")
    expect(like.getAttribute("aria-pressed")).toBe("false")
    await click('[aria-label="Save this example"]')
    expect(save.textContent).toBe("Saved")
    expect(save.getAttribute("aria-pressed")).toBe("true")
    await click('[aria-label="Save this example"]')
    expect(save.textContent).toBe("Save")
    expect(save.getAttribute("aria-pressed")).toBe("false")
    const switches = host.querySelectorAll('#ui-examples [role="switch"]')
    expect(
      [...switches].map((control) => control.getAttribute("aria-checked"))
    ).toEqual(["true", "false", "true"])
    const expectSwitchIcons = (names: string[]) => {
      expect(
        [...switches].map((control) => {
          const icon = control.querySelector("svg")!
          // A 4-unit stroke in a 24-unit viewBox renders at 2px at this size.
          expect(icon.getAttribute("width")).toBe("12")
          expect(icon.getAttribute("stroke-width")).toBe("4")
          return icon.getAttribute("data-icon")
        })
      ).toEqual(names)
    }
    expectSwitchIcons(["tabler:check", "tabler:x", "tabler:check"])
    await click('[role="switch"][aria-label="Email digest"]')
    expect(switches[1]!.getAttribute("aria-checked")).toBe("true")
    expect(host.querySelector("#ui-examples")?.textContent).toContain(
      "3 notification options enabled"
    )
    await click('[role="switch"][aria-label="Push notifications"]')
    await click('[role="switch"][aria-label="Email digest"]')
    await click('[role="switch"][aria-label="Notification sounds"]')
    expect(
      [...switches].every(
        (control) => control.getAttribute("aria-checked") === "false"
      )
    ).toBe(true)
    expectSwitchIcons(["tabler:x", "tabler:x", "tabler:x"])
    expect(host.querySelector("#ui-examples")?.textContent).toContain(
      "0 notification options enabled"
    )
    expect(requests).toEqual(initialRequests)
    expect(JSON.stringify(window.localStorage)).toBe(initialStorage)
  })
})

test("homepage note actions update the preview and support dismissal and focus return", async () => {
  await withApp(paths.home, <App />, async (host, click) => {
    const trigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Note actions"]'
    )!
    const menu = host.querySelector<HTMLElement>(
      '[aria-label="Actions for this note"]'
    )!
    expect(menu.hidden).toBe(false)
    await click('[aria-label="Actions for this note"] button:first-child')
    expect(menu.hidden).toBe(true)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(trigger)
    expect(host.querySelector("#ui-examples")?.textContent).toContain(
      "Note pinned to the top."
    )
    await click('[aria-label="Note actions"]')
    expect(menu.textContent).toContain("Unpin note")
    await click('[aria-label="Actions for this note"] button:nth-child(2)')
    expect(host.querySelector("#ui-examples")?.textContent).toContain(
      "Note marked as read."
    )
    await click('[aria-label="Note actions"]')
    await click('[aria-label="Actions for this note"] button:last-child')
    expect(host.querySelector("#ui-examples")?.textContent).toContain(
      "This note is hidden in the preview."
    )
    await click('[aria-label="Note actions"]')
    expect(menu.textContent).toContain("Show note")
    await click('[aria-label="Actions for this note"] button:last-child')
    expect(host.querySelector("#ui-examples")?.textContent).toContain(
      "Note visible again."
    )
    await click('[aria-label="Note actions"]')
    await act(async () =>
      menu.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    )
    expect(menu.hidden).toBe(true)
    expect(document.activeElement).toBe(trigger)
    await click('[aria-label="Note actions"]')
    await act(async () =>
      document.body.dispatchEvent(
        new window.MouseEvent("pointerdown", { bubbles: true })
      )
    )
    expect(menu.hidden).toBe(true)
  })
})

for (const [route, section] of [
  [paths.packages, "package-roles"],
  [paths.llms, "using-ai-documentation"],
  [paths.mcp, "mcp-availability"],
  [paths.licenses, "reading-source-notices"],
]) {
  test(`${route} provides page-specific usage guidance`, async () => {
    await withApp(route!, <App />, async (host) => {
      expect(host.querySelectorAll(`#${section} article`)).toHaveLength(3)
      expect(host.querySelector(`#${section} h2`)?.textContent).toBeTruthy()
    })
  })
}

test("package selection links to matching setup and distinguishes data from rendering", async () => {
  await withApp(paths.packages, <App />, async (host, click) => {
    for (const [name, page, framework, detail] of [
      ["Vite", "getting-started", "react", "disables API fallback"],
      ["Vue", "getting-started", "vue", "Named icons use"],
    ]) {
      await click(`button[aria-label="View ${name} package"]`)
      const example = host.querySelector("#package-example")!
      expect(example.textContent).toContain(detail!)
      expect(example.querySelector("a")?.getAttribute("href")).toBe(
        `/guide/${framework}/${page}`
      )
    }
  })
})

test("LLMs prioritizes document links and keeps usage guidance directly reachable", async () => {
  await withApp(paths.llms, <App />, async (host, click) => {
    const documents = host.querySelector("#llms-documents")!
    const usage = host.querySelector("#using-ai-documentation")!
    expect(documents.compareDocumentPosition(usage) & 4).toBe(4)
    await click('main a[href="/solutions/llms#using-ai-documentation"]')
    expect(host.querySelector("#using-ai-documentation h2")?.textContent).toBe(
      "Give your assistant a focused starting point."
    )
    expect(host.querySelectorAll("#llms-documents article")).toHaveLength(18)
  })
})

test("back-to-top appears after scrolling, preserves the route and respects reduced motion", async () => {
  for (const reducedMotion of [false, true]) {
    const route = "/guide/vue/color#preserve-anchor"
    await withApp(route, <App />, async (host, click) => {
      const selector = 'button[aria-label="Back to top"]'
      const view = host.ownerDocument.defaultView!
      const scroll = (top: number) => {
        Object.defineProperty(window, "scrollY", {
          configurable: true,
          value: top,
        })
        window.dispatchEvent(new view.Event("scroll"))
      }
      expect(host.querySelector(selector)).toBeNull()
      await act(async () => scroll(400))
      expect(host.querySelector(selector)).toBeNull()
      await act(async () => scroll(401))
      const button = host.querySelector<HTMLButtonElement>(selector)!
      expect(button.title).toBe("Back to top")
      expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull()

      const matchMedia = window.matchMedia
      window.matchMedia = (query) => ({
        ...matchMedia(query),
        matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
      })
      const calls: ScrollToOptions[] = []
      window.scrollTo = (options?: number | ScrollToOptions) => {
        if (typeof options !== "object")
          throw new Error("Expected scroll options")
        calls.push(options)
        scroll(options.top ?? 0)
      }
      button.focus()
      await click(selector)
      expect(calls).toEqual([
        { top: 0, left: 0, behavior: reducedMotion ? "instant" : "smooth" },
      ])
      expect(host.querySelector(selector)).toBeNull()
      expect(document.activeElement).toBe(host.querySelector("#top a"))
      expect(
        window.location.pathname + window.location.search + window.location.hash
      ).toBe(route)

      await act(async () => scroll(900))
      expect(host.querySelector(selector)).not.toBeNull()
      await act(async () => scroll(300))
      expect(host.querySelector(selector)).toBeNull()
    })
  }
})

test("getting started keeps framework and Vite installation after introduction pages are removed", async () => {
  for (const { id } of guideFrameworks) {
    const route =
      id === "vanilla"
        ? "/guide/vanilla/web/getting-started"
        : "/guide/" + id + "/getting-started"
    await withApp(route, <App />, async (host) => {
      const section = host.querySelector(
        'section[aria-labelledby="guide-getting-started-add-the-adapter"]'
      )!
      expect(section.querySelector("pre code")?.textContent).toBe(
        packageInstall("@icones/" + id) +
          "\n" +
          packageInstall("@icones/vite", true, true)
      )
      const navigation = host.querySelector("#guide-navigation")!
      expect(navigation.querySelector("h2")?.textContent).toBe(
        "Rendering fundamentals"
      )
      expect(navigation.querySelector('a[href$="/installation"]')).toBeNull()
      expect(navigation.querySelector('a[href$="/what-is-icones"]')).toBeNull()
    })
  }
})

test("shared install blocks synchronize package managers and keep unique accessible targets", async () => {
  await withApp(
    paths.guide,
    <article>
      {guideFrameworks.map(({ id }) => (
        <InstallCodeBlock
          key={id}
          development
          dependencies={[
            { name: "@icones/" + id },
            { name: "@icones/vite", dev: true },
          ]}
        />
      ))}
    </article>,
    async (host) => {
      const panels = [
        ...host.querySelectorAll<HTMLElement>('article [role="tabpanel"]'),
      ]
      expect(new Set(panels.map((panel) => panel.id)).size).toBe(6)
      const tabs = host
        .querySelector('[role="tablist"]')!
        .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      for (const [index, manager] of packageManagers.entries()) {
        await act(async () => tabs[index]!.click())
        for (const [panelIndex, panel] of panels.entries()) {
          const name = guideFrameworks[panelIndex]!.id
          expect(panel.textContent).toBe(
            packageInstall("@icones/" + name, true, false, manager) +
              "\n" +
              packageInstall("@icones/vite", true, true, manager)
          )
          const selected = document.getElementById(
            panel.getAttribute("aria-labelledby")!
          )!
          expect(selected.getAttribute("aria-controls")).toBe(panel.id)
          expect(selected.getAttribute("aria-selected")).toBe("true")
          expect(
            selected.classList.contains("aria-selected:bg-primary/8")
          ).toBe(true)
          expect(selected.classList.contains("rounded-md")).toBe(true)
          expect(selected.className).not.toContain("border-")
        }
      }
      expect(host.querySelector("article")?.textContent).toContain(
        "Deno stores development dependencies"
      )
    }
  )
})

test("install commands use tabs without window chrome and support keyboard navigation and copy feedback", async () => {
  await withApp(
    "/guide/react/getting-started",
    <App />,
    async (host, click) => {
      const tablist = host.querySelector<HTMLElement>(
        'article [role="tablist"][aria-label="Package manager"]'
      )!
      const tabs = [
        ...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ]
      expect(
        tabs.map(
          (tab) => tab.querySelector("[lang] > span:last-child")?.textContent
        )
      ).toEqual([...packageManagers])
      const panelId = tabs[0]!.getAttribute("aria-controls")!
      const panel = document.getElementById(panelId)!
      const card = panel.parentElement!
      expect(card.textContent).not.toContain("Terminal")
      expect(card.querySelector(".bg-red-400\\/80")).toBeNull()
      expect(panel.getAttribute("role")).toBe("tabpanel")
      expect(panel.getAttribute("tabindex")).toBe("0")
      const copies: string[] = []
      let blocked = false
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (code: string) => {
            if (blocked) throw new Error("Blocked")
            copies.push(code)
          },
        },
      })
      for (const [index, manager] of packageManagers.entries()) {
        await act(async () => tabs[index]!.click())
        expect(panel.textContent).toBe(
          packageInstall("@icones/react", true, false, manager) +
            "\n" +
            packageInstall("@icones/vite", true, true, manager)
        )
        expect(tablist.querySelectorAll('[aria-selected="true"]')).toHaveLength(
          1
        )
        expect(tabs.filter((tab) => tab.tabIndex === 0)).toEqual([tabs[index]!])
        expect(panel.getAttribute("aria-labelledby")).toBe(tabs[index]!.id)
        await click('article button[aria-label="Copy code"]')
        expect(copies.at(-1)).toBe(panel.textContent)
        expect(card.querySelector('[aria-label="Code copied"]')).not.toBeNull()
      }
      const key = async (value: string) => {
        await act(async () =>
          tablist.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: value, bubbles: true })
          )
        )
      }
      await key("Home")
      expect(document.activeElement).toBe(tabs[0])
      expect(card.querySelector('[aria-label="Code copied"]')).toBeNull()
      await key("ArrowLeft")
      expect(document.activeElement).toBe(tabs.at(-1)!)
      await key("ArrowRight")
      expect(document.activeElement).toBe(tabs[0])
      await key("End")
      expect(document.activeElement).toBe(tabs.at(-1)!)
      await key("Home")
      blocked = true
      await click('article button[aria-label="Copy code"]')
      expect(card.querySelector('[aria-live="polite"]')?.textContent).toContain(
        "Clipboard is unavailable"
      )
      expect(panel.textContent).toContain("npm install @icones/react")
    }
  )
})

test("multiple install panels share choices but keep unique accessible tab targets", async () => {
  await withApp(
    "/",
    <IconConfig api={false}>
      <InstallCodeBlock dependencies={[{ name: "@icones/react" }]} />
      <InstallCodeBlock dependencies={[{ name: "@icones/vue" }]} />
    </IconConfig>,
    async (host) => {
      const panels = [
        ...host.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
      ]
      expect(new Set(panels.map((panel) => panel.id)).size).toBe(2)
      const tab = host.querySelector<HTMLButtonElement>('[role="tab"]')!
      await act(async () => tab.click())
      for (const panel of panels) {
        expect(panel.textContent).toStartWith("npm install")
        const selected = document.getElementById(
          panel.getAttribute("aria-labelledby")!
        )!
        expect(selected.getAttribute("aria-controls")).toBe(panel.id)
        expect(selected.getAttribute("aria-selected")).toBe("true")
      }
    }
  )
})

test("installation manager choices update commands, copying and saved preferences", async () => {
  await withApp(
    "/guide/react/getting-started",
    <App />,
    async (host, click) => {
      const copies: string[] = []
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            copies.push(value)
          },
        },
      })
      const trigger = 'button[aria-label="Package manager"]'
      expect(host.querySelector(trigger)?.textContent).toContain("bun")
      expect(
        host
          .querySelector(trigger)
          ?.parentElement?.parentElement?.classList.contains("w-fit")
      ).toBe(true)
      for (const [index, manager] of packageManagers.entries()) {
        await click(trigger)
        const id = host.querySelector(trigger)!.getAttribute("aria-controls")!
        const menu = document.getElementById(id)!
        const panel = menu.parentElement!.parentElement!
        expect(panel.classList.contains("w-40")).toBe(true)
        expect(panel.classList.contains("min-w-full")).toBe(false)
        expect(panel.classList.contains("max-w-[calc(100vw-2rem)]")).toBe(true)
        expect(menu.querySelectorAll('[role="option"]')).toHaveLength(5)
        await click(`[id="${id}"] li:nth-child(${index + 1}) button`)
        const expected =
          packageInstall("@icones/react", true, false, manager) +
          "\n" +
          packageInstall("@icones/vite", true, true, manager)
        expect(host.querySelector("article pre code")?.textContent).toBe(
          expected
        )
        expect(host.querySelector(trigger)?.getAttribute("aria-expanded")).toBe(
          "false"
        )
        expect(window.localStorage.getItem(packageManagerStorageKey)).toBe(
          manager
        )
        await click('article button[aria-label="Copy code"]')
        expect(copies.at(-1)).toBe(expected)
      }
      await click('#guide-navigation a[href="/guide/react/overview"]')
      expect(host.querySelector("h1")?.textContent).toBe("React overview")
      await click('#guide-navigation a[href="/guide/react/getting-started"]')
      expect(host.querySelector(trigger)?.textContent).toContain("deno")
      expect(host.querySelector("article pre code")?.textContent).toContain(
        "deno add npm:@icones/react"
      )
      expect(copies).toHaveLength(5)
    }
  )
})

for (const removed of ["vlt", "vp", "nub", "ni"]) {
  test(`saved ${removed} preference falls back to Bun with only five install choices`, async () => {
    await withApp(
      "/guide/react/getting-started",
      <App />,
      async (host, click) => {
        const selector = 'button[aria-label="Package manager"]'
        expect(host.querySelector(selector)?.textContent).toContain("bun")
        expect(host.querySelector("article pre code")?.textContent).toStartWith(
          "bun add"
        )
        await click(selector)
        const id = host.querySelector(selector)!.getAttribute("aria-controls")!
        const options = document
          .getElementById(id)!
          .querySelectorAll('[role="option"]')
        expect([...options].map((option) => option.textContent)).toEqual([
          "npm",
          "pnpm",
          "yarn",
          "bun",
          "deno",
        ])
        expect(
          [...options].find(
            (option) => option.getAttribute("aria-selected") === "true"
          )?.textContent
        ).toBe("bun")
      },
      undefined,
      removed
    )
  })
}

test("installation manager supports keyboard selection, storage synchronization and invalid preferences", async () => {
  await withApp(
    "/guide/react/getting-started",
    <App />,
    async (host, click) => {
      const trigger = host.querySelector<HTMLButtonElement>(
        'button[aria-label="Package manager"]'
      )!
      async function key(value: string) {
        await act(async () => {
          trigger.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: value, bubbles: true })
          )
        })
      }
      trigger.focus()
      await key("ArrowDown")
      await key("Home")
      await key("Enter")
      expect(host.querySelector("article pre code")?.textContent).toContain(
        "npm install @icones/react"
      )
      await click('button[aria-label="Package manager"]')
      await key("Escape")
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
      for (const [stored, expected] of [
        ["pnpm", "pnpm add"],
        ["unknown", "bun add"],
        ["vlt", "bun add"],
        ["vp", "bun add"],
        ["nub", "bun add"],
        ["ni", "bun add"],
      ]) {
        await act(async () => {
          window.localStorage.setItem(packageManagerStorageKey, stored!)
          window.dispatchEvent(
            new window.StorageEvent("storage", {
              key: packageManagerStorageKey,
              storageArea: window.localStorage,
              newValue: stored,
            })
          )
        })
        expect(host.querySelector("article pre code")?.textContent).toStartWith(
          expected!
        )
      }
    }
  )
})

test("installation manager remains usable across page remounts when storage is blocked", async () => {
  await withApp(
    "/guide/react/getting-started",
    <App />,
    async (host, click) => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("Storage disabled")
        },
      })
      const trigger = 'button[aria-label="Package manager"]'
      await click(trigger)
      const id = host.querySelector(trigger)!.getAttribute("aria-controls")!
      await click(`[id="${id}"] li:nth-child(2) button`)
      expect(host.querySelector("article pre code")?.textContent).toStartWith(
        "pnpm add"
      )
      await click('#guide-navigation a[href="/guide/react/color"]')
      expect(host.querySelector(trigger)).toBeNull()
      await click('#guide-navigation a[href="/guide/react/getting-started"]')
      expect(host.querySelector("article pre code")?.textContent).toStartWith(
        "pnpm add"
      )
    }
  )
})

for (const [route, heading] of [
  [paths.guide, "React overview"],
  [paths.packages, "One icon system. Your stack."],
  [paths.llms, "LLMs"],
  [paths.licenses, "Licenses"],
  [paths.mcp, "MCP Server"],
  ["/missing", "This page is not in the collection."],
]) {
  test("direct route renders a separate page: " + route, async () => {
    await withApp(route, <App />, async (host, _click, requests) => {
      expect(host.querySelector("h1")?.textContent).toBe(heading)
      expect(host.querySelectorAll("main")).toHaveLength(1)
      expect(host.querySelector("#catalog")).toBeNull()
      expect(host.querySelector(".hero-background")).toBeNull()
      expect(host.querySelector("#top > div > a")?.textContent).toBe("Icones")
      expect(host.querySelector("#top nav")).not.toBeNull()
      expect(host.querySelector("#top")?.classList.contains("border-b")).toBe(
        true
      )
      expect(requests).toHaveLength(0)
      if (route !== "/missing")
        expect(
          host.querySelector('nav a[aria-current="page"]')?.getAttribute("href")
        ).toBe(route)
      else expect(host.querySelector('nav a[aria-current="page"]')).toBeNull()
      expect(document.title).toContain("Icones")
      for (const code of host.querySelectorAll("pre code")) {
        expect(code.textContent).not.toContain("IconConfig")
        expect(code.textContent).not.toContain("export function")
      }
    })
  })
}

test("Guide provides a sidebar, one article and a matching table of contents for every topic", async () => {
  await withApp(
    paths.guide,
    <GuideHistory />,
    async (host, click, requests) => {
      expect(host.querySelectorAll("#guide > aside")).toHaveLength(2)
      expect(host.querySelectorAll("#guide > article")).toHaveLength(1)
      expect(host.querySelectorAll("#guide-navigation a")).toHaveLength(15)
      expect(
        [...host.querySelectorAll("#guide-navigation h2")].map(
          (node) => node.textContent
        )
      ).toEqual(["Rendering fundamentals", "Framework", "Basics", "Advanced"])
      const groupedLists = [
        ...host.querySelectorAll("#guide-navigation > div > ul"),
      ].filter((list) => list.classList.contains("border-l"))
      expect(groupedLists).toHaveLength(3)
      for (const list of groupedLists) {
        expect(list.classList.contains("ml-[calc(0.5rem-0.5px)]")).toBe(true)
        expect(list.classList.contains("pl-[calc(0.75rem+0.5px)]")).toBe(true)
      }
      for (const item of host.querySelectorAll(
        "#guide-navigation h2, #guide-navigation a"
      )) {
        const icon = item.querySelector("svg")!
        expect(icon).not.toBeNull()
        expect(icon.getAttribute("width")).toBe("16")
        expect(icon.getAttribute("height")).toBe("16")
        expect(icon.closest('[aria-hidden="true"]')).not.toBeNull()
        expect(item.textContent?.trim()).not.toBe("")
      }
      for (const page of guidePages) {
        const link = [
          ...host.querySelectorAll<HTMLAnchorElement>("#guide-navigation a"),
        ].find((link) => link.textContent?.trim() === page.title)!
        expect(new URL(link.href).pathname).toBe(guideHref(page.id, "react"))
        expect(new URL(link.href).search).toBe("")
        await click(
          '#guide-navigation a[href="' + link.getAttribute("href") + '"]'
        )
        expect(host.querySelector("#guide-title")?.textContent).toBe(
          page.id === "overview" ? "React overview" : page.title
        )
        expect(
          host.querySelector('[data-testid="guide-location"]')?.textContent
        ).toBe(guideHref(page.id, "react"))
        expect(document.title).toBe(
          host.querySelector("#guide-title")!.textContent + " – Icones"
        )
        expect(
          host.querySelectorAll('#guide-navigation a[aria-current="page"]')
        ).toHaveLength(1)
        const contents = host.querySelectorAll(
          'nav[aria-label="On this page"] a'
        )
        const headings = host.querySelectorAll("#guide article section h2")
        expect(contents).toHaveLength(headings.length)
        for (const link of contents) {
          const id = link.getAttribute("href")!.split("#")[1]!
          expect(document.getElementById(id)?.textContent).toBe(
            link.textContent
          )
        }
        if (page.id === "icon-config")
          expect(
            host.querySelector("#guide article pre")?.textContent
          ).toContain("<IconConfig")
        else
          for (const code of host.querySelectorAll("#guide article pre code"))
            expect(code.textContent).not.toContain("IconConfig")
      }
      expect(requests).toHaveLength(0)
    }
  )
})

function GuideHistory() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <>
      <App />
      <output data-testid="guide-location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
      <button id="guide-back" onClick={() => void navigate(-1)}>
        Back
      </button>
      <button id="guide-forward" onClick={() => void navigate(1)}>
        Forward
      </button>
    </>
  )
}

test("old Guide bookmarks replace query routes without losing anchors or unrelated parameters", async () => {
  for (const [legacy, destination, title] of [
    ["/guide", "/guide/react/overview", "React overview"],
    [
      "/guide?page=stroke-width&framework=svelte#guide-stroke-width-normalized",
      "/guide/svelte/stroke-width#guide-stroke-width-normalized",
      "Stroke Width",
    ],
    [
      "/guide/?page=icon-config&framework=vanilla&element=standard&utm_source=bookmark#guide-icon-config-local-sources",
      "/guide/vanilla/standard/icon-config?utm_source=bookmark#guide-icon-config-local-sources",
      "IconConfig",
    ],
    ["/guide/vue/sizing/index.html", "/guide/vue/sizing", "Sizing"],
  ]) {
    await withApp(legacy!, <GuideHistory />, async (host) => {
      expect(
        host.querySelector('[data-testid="guide-location"]')?.textContent
      ).toBe(destination!)
      expect(host.querySelector("#guide-title")?.textContent).toBe(title!)
    })
  }
})

test("unknown Guide articles render a missing page rather than the introduction", async () => {
  for (const route of [
    "/guide/svelte/typo",
    "/guide/unknown/color",
    "/guide/vanilla/invalid/color",
  ]) {
    await withApp(route, <App />, async (host) => {
      expect(host.querySelector("#guide")).toBeNull()
      expect(host.querySelector("h1")?.textContent).toBe(
        "This page is not in the collection."
      )
      expect(document.title).toBe("Page not found – Icones")
    })
  }
})

test("Guide framework selection, deep links and history preserve the current topic", async () => {
  await withApp("/guide/vue/color", <GuideHistory />, async (host, click) => {
    const select = host.querySelector<HTMLButtonElement>(
      '#guide-framework button[aria-haspopup="listbox"]'
    )!
    expect(host.querySelector("#guide-framework select")).toBeNull()
    expect(select.textContent).toBe("Vue")
    expect(select.querySelector('svg[data-icon="brand:vue"]')).not.toBeNull()
    expect(host.querySelector("#guide-title")?.textContent).toBe("Color")
    expect(host.querySelector("#guide article pre")?.textContent).toContain(
      "@icones/vue"
    )
    await click('#guide-framework button[aria-haspopup="listbox"]')
    const options = [
      ...host.querySelectorAll<HTMLButtonElement>(
        '#guide-framework [role="option"]'
      ),
    ]
    expect(options.map((option) => option.textContent)).toEqual(
      guideFrameworks.map(({ name }) => name)
    )
    expect(
      options.map((option) =>
        option.querySelector("svg")?.getAttribute("data-icon")
      )
    ).toEqual([
      "brand:react",
      "brand:vue",
      "brand:svelte",
      "brand:solidjs",
      "brand:astro",
      "brand:javascript",
    ])
    for (const option of options) {
      expect(
        option.querySelector("svg")?.closest('[aria-hidden="true"]')
      ).not.toBeNull()
    }
    expect(
      options.find((option) => option.getAttribute("aria-selected") === "true")
        ?.textContent
    ).toBe("Vue")
    await act(async () =>
      options.find((option) => option.textContent === "Svelte")!.click()
    )
    expect(select.getAttribute("aria-expanded")).toBe("false")
    expect(select.querySelector('svg[data-icon="brand:svelte"]')).not.toBeNull()
    expect(
      host.querySelector('[data-testid="guide-location"]')?.textContent
    ).toBe("/guide/svelte/color")
    expect(host.querySelector("#guide article pre")?.textContent).toContain(
      "@icones/svelte"
    )
    expect(document.activeElement?.id).toBe("guide-title")
    await click('#guide-navigation a[href="/guide/svelte/sizing"]')
    expect(host.querySelector("#guide-title")?.textContent).toBe("Sizing")
    await click("#guide-back")
    expect(host.querySelector("#guide-title")?.textContent).toBe("Color")
    expect(select.textContent).toBe("Svelte")
    await click("#guide-back")
    expect(select.textContent).toBe("Vue")
    await click("#guide-forward")
    expect(select.textContent).toBe("Svelte")
    await click(
      'nav[aria-label="On this page"] a[href$="#guide-color-explicit-color"]'
    )
    expect(
      host.querySelector('[data-testid="guide-location"]')?.textContent
    ).toBe("/guide/svelte/color#guide-color-explicit-color")
  })
})

test("Guide mobile navigation closes after choosing an article and snippets can be copied", async () => {
  await withApp("/guide/react/color", <App />, async (host, click) => {
    const toggle = host.querySelector(
      'button[aria-controls="guide-navigation"]'
    )!
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    await click('button[aria-controls="guide-navigation"]')
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    await click('#guide-navigation a[href="/guide/react/stroke-width"]')
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(host.querySelector("#guide-title")?.textContent).toBe("Stroke Width")
    let copied = ""
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          copied = value
        },
      },
    })
    await click('#guide article button[aria-label="Copy code"]')
    expect(copied).toContain("strokeWidth={1.5}")
    expect(copied).not.toContain("IconConfig")
  })
})

test("IconConfig deep links, framework selection and copying use each adapter's configuration API", async () => {
  await withApp("/guide/react/icon-config", <App />, async (host, click) => {
    let copied = ""
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          copied = value
        },
      },
    })
    for (const framework of [
      "react",
      "vue",
      "svelte",
      "solidjs",
      "astro",
      "vanilla",
    ]) {
      await click('#guide-framework button[aria-haspopup="listbox"]')
      const label = guideFrameworks.find(({ id }) => id === framework)!.name
      const option = [
        ...host.querySelectorAll<HTMLButtonElement>(
          '#guide-framework [role="option"]'
        ),
      ].find((item) => item.textContent === label)!
      await act(async () => option.click())
      expect(host.querySelector("#guide-title")?.textContent).toBe("IconConfig")
      expect(
        host.querySelector('#guide-navigation a[aria-current="page"]')
          ?.textContent
      ).toBe("IconConfig")
      expect(
        host.querySelectorAll('nav[aria-label="On this page"] a')
      ).toHaveLength(8)
      await click('#guide article button[aria-label="Copy code"]')
      expect(copied).toContain(`@icones/${framework}`)
      expect(copied).toContain(
        framework === "vue"
          ? ':default-size="24"'
          : framework === "astro" || framework === "vanilla"
            ? "defaultSize: 24"
            : "defaultSize={24}"
      )
      expect(copied).not.toContain("sizeValues")
      if (framework === "astro" || framework === "vanilla") {
        expect(copied).toContain("createIconConfig(")
        expect(copied).not.toContain("<IconConfig")
      } else expect(copied).toContain("<IconConfig")
    }
  })
})

test("shared rendering chapters sit above frameworks with independent pagination", async () => {
  await withApp("/guide/rendering", <GuideHistory />, async (host, click) => {
    const firstGroup = host.querySelector("#guide-navigation > div")!
    expect(firstGroup.querySelector("h2")!.textContent).toBe(
      "Rendering fundamentals"
    )
    expect(
      [...firstGroup.querySelectorAll("a")].map((link) =>
        link.getAttribute("href")
      )
    ).toEqual([
      "/guide/rendering",
      "/guide/loading",
      "/guide/prop-support",
      "/guide/collections",
    ])
    expect(
      host.querySelector("#guide-framework button")!.textContent
    ).toContain("Choose a framework")
    expect(host.querySelector("article header")!.textContent).not.toContain(
      "React"
    )
    await click('#guide-navigation a[href="/guide/loading"]')
    expect(host.querySelector("h1")!.textContent).toBe("Vite and API loading")
    expect(
      [...host.querySelectorAll('nav[aria-label="Article pagination"] a')].map(
        (link) => link.getAttribute("href")
      )
    ).toEqual(["/guide/rendering", "/guide/prop-support"])
    await click('button[aria-label="Framework"]')
    await click('#guide-framework [role="listbox"] li:nth-child(2) button')
    expect(host.querySelector("h1")!.textContent).toBe("Vue overview")
    expect(
      host.querySelector('[data-testid="guide-location"]')!.textContent
    ).toBe("/guide/vue/overview")
    await click('#guide-navigation a[href="/guide/collections"]')
    expect(host.querySelector("h1")!.textContent).toBe("Collection differences")
    expect(
      host.querySelectorAll('nav[aria-label="Article pagination"] a')
    ).toHaveLength(1)
    for (const code of host.querySelectorAll("article pre code")) {
      expect(code.textContent).not.toMatch(
        /@icones\/(react|vue|svelte|solidjs|astro|vanilla)|<Icon\b/
      )
    }
  })
})

test("old rendering routes preserve queries and migrate section bookmarks", async () => {
  for (const [from, to] of [
    [
      "/guide/vue/rendering?ref=old#guide-rendering-vite-modes",
      "/guide/loading?ref=old#guide-loading-vite-modes",
    ],
    [
      "/guide/vanilla/standard/rendering#guide-rendering-props",
      "/guide/prop-support#guide-prop-support-props",
    ],
    [
      "/guide?page=rendering&framework=astro&ref=old#guide-rendering-artwork",
      "/guide/collections?ref=old#guide-collections-artwork",
    ],
  ]) {
    await withApp(from!, <GuideHistory />, async (host) => {
      expect(
        host.querySelector('[data-testid="guide-location"]')!.textContent
      ).toBe(to!)
      expect(host.querySelector("article header")!.textContent).not.toMatch(
        /React|Vue|Astro|Vanilla/
      )
      expect(
        document.querySelector(to!.split("#")[1]!.replace(/^/, "#"))
      ).not.toBeNull()
    })
  }
})

test("Guide table of contents highlights every visible section on scroll and resize", async () => {
  await withApp("/guide/react/icon-config", <App />, async (host) => {
    const sections = [
      ...host.querySelectorAll<HTMLElement>("#guide article > div > section"),
    ]
    const titles = sections.map(
      (section) => section.querySelector("h2")!.textContent
    )
    const readsPerMeasurement = sections.length + 1 // Sections plus sticky header.
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    })
    let rectangleReads = 0
    host.querySelector("header")!.getBoundingClientRect = () => {
      rectangleReads++
      return { top: 0, bottom: 72, height: 72 } as DOMRect
    }
    let offset = 0
    sections.forEach((section, index) => {
      section.getBoundingClientRect = () => {
        rectangleReads++
        return {
          top: index * 300 + 100 - offset,
          bottom: index * 300 + 380 - offset,
          height: 280,
        } as DOMRect
      }
    })
    const update = async (event = "scroll") =>
      act(async () => {
        Object.defineProperty(window, "scrollY", {
          configurable: true,
          value: offset,
        })
        window.dispatchEvent(new window.Event(event))
        await new Promise((resolve) => setTimeout(resolve, 30))
      })
    const visible = (label = "On this page") =>
      [
        ...host.querySelectorAll(
          `nav[aria-label="${label}"] [data-visible="true"]`
        ),
      ].map((link) => link.textContent)
    const expectIndicator = (rows: string | null) => {
      for (const label of ["On this page", "Article contents"]) {
        const nav = host.querySelector(`nav[aria-label="${label}"]`)!
        const track = nav.querySelector("[data-toc-track]")!
        expect(track.tagName).toBe("DIV")
        expect(track.getAttribute("aria-hidden")).toBe("true")
        const indicators = nav.querySelectorAll<HTMLElement>(
          "[data-toc-indicator]"
        )
        expect(indicators).toHaveLength(rows ? 1 : 0)
        if (rows) {
          expect(indicators[0]!.tagName).toBe("DIV")
          expect(indicators[0]!.style.gridRow).toBe(rows)
          expect(indicators[0]!.getAttribute("aria-hidden")).toBe("true")
        }
        for (const node of nav.querySelectorAll("ul, a")) {
          expect(node.className).not.toContain("border-")
        }
      }
    }
    await update("resize")
    expect(visible()).toEqual(titles.slice(0, 3))
    expect(rectangleReads).toBe(readsPerMeasurement)
    expect(visible("Article contents")).toEqual(visible())
    expectIndicator("1 / 4")
    // Visual visibility is multi-valued; aria-current remains a single location.
    expect(
      host.querySelectorAll(
        'nav[aria-label="On this page"] [aria-current="location"]'
      )
    ).toHaveLength(1)
    offset = 300
    await update()
    expect(visible()).toEqual(titles.slice(0, 4))
    offset = 308 // The first section's bottom is exactly behind the sticky header.
    await update()
    expect(visible()).toEqual(titles.slice(1, 4))
    expect(rectangleReads).toBe(readsPerMeasurement) // Fallback scrolling reuses cached document bounds.
    expectIndicator("2 / 5")
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 392,
    })
    await update("resize") // The third section starts exactly at the viewport bottom.
    expect(visible()).toEqual(titles.slice(1, 2))
    expect(rectangleReads).toBe(readsPerMeasurement * 2) // Only the resize invalidates those bounds.
    expect(visible("Article contents")).toEqual(visible())
    expectIndicator("2 / 3")
    offset = sections.length * 300 + 500
    await update()
    expect(visible()).toEqual([])
    expect(rectangleReads).toBe(readsPerMeasurement * 2)
    expectIndicator(null)
    expect(
      host.querySelector('nav[aria-label="On this page"] [aria-current]')
    ).toBeNull()
  })
})

test("Guide keeps long visible sections highlighted and clears them when articles change", async () => {
  await withApp("/guide/react/color", <App />, async (host, click) => {
    const sections = [
      ...host.querySelectorAll<HTMLElement>("#guide article > div > section"),
    ]
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    })
    sections.forEach((section, index) => {
      section.getBoundingClientRect = () =>
        ({
          top: index === 0 ? -900 : 2000,
          bottom: index === 0 ? 1100 : 2500,
          height: index === 0 ? 2000 : 500,
        }) as DOMRect
      section.querySelector("h2")!.getBoundingClientRect = () =>
        ({ top: -900, bottom: -870, height: 30 }) as DOMRect
    })
    await act(async () => {
      window.dispatchEvent(new window.Event("resize"))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    expect(
      [
        ...host.querySelectorAll(
          'nav[aria-label="On this page"] [data-visible="true"]'
        ),
      ].map((link) => link.textContent)
    ).toEqual(["Inherit text color"])
    await click('#guide-navigation a[href="/guide/react/sizing"]')
    // The new page has no visible layout in JSDOM; old section IDs must not leak.
    expect(
      host.querySelector('nav[aria-label="On this page"] [data-visible="true"]')
    ).toBeNull()
  })
})

test("Guide color comparison previews use the same color for three real styles", async () => {
  await withApp("/guide/react/color", <App />, async (host) => {
    const section = host
      .querySelector("#guide-color-color-by-style")!
      .closest("section")!
    expect(section).not.toBeNull()
    const icons = [...section.querySelectorAll("svg")]
    expect(icons).toHaveLength(3)
    expect(
      icons.every((icon) => icon.getAttribute("color") === "#7712f7")
    ).toBe(true)
    expect(
      [...section.querySelectorAll("small")].map((label) => label.textContent)
    ).toEqual(["Outline", "Filled", "Solid"])
    expect(
      [...section.querySelectorAll("code")].map((label) => label.textContent)
    ).toEqual(["tabler:star", "tabler:star-filled", "bootstrap:star-fill"])
  })
})

test("IconConfig presents usage, customization and API in order without a learning-path gate", async () => {
  await withApp(
    "/guide/vanilla/web/icon-config",
    <App />,
    async (host, click) => {
      expect(
        host.querySelectorAll('nav[aria-label="Tutorial steps"] a')
      ).toHaveLength(0)
      expect(
        host.querySelectorAll("#guide article section details")
      ).toHaveLength(0)
      const headings = [
        "Basic usage",
        "Customize appearance",
        "Configuration inheritance",
        "Local icon data",
        "Load icons from an API",
        "Shared stores and SSR",
        "Troubleshooting configuration",
        "Option reference",
      ]
      expect(
        [...host.querySelectorAll("#guide article section h2")].map(
          (node) => node.textContent
        )
      ).toEqual(headings)
      expect(
        [...host.querySelectorAll('nav[aria-label="On this page"] a')].map(
          (node) => node.textContent
        )
      ).toEqual(headings)
      const selector =
        'nav[aria-label="On this page"] a[href$="#guide-icon-config-local-sources"]'
      await click(selector)
      expect(
        host
          .querySelector("#guide-icon-config-local-sources")!
          .closest("section")!
          .querySelector("pre code")?.textContent
      ).toContain('"app:check"')
      await click(selector)
      await click(
        'nav[aria-label="On this page"] a[href$="#guide-icon-config-individual-overrides"]'
      )
      expect(
        host.querySelector("#guide-icon-config-individual-overrides")
          ?.textContent
      ).toBe("Customize appearance")
    }
  )
  await withApp(
    "/guide/vanilla/standard/icon-config#guide-icon-config-local-sources",
    <App />,
    async (host) => {
      expect(
        host
          .querySelector("#guide-icon-config-local-sources")!
          .closest("section")!
          .querySelector("pre code")?.textContent
      ).toContain('"app:check"')
    }
  )
})

test("Vanilla tutorial paths preserve chapters, all links, copying and history", async () => {
  await withApp(
    "/guide/vanilla/standard/icon-config",
    <GuideHistory />,
    async (host, click) => {
      let copied = ""
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            copied = value
          },
        },
      })
      const pathSelector = '[aria-label="Vanilla tutorial paths"]'
      const article = () => host.querySelector("#guide article")!
      expect(host.querySelectorAll(pathSelector + " a")).toHaveLength(2)
      expect(
        host.querySelector(pathSelector + ' [aria-current="true"]')?.textContent
      ).toContain("Standard elements")
      expect(article().querySelector("pre code")?.textContent).toContain(
        "bindIcons"
      )
      for (const anchor of host.querySelectorAll<HTMLAnchorElement>(
        '#guide a[href^="/guide"]'
      )) {
        if (anchor.closest(pathSelector)) continue
        expect(readGuidePath(new URL(anchor.href).pathname)?.element).toBe(
          "standard"
        )
      }
      await click('#guide article button[aria-label="Copy code"]')
      expect(copied).toContain('<i icon-name="tabler:star">')
      expect(copied).not.toContain("defineIconElement")

      await click(pathSelector + ' a[href*="/vanilla/web/"]')
      expect(host.querySelector("#guide-title")?.textContent).toBe("IconConfig")
      expect(article().querySelector("pre code")?.textContent).toContain(
        "defineIconElement"
      )
      await click('#guide article button[aria-label="Copy code"]')
      expect(copied).toContain("<icones-icon")
      expect(copied).not.toContain("bindIcons")
      await click("#guide-back")
      expect(article().textContent).toContain("Standard elements")
      await click("#guide-forward")
      expect(article().textContent).toContain("Web Components")
      await click(pathSelector + ' a[href*="/vanilla/standard/"]')
      await click('#guide-navigation a[href="/guide/vanilla/standard/color"]')
      expect(article().querySelector("pre code")?.textContent).toContain(
        "icon-name"
      )
      await click('nav[aria-label="Article pagination"] a[href$="/sizing"]')
      expect(host.querySelector("#guide-title")?.textContent).toBe("Sizing")
      expect(article().querySelector("pre code")?.textContent).toContain(
        'icon-size="lg"'
      )
      await click(
        '#guide-navigation a[href="/guide/vanilla/standard/overview"]'
      )
      expect(host.querySelector("#guide-title")?.textContent).toBe(
        "Standard elements overview"
      )
      expect(article().textContent).toContain("attrPrefix")
      await click(pathSelector + ' a[href*="/vanilla/web/"]')
      expect(host.querySelector("#guide-title")?.textContent).toBe(
        "Web Components overview"
      )
      expect(article().textContent).not.toContain("attrPrefix")
    }
  )
})

test("Guide anchors scroll immediately, including repeated clicks on the same section", async () => {
  await withApp("/guide/react/color", <App />, async (host, click) => {
    const heading = host.querySelector<HTMLElement>(
      "#guide-color-explicit-color"
    )!
    const scrolls: (boolean | ScrollIntoViewOptions | undefined)[] = []
    heading.scrollIntoView = (options) => {
      scrolls.push(options)
    }
    const selector =
      'nav[aria-label="On this page"] a[href$="#guide-color-explicit-color"]'
    await click(selector)
    expect(scrolls).toContainEqual({ behavior: "instant", block: "start" })
    scrolls.length = 0
    await click(selector)
    expect(scrolls).toEqual([{ behavior: "instant", block: "start" }])
  })
})

test("sticky header stays on guides and gives way to the catalog toolbar", async () => {
  await withApp(paths.home, <App />, async (host, click) => {
    const header = host.querySelector("#top")!
    expect(header.classList.contains("sticky")).toBe(true)
    expect(header.classList.contains("top-0")).toBe(true)
    expect(header.classList.contains("bg-transparent")).toBe(true)
    await act(async () => {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: 300,
      })
      window.dispatchEvent(new window.Event("scroll"))
    })
    expect(header.classList.contains("bg-white/95")).toBe(true)
    expect(header.classList.contains("bg-transparent")).toBe(false)
    await act(async () => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 })
      window.dispatchEvent(new window.Event("scroll"))
    })
    expect(header.classList.contains("bg-transparent")).toBe(true)
    await click('#top a[href="/guide"]')
    expect(header.classList.contains("sticky")).toBe(true)
    expect(header.classList.contains("-mb-(--header-height)")).toBe(false)
    expect(
      host.querySelector('[aria-label="Guide sidebar"]')?.className
    ).toContain("md:top-[calc(var(--header-height)+1.5rem)]")
    expect(
      host.querySelector('[aria-label="Table of contents"]')?.className
    ).toContain("top-[calc(var(--header-height)+2rem)]")
    await click('#top a[href="/icons"]')
    expect(header.classList.contains("sticky")).toBe(false)
    expect(header.classList.contains("relative")).toBe(true)
    expect(
      host.querySelector(".catalog-toolbar")?.classList.contains("top-0")
    ).toBe(true)
    await click('#top a[href="/guide"]')
    expect(header.classList.contains("sticky")).toBe(true)
  })
})

test("homepage keeps its hero behind a sticky header, separate from the icon browser", async () => {
  await withApp(paths.home, <App />, async (host, click, requests) => {
    expect(host.querySelector("#catalog")).toBeNull()
    expect(host.querySelector("#guide")).toBeNull()
    expect(host.querySelector('input[type="search"]')).toBeNull()
    expect(document.title).toBe("Beautiful SVG icons – Icones")
    expect(requests).toHaveLength(1)
    expect(
      new URL(requests[0]!, "https://icons.test").searchParams.get("limit")
    ).toBe("1")
    expect(host.querySelector("#top > div > a")?.textContent).toBe("Icones")
    expect(host.querySelector("#top nav")).not.toBeNull()
    expect(host.querySelector("#top details")).not.toBeNull()
    expect(host.querySelector('nav a[aria-current="page"]')).toBeNull()
    expect(host.querySelector('nav a[href="/icons"]')).not.toBeNull()
    expect(host.querySelector("#top")?.classList.contains("sticky")).toBe(true)
    expect(
      host.querySelector("#top")?.classList.contains("bg-transparent")
    ).toBe(true)
    expect(
      host.querySelector("#top")?.classList.contains("border-transparent")
    ).toBe(true)
    expect(
      host.querySelector("#top")?.classList.contains("-mb-(--header-height)")
    ).toBe(true)
    expect(
      host.querySelector(".hero-background")?.classList.contains("pt-18")
    ).toBe(true)
    expect(host.querySelector(".hero-background svg")).not.toBeNull()
    await click('main a[href="/icons"]')
    expect(host.querySelector(".hero-background")).toBeNull()
    expect(host.querySelector("#catalog")).not.toBeNull()
    expect(host.querySelector("h1")?.textContent).toBe("Icons")
    expect(host.querySelector('nav a[aria-current="page"]')?.textContent).toBe(
      "Icons"
    )
    expect(host.querySelector("#top")?.classList.contains("bg-white/95")).toBe(
      true
    )
    await click('#top > div > a[href="/"]')
    expect(host.querySelector("#catalog")).toBeNull()
    expect(host.querySelector(".hero-background")).not.toBeNull()
    await click('main a[href="/guide"]')
    expect(host.querySelector("#catalog")).toBeNull()
    expect(host.querySelector("#guide")).not.toBeNull()
    expect(document.title).toBe("What is Icones? – Icones")
    expect(document.activeElement?.id).toBe("main-content")
    expect(host.querySelector("#top > div > a")?.textContent).toBe("Icones")
    expect(host.querySelector("#top")?.classList.contains("absolute")).toBe(
      false
    )
    expect(host.querySelector("#top")?.classList.contains("bg-white/95")).toBe(
      true
    )
    await click('#top > div > a[href="/"]')
    expect(host.querySelector("#top > div > a")?.textContent).toBe("Icones")
    expect(host.querySelector("#top nav")).not.toBeNull()
    expect(host.querySelector(".hero-background")).not.toBeNull()
    expect(
      host.querySelector("#top")?.classList.contains("bg-transparent")
    ).toBe(true)
    await pointer(host.querySelector("summary")!, "pointerover")
    expect(host.querySelector("details")?.open).toBe(true)
    await click('nav a[href="/solutions/packages"]')
    expect(host.querySelector(".hero-background")).toBeNull()
    expect(host.querySelector("h1")?.textContent).toBe(
      "One icon system. Your stack."
    )
    expect(host.querySelector('nav a[aria-current="page"]')?.textContent).toBe(
      "All Packages"
    )
  })
})

test("direct Icons URLs preserve filters without the homepage hero", async () => {
  await withApp("/icons?set=lucide&q=star", <App />, async (host, click) => {
    expect(host.querySelector("h1")?.textContent).toBe("Icons")
    expect(host.querySelector(".hero-background")).toBeNull()
    expect(host.querySelector("#catalog")).not.toBeNull()
    expect(
      host.querySelector<HTMLInputElement>('input[type="search"]')?.value
    ).toBe("star")
    expect(document.title).toBe("Lucide Icons – Icones")
    expect(host.querySelector("#top")?.classList.contains("absolute")).toBe(
      false
    )
    await click('#top > div > a[href="/"]')
    expect(host.querySelector(".hero-background")).not.toBeNull()
    expect(host.querySelector("#catalog")).toBeNull()
    await click('nav a[href="/icons"]')
    expect(host.querySelector("#catalog")).not.toBeNull()
    expect(host.querySelector(".hero-background")).toBeNull()
  })
})

test("Icons share button retains the filtered page URL", async () => {
  await withApp("/icons?set=lucide&q=star", <App />, async (host, click) => {
    let copied = ""
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          copied = value
        },
      },
    })
    await click("footer button")
    expect(copied).toBe("https://icons.test/icons?set=lucide&q=star")
    expect(host.querySelector("footer button")?.textContent).toBe("Link copied")
  })
})

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

for (const label of ["Language:", "Theme:"]) {
  test(`${label} matches Solutions hover, gap, touch and Escape behavior`, async () => {
    await withApp(paths.guide, <App />, async (host, click) => {
      const selector = `button[aria-label^="${label}"]`
      const trigger = host.querySelector<HTMLButtonElement>(selector)!
      const focus = document.activeElement
      await pointer(trigger, "pointerover")
      expect(trigger.getAttribute("aria-expanded")).toBe("true")
      expect(document.activeElement).toBe(focus)
      const bridge = trigger.nextElementSibling!
      const option = bridge.querySelector('[role="option"]')!
      await pointer(trigger, "pointerout", "mouse", bridge)
      await pointer(bridge, "pointerout", "mouse", option)
      expect(trigger.getAttribute("aria-expanded")).toBe("true")
      await pointer(option, "pointerout", "mouse", document.body)
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
      await pointer(trigger, "pointerover", "touch")
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
      await click(selector)
      expect(trigger.getAttribute("aria-expanded")).toBe("true")
      await act(async () =>
        document.activeElement!.dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        )
      )
      expect(trigger.getAttribute("aria-expanded")).toBe("false")
      expect(document.activeElement).toBe(trigger)
    })
  })
}

test("responsive navigation opens with focus and closes on Escape, outside press and route changes", async () => {
  await withApp(paths.guide, <App />, async (host, click) => {
    const trigger = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Open navigation"]'
    )!
    const navigation = document.getElementById(
      trigger.getAttribute("aria-controls")!
    )!
    expect(navigation.dataset.open).toBe("false")
    expect(navigation.className).toContain("md:flex")
    expect(trigger.className).toContain("md:hidden")
    await click('button[aria-label="Open navigation"]')
    expect(navigation.dataset.open).toBe("true")
    expect(document.activeElement).toBe(navigation.querySelector("a"))
    await click("#top summary")
    await act(async () =>
      host
        .querySelector("#top summary")!
        .dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        )
    )
    expect(navigation.dataset.open).toBe("true")
    expect(host.querySelector<HTMLDetailsElement>("#top details")?.open).toBe(
      false
    )
    await act(async () =>
      navigation.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    )
    expect(navigation.dataset.open).toBe("false")
    expect(document.activeElement).toBe(trigger)
    await click('button[aria-label="Open navigation"]')
    await act(async () =>
      document.body.dispatchEvent(
        new window.Event("pointerdown", { bubbles: true })
      )
    )
    expect(navigation.dataset.open).toBe("false")
    await click('button[aria-label="Open navigation"]')
    const solutions = navigation.querySelector(
      '[role="group"][aria-label="Solutions"]'
    )!
    expect(solutions.querySelector("summary, button, details")).toBeNull()
    expect(
      [...solutions.querySelectorAll("a")].map((link) => link.textContent)
    ).toEqual(["All Packages", "LLMs", "MCP Server"])
    expect(solutions.closest("details")).toBeNull()
    await click(
      'nav [role="group"][aria-label="Solutions"] a[href="/solutions/llms"]'
    )
    expect(host.querySelector("h1")?.textContent).toBe("LLMs")
    expect(navigation.dataset.open).toBe("false")
    await click('button[aria-label="Open navigation"]')
    await click('nav a[href="/licenses"]')
    expect(host.querySelector("h1")?.textContent).toBe("Licenses")
    expect(navigation.dataset.open).toBe("false")
    expect(document.activeElement?.id).toBe("main-content")
  })
})

test("Licenses lists all collections, both Flag sources and original bundled notices", async () => {
  await withApp(paths.licenses, <App />, async (host, click, requests) => {
    expect(host.querySelectorAll('article[id^="license-"]')).toHaveLength(
      publicSets.length
    )
    expect(host.querySelectorAll("#license-flag [data-source]")).toHaveLength(2)
    const columns = host.querySelector("#license-brand")!.parentElement!
    expect(columns.classList.contains("lg:columns-2")).toBe(true)
    expect(columns.classList.contains("grid")).toBe(false)
    for (const prefix of publicSets) {
      const card = host.querySelector(`#license-${prefix}`)!
      expect(card.classList.contains("break-inside-avoid")).toBe(true)
      expect(
        card.querySelector('a[href="/icons/' + prefix + '/license.txt"]')
      ).not.toBeNull()
      expect(
        card.querySelector('a[href="/icons/' + prefix + '/manifest.json"]')
      ).not.toBeNull()
      for (const source of getCollectionSources(prefix)) {
        const section = card.querySelector(`[data-source="${source.id}"]`)!
        expect(section.querySelector("pre, details")).toBeNull()
        expect(section.querySelector("a")?.href).toBe(source.url)
        expect(section.textContent).toContain(source.licenseName)
        if (source.notice) expect(section.textContent).toContain(source.notice)
        const selector = `#license-${prefix} [data-source="${source.id}"] button`
        const trigger = host.querySelector<HTMLButtonElement>(selector)!
        expect(trigger.getAttribute("aria-haspopup")).toBe("dialog")
        const originalCard = card.innerHTML
        await click(selector)
        const dialog = host.querySelector("dialog")!
        expect(dialog.open).toBe(true)
        expect(host.querySelectorAll("dialog")).toHaveLength(1)
        expect(dialog.closest('article[id^="license-"]')).toBeNull()
        const viewport = dialog.querySelector<HTMLElement>('[role="region"]')!
        expect(viewport.classList.contains("overflow-y-auto")).toBe(true)
        expect(viewport.classList.contains("my-4")).toBe(true)
        expect(viewport.classList.contains("sm:my-6")).toBe(true)
        expect(viewport.contains(dialog.querySelector("header"))).toBe(false)
        expect(dialog.querySelector("pre")?.textContent).toBe(
          source.licenseText
        )
        expect(dialog.querySelector("h2")?.textContent).toContain(source.id)
        expect(
          document.getElementById(dialog.getAttribute("aria-labelledby")!)
        ).toBe(dialog.querySelector("h2"))
        if (source.notice) expect(dialog.textContent).toContain(source.notice)
        expect(card.innerHTML).toBe(originalCard)
        expect(document.body.style.overflow).toBe("hidden")
        expect(document.activeElement).toBe(dialog.querySelector("button"))
        // Reading or selecting the text must not dismiss the modal.
        await click("dialog pre")
        expect(dialog.open).toBe(true)
        await click('button[aria-label="Close license notice"]')
        expect(host.querySelector("dialog")).toBeNull()
        expect(document.body.style.overflow).toBe("")
        expect(document.activeElement).toBe(trigger)
      }
    }
    expect(host.querySelector("#license-remix")).toBeNull()
    for (const set of ["bootstrap", "antd"])
      expect(host.querySelector(`#license-${set}`)?.textContent).toMatch(
        /MIT License/i
      )
    expect(requests).toHaveLength(0)
  })
})

test("license dialogs close on the backdrop or native dismissal and restore scroll styles on unmount", async () => {
  await withApp(paths.licenses, <App />, async (host, click) => {
    const trigger = host.querySelector<HTMLButtonElement>(
      "#license-brand button"
    )!
    document.body.style.overflow = "auto"
    document.documentElement.style.scrollbarGutter = "stable both-edges"
    await click("#license-brand button")
    await click("dialog")
    expect(host.querySelector("dialog")).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe("auto")
    expect(document.documentElement.style.scrollbarGutter).toBe(
      "stable both-edges"
    )

    await click("#license-brand button")
    await act(async () => host.querySelector("dialog")!.close())
    expect(host.querySelector("dialog")).toBeNull()
    expect(document.activeElement).toBe(trigger)

    await click("#license-brand button")
    // Simulate routing away while open; native modality is tested in the browser.
    await click('nav a[href="/guide"]')
    expect(host.querySelector("dialog")).toBeNull()
    expect(document.body.style.overflow).toBe("auto")
    expect(document.documentElement.style.scrollbarGutter).toBe(
      "stable both-edges"
    )
  })
})

test("Solutions opens on hover and stays open across the gap and menu", async () => {
  await withApp(paths.guide, <App />, async (host) => {
    const details = host.querySelector("details")!
    const summary = host.querySelector("summary")!
    const bridge = summary.nextElementSibling!
    const link = details.querySelector("a")!
    expect(details.open).toBe(false)
    await pointer(summary, "pointerover")
    expect(details.open).toBe(true)
    expect(bridge.classList.contains("pt-2")).toBe(true)
    await pointer(summary, "pointerout", "mouse", bridge)
    expect(details.open).toBe(true)
    await pointer(bridge, "pointerout", "mouse", link)
    expect(details.open).toBe(true)
    await pointer(link, "pointerout", "mouse", document.body)
    expect(details.open).toBe(false)
  })
})

test("Solutions preserves touch toggling and keyboard focus when the pointer leaves", async () => {
  await withApp(paths.guide, <App />, async (host, click) => {
    const details = host.querySelector("details")!
    const summary = host.querySelector("summary")!
    const link = details.querySelector("a")!
    await pointer(summary, "pointerover", "touch")
    expect(details.open).toBe(false)
    await click("summary")
    expect(details.open).toBe(true)
    await pointer(summary, "pointerout", "touch", document.body)
    expect(details.open).toBe(true)
    await act(async () => link.focus())
    await pointer(link, "pointerout", "mouse", document.body)
    expect(details.open).toBe(true)
    await act(async () => host.querySelector<HTMLElement>("nav > a")!.focus())
    expect(details.open).toBe(false)
  })
})

test("every Solutions option has a decorative icon without changing its label or target", async () => {
  await withApp(paths.guide, <App />, async (host, click) => {
    await click("summary")
    for (const [route, label, icon] of [
      [paths.packages, "All Packages", "tabler:packages"],
      [paths.llms, "LLMs", "tabler:brain"],
      [paths.mcp, "MCP Server", "tabler:plug-connected"],
    ]) {
      const link = host.querySelector(`header details a[href="${route}"]`)!
      expect(link.textContent).toBe(label)
      const glyph = link.querySelector(`[data-icon="${icon}"]`)!
      expect(glyph).not.toBeNull()
      expect(glyph.closest('[aria-hidden="true"]')).not.toBeNull()
      expect(glyph.getAttribute("width")).toBe("18")
      expect(glyph.getAttribute("height")).toBe("18")
    }
  })
})

test("Solutions opens by click, closes on Escape/outside click and marks the actual page", async () => {
  await withApp(paths.guide, <App />, async (host, click) => {
    const details = host.querySelector("details")!
    const summary = host.querySelector("summary")!
    await click("summary")
    expect(details.open).toBe(true)
    await act(async () =>
      summary.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    )
    expect(details.open).toBe(false)
    expect(document.activeElement).toBe(summary)
    await click("summary")
    await act(async () =>
      document.body.dispatchEvent(
        new window.Event("pointerdown", { bubbles: true })
      )
    )
    expect(details.open).toBe(false)
    await click("summary")
    await click('nav a[href="/solutions/mcp"]')
    expect(details.open).toBe(false)
    expect(summary.dataset.active).toBe("true")
    expect(host.querySelector('nav a[aria-current="page"]')?.textContent).toBe(
      "MCP Server"
    )
  })
})

test("Solutions replaces Icon Font with LLMs and links directly to plain-text documents", async () => {
  await withApp(paths.guide, <App />, async (host, click, requests) => {
    expect(host.querySelector('nav a[href="/solutions/icon-font"]')).toBeNull()
    await click("summary")
    await click('nav a[href="/solutions/llms"]')
    expect(host.querySelector("h1")?.textContent).toBe("LLMs")
    expect(document.title).toBe("LLMs – Icones")
    expect(host.querySelector('nav a[aria-current="page"]')?.textContent).toBe(
      "LLMs"
    )
    for (const filename of ["llms.txt", "llms-full.txt"]) {
      const link = host.querySelector<HTMLAnchorElement>(
        `main a[href="/${filename}"]`
      )!
      expect(link).not.toBeNull()
      expect(link.target).toBe("_blank")
      expect(link.textContent).toContain(filename)
    }
    expect(requests).toHaveLength(0)
    expect(host.querySelector("main")?.textContent).toContain(
      "not an MCP connection"
    )
  })
})

test("the removed Icon Font route no longer renders the retired page", async () => {
  await withApp("/solutions/icon-font", <App />, async (host) => {
    expect(host.querySelector("h1")?.textContent).toBe(
      "This page is not in the collection."
    )
    expect(host.querySelector('nav a[aria-current="page"]')).toBeNull()
  })
})

function LlmsHistory() {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="llms-location">{pathname + search + hash}</output>
      <button id="llms-back" onClick={() => navigate(-1)}>
        Back
      </button>
      <button id="llms-forward" onClick={() => navigate(1)}>
        Forward
      </button>
    </>
  )
}

test("LLMs displays every framework section and all document links without selection or fetching", async () => {
  await withApp(paths.llms, <App />, async (host, _click, requests) => {
    expect(
      host.querySelector(
        'main select, main input[type="radio"], main [role="combobox"]'
      )
    ).toBeNull()
    const sections = [...host.querySelectorAll("#llms-documents > section")]
    expect(
      sections.map((section) => section.querySelector("h2")?.textContent)
    ).toEqual(["All frameworks", ...guideFrameworks.map(({ name }) => name)])
    expect(host.querySelectorAll("#llms-documents article")).toHaveLength(18)
    for (const scope of llmsScopes) {
      const id =
        "llms-" +
        scope.framework +
        (scope.element === "all" ? "" : "-" + scope.element)
      const section = host.querySelector("section#" + id)!
      expect(section).not.toBeNull()
      expect(
        document.getElementById(section.getAttribute("aria-labelledby")!)
          ?.textContent
      ).toBe(llmsScopeLabel(scope))
      const heading = document.getElementById(
        section.getAttribute("aria-labelledby")!
      )!
      const icon = heading.querySelector("svg")!
      expect(icon.getAttribute("data-icon")).toBe(
        scope.framework === "all"
          ? "tabler:components"
          : "brand:" +
              (scope.framework === "vanilla" ? "javascript" : scope.framework)
      )
      expect(icon.closest('[aria-hidden="true"]')).not.toBeNull()
      if (scope.element !== "all") {
        expect(section.parentElement?.closest("section")?.id).toBe(
          "llms-vanilla"
        )
        expect(section.querySelector("h3")?.textContent).toBe(
          llmsScopeLabel(scope)
        )
        expect(section.querySelectorAll("article h4")).toHaveLength(2)
      }
      for (const filename of ["llms.txt", "llms-full.txt"] as const) {
        const link = section.querySelector<HTMLAnchorElement>(
          'article a[href="' + llmsDocumentHref(scope, filename) + '"]'
        )!
        expect(link.textContent).toBe("Open " + filename)
        expect(link.target).toBe("_blank")
        expect(link.closest<Element>("section")).toBe(section)
      }
      expect(
        section.querySelector('a[href="' + llmsGuideHref(scope) + '"]')
      ).not.toBeNull()
    }
    expect(requests).toHaveLength(0)
  })
})

test("legacy LLMs query links show all sections and each setup link opens its own framework", async () => {
  const route =
    "/solutions/llms?framework=vanilla&element=standard#llms-documents"
  await withApp(
    route,
    <>
      <App />
      <LlmsHistory />
    </>,
    async (host, click) => {
      expect(host.querySelectorAll("#llms-documents > section")).toHaveLength(7)
      expect(host.querySelector('main input[type="radio"]')).toBeNull()
      expect(
        host.querySelector(
          'section#llms-vanilla-standard a[href="/llms/vanilla/standard/llms-full.txt"]'
        )
      ).not.toBeNull()
      await click('section#llms-vue a[href="/guide/vue/overview"]')
      expect(
        host.querySelector('[data-testid="llms-location"]')?.textContent
      ).toBe("/guide/vue/overview")
      expect(
        host.querySelector('button[aria-label="Framework"]')?.textContent
      ).toBe("Vue")
      await click("#llms-back")
      expect(
        host.querySelector('[data-testid="llms-location"]')?.textContent
      ).toBe(route)
      expect(host.querySelectorAll("#llms-documents > section")).toHaveLength(7)
    }
  )
})

test("package selector changes the installation command and code sample", async () => {
  await withApp(paths.packages, <App />, async (host, click) => {
    expect(
      host.querySelector('button[aria-label="View Icons package"]')
    ).toBeNull()
    expect(
      host.querySelector('button[aria-label="View Core package"]')
    ).toBeNull()
    expect(
      host.querySelectorAll('button[aria-controls="package-example"]')
    ).toHaveLength(8)
    expect(host.querySelector("main")?.textContent).toContain("8 packages")
    expect(host.querySelector("#package-example")?.textContent).toContain(
      "@icones/react"
    )
    await click('button[aria-label="View Vue package"]')
    expect(host.querySelector("#package-example")?.textContent).toContain(
      "@icones/vue"
    )
    expect(host.querySelector("#package-example")?.textContent).toContain(
      "Favorite.vue"
    )
    expect(host.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1)
    for (const format of [
      "React",
      "Vue",
      "Svelte",
      "SolidJS",
      "Astro",
      "Vanilla",
    ]) {
      await click(`button[aria-label="View ${format} package"]`)
      const code = [...host.querySelectorAll("#package-example pre code")].at(
        -1
      )
      expect(code?.textContent).toContain("tabler:star")
      expect(code?.textContent).not.toContain("IconConfig")
      expect(code?.textContent).not.toContain("export function")
    }
    for (const [label, name] of [
      ["Vite", "vite"],
      ["MCP Server", "mcp-server"],
    ]) {
      await click(`button[aria-label="View ${label} package"]`)
      expect(host.querySelector("#package-example")?.textContent).toContain(
        `@icones/${name}`
      )
    }
  })
})

test("MCP tutorial renders ordered responsive steps with copyable examples and no window controls", async () => {
  await withApp(paths.mcp, <App />, async (host, _click, requests) => {
    const tutorial = host.querySelector(
      'section[aria-labelledby="mcp-connect"]'
    )!
    const steps = [...tutorial.querySelectorAll("ol > li > section")]
    expect(steps).toHaveLength(6)
    expect(tutorial.querySelectorAll(".bg-red-400\\/80")).toHaveLength(0)
    expect(host.querySelector('main a[href="#mcp-connect"]')).not.toBeNull()
    const copies: string[] = []
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (code: string) => {
          copies.push(code)
        },
      },
    })
    for (const [index, section] of steps.entries()) {
      const step = mcpTutorialSteps[index]!
      expect(section.getAttribute("aria-labelledby")).toBe(
        "mcp-step-" + step.id
      )
      expect(section.querySelector("h3")?.textContent).toBe(step.title)
      expect(section.querySelector('[aria-hidden="true"]')?.textContent).toBe(
        String(index + 1).padStart(2, "0")
      )
      expect(
        section.classList.contains("lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")
      ).toBe(true)
      expect(
        [...section.querySelectorAll("pre code")].map(
          (block) => block.textContent
        )
      ).toEqual(step.examples.map(({ code }) => code))
      const buttons = [
        ...section.querySelectorAll<HTMLButtonElement>(
          'button[aria-label="Copy code"]'
        ),
      ]
      expect(buttons).toHaveLength(step.examples.length)
      for (const [exampleIndex, button] of buttons.entries()) {
        await act(async () => button.click())
        expect(copies.at(-1)).toBe(step.examples[exampleIndex]!.code)
        expect(button.getAttribute("aria-label")).toBe("Code copied")
      }
    }
    expect(copies).toHaveLength(7)
    expect(steps[0]!.textContent).not.toContain("bun run start:mcp")
    expect(tutorial.textContent).toContain("They are not terminal commands")
    expect(requests).toHaveLength(0)
  })
})

test("MCP package card shows its local client setup and links to the MCP guide", async () => {
  await withApp(paths.packages, <App />, async (host, click) => {
    await click('button[aria-label="View MCP Server package"]')
    const example = host.querySelector("#package-example")!
    expect(example.textContent).toContain("bun add -d @icones/mcp-server")
    const code = [...example.querySelectorAll("pre code")].find((block) =>
      block.textContent?.includes('"mcpServers"')
    )
    const config = JSON.parse(code?.textContent ?? "")
    expect(config.mcpServers.icones.command).toBe("node")
    expect(config.mcpServers.icones.args).toEqual([
      "/absolute/path/your-app/node_modules/@icones/mcp-server/dist/cli.js",
    ])
    expect(example.querySelector('a[href="/solutions/mcp"]')).not.toBeNull()
    await click('#package-example a[href="/solutions/mcp"]')
    expect(host.querySelector("#mcp-tools")?.textContent).toBe(
      "Icon tools and framework guides."
    )
  })
})

function FilterControls() {
  const { query, set, update } = useCatalogFilters()
  return (
    <>
      <output data-testid="filters">
        {set}:{query}
      </output>
      <button id="choose-set" onClick={() => update({ set: "lucide" })}>
        Choose set
      </button>
      <button id="search" onClick={() => update({ query: "star" })}>
        Search
      </button>
      <ActionLink href="#catalog">Browse icons</ActionLink>
      <ActionLink href={paths.guide}>Developer guide</ActionLink>
    </>
  )
}
function HistoryHarness() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <IconConfig api={false}>
      <Header />
      <output data-testid="location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
      <button id="back" onClick={() => void navigate(-1)}>
        Back
      </button>
      <button id="forward" onClick={() => void navigate(1)}>
        Forward
      </button>
      <Routes>
        <Route path={paths.icons} element={<FilterControls />} />
        <Route path="/guide" element={<h1>Guide</h1>} />
      </Routes>
    </IconConfig>
  )
}
test("catalog URL filters and anchors survive page navigation and browser history", async () => {
  await withApp(paths.icons, <HistoryHarness />, async (host, click) => {
    await click("#choose-set")
    await click("#search")
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/icons?set=lucide&q=star"
    )
    await click('a[href="/icons?set=lucide&q=star#catalog"]')
    expect(host.querySelector('[data-testid="filters"]')?.textContent).toBe(
      "lucide:star"
    )
    await click('a[href="/guide"]')
    await click("#back")
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/icons?set=lucide&q=star#catalog"
    )
    expect(host.querySelector('[data-testid="filters"]')?.textContent).toBe(
      "lucide:star"
    )
    expect(host.querySelector("#top nav")).not.toBeNull()
    expect(host.querySelector("#top > div > a")?.textContent).toBe("Icones")
    await click("#forward")
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/guide"
    )
    expect(host.querySelector("#top nav")).not.toBeNull()
    expect(host.querySelector("#top > div > a")?.textContent).toBe("Icones")
    await click("#back")
    await click("#back")
    await click("#back")
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      "/icons"
    )
  })
})

const ratioCatalog: CatalogIcon[] = [
  {
    name: "flag:us-circle",
    prefix: "flag",
    category: "flags",
    variant: "circle",
  },
  {
    name: "flag:gb-circle",
    prefix: "flag",
    category: "flags",
    variant: "circle",
  },
  {
    name: "flag:language-en-circle",
    prefix: "flag",
    category: "language",
    variant: "circle",
  },
  {
    name: "flag:other-chequered-circle",
    prefix: "flag",
    category: "other",
    variant: "circle",
  },
  { name: "flag:us-square", prefix: "flag", category: "flags", variant: "1x1" },
  { name: "flag:gb-square", prefix: "flag", category: "flags", variant: "1x1" },
  { name: "flag:us", prefix: "flag", category: "flags", variant: "4x3" },
  { name: "flag:gb", prefix: "flag", category: "flags", variant: "4x3" },
  { name: "flag:de", prefix: "flag", category: "flags", variant: "4x3" },
  {
    name: "tabler:star",
    prefix: "tabler",
    category: "system",
    variant: "outline",
  },
  {
    name: "tabler:star-filled",
    prefix: "tabler",
    category: "system",
    variant: "solid",
    variantAlias: "filled",
  },
]

async function settleCatalog() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 160))
  })
}

function CatalogHistory() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="catalog-location">
        {location.pathname + location.search + location.hash}
      </output>
      <button id="catalog-back" onClick={() => void navigate(-1)}>
        Back
      </button>
      <button id="catalog-forward" onClick={() => void navigate(1)}>
        Forward
      </button>
    </>
  )
}

test.each([
  ["flag", "circle", "flag/us-circle.svg#icon", "0 0 512 512"],
  ["flag", "1x1", "flag/us-square.svg#icon", "0 0 512 512"],
  ["flag", "4x3", "flag/us.svg#icon", "0 0 640 480"],
  ["tabler", "outline", "tabler/star.svg#icon", "0 0 24 24"],
])(
  "catalog always renders %s %s as symbols, including legacy fetch links",
  async (set, variant, symbol, viewBox) => {
    await withApp(
      `/icons?set=${set}&variant=${variant}&transport=fetch`,
      <App />,
      async (host, _click, requests) => {
        await settleCatalog()
        expect(host.querySelector('[aria-label="Icon loading"]')).toBeNull()
        expect(
          [...host.querySelectorAll("#catalog button")].some((button) =>
            ["symbol", "fetch"].includes(button.textContent?.trim() ?? "")
          )
        ).toBe(false)
        const use = host.querySelector(`.icon-card use[href$="${symbol}"]`)
        expect(use).not.toBeNull()
        expect(use?.closest("svg")?.getAttribute("viewBox")).toBe(viewBox)
        expect(requests.every((url) => url.includes("/catalog?"))).toBe(true)
      },
      ratioCatalog
    )
  }
)

test("Flag starts with ratio buttons, filters results and removes the duplicate category picker", async () => {
  await withApp(
    "/icons?set=flag",
    <App />,
    async (host, click, requests) => {
      await settleCatalog()
      const ratios = host.querySelector('[aria-label="Flag variant"]')!
      expect(ratios.previousElementSibling).toBeNull()
      expect(
        [...ratios.querySelectorAll("button")].map(
          (button) => button.textContent
        )
      ).toEqual(["1x1", "4x3", "circle"])
      expect(ratios.querySelector('[aria-pressed="true"]')?.textContent).toBe(
        "1x1"
      )
      expect(host.querySelector('[aria-label="Icon style"]')).toBeNull()
      expect(host.querySelector('[aria-label="Icon category"]')).toBeNull()
      expect(
        host.querySelector(".virtual-category-heading h3")?.textContent
      ).toBe("Flag")
      expect(host.querySelectorAll(".icon-card")).toHaveLength(2)
      expect(host.querySelector("#catalog [role=status]")?.textContent).toBe(
        "2 icons"
      )
      expect(host.querySelector('[aria-label="Icon set"]')?.textContent).toBe(
        "Flag (7)"
      )
      await click('[aria-label="Icon set"]')
      const menuId = host
        .querySelector('[aria-label="Icon set"]')!
        .getAttribute("aria-controls")!
      const options = [
        ...document.getElementById(menuId)!.querySelectorAll('[role="option"]'),
      ].map((option) => option.textContent)
      expect(options).toHaveLength(7)
      expect(
        options.filter((label) => label?.startsWith("Flag (")).length
      ).toBe(1)
      expect(options.some((label) => label?.startsWith("Circle Flags"))).toBe(
        false
      )
      await click('[aria-label="Icon set"]')
      await click('[aria-label="Flag variant"] button:nth-child(2)')
      await settleCatalog()
      expect(ratios.querySelector('[aria-pressed="true"]')?.textContent).toBe(
        "4x3"
      )
      expect(host.querySelectorAll(".icon-card")).toHaveLength(3)
      expect(host.querySelector("#catalog [role=status]")?.textContent).toBe(
        "3 icons"
      )
      expect(
        host.querySelector(".icon-card")?.getAttribute("aria-label")
      ).not.toContain("square")
      const catalogRequests = requests.filter(
        (url) =>
          url.includes("/catalog?") &&
          new URL(url, "https://icons.test").searchParams.get("limit") === "100"
      )
      expect(catalogRequests).toHaveLength(2)
      expect(
        new URL(catalogRequests[0]!, "https://icons.test").searchParams.get(
          "variant"
        )
      ).toBe("1x1")
      expect(
        new URL(catalogRequests[1]!, "https://icons.test").searchParams.get(
          "variant"
        )
      ).toBe("4x3")
      await click('[aria-label="Flag variant"] button:last-child')
      await settleCatalog()
      expect(ratios.querySelector('[aria-pressed="true"]')?.textContent).toBe(
        "circle"
      )
      expect(host.querySelector('[aria-label="Icon set"]')?.textContent).toBe(
        "Flag (7)"
      )
      expect(host.querySelectorAll(".icon-card")).toHaveLength(2)
      expect(host.querySelectorAll(".virtual-category-heading")).toHaveLength(1)
      expect(
        host.querySelector(".virtual-category-heading h3")?.textContent
      ).toBe("Flag")
      expect(host.querySelector("#catalog [role=status]")?.textContent).toBe(
        "2 icons"
      )
      const circleRequest = new URL(
        requests.filter((url) => url.includes("/catalog?")).at(-1)!,
        "https://icons.test"
      )
      expect(circleRequest.searchParams.get("set")).toBe("flag")
      expect(circleRequest.searchParams.get("category")).toBe("flags")
      expect(
        [...host.querySelectorAll(".icon-card")].every((card) =>
          card.getAttribute("aria-label")?.startsWith("View flag:")
        )
      ).toBe(true)
      expect(
        host.querySelector(".icon-card use")?.getAttribute("href")
      ).toContain("/flag/")
    },
    ratioCatalog
  )
})

test.each(["language", "other"])(
  "hidden Flag category links recover to the visible circle list: %s",
  async (category) => {
    await withApp(
      `/icons?set=flag&variant=circle&category=${category}`,
      <>
        <App />
        <CatalogHistory />
      </>,
      async (host, click) => {
        await settleCatalog()
        expect(host.querySelector('[aria-label="Icon category"]')).toBeNull()
        expect(host.querySelectorAll(".icon-card")).toHaveLength(2)
        expect(host.querySelectorAll(".virtual-category-heading")).toHaveLength(
          1
        )
        expect(host.querySelector("#catalog [role=status]")?.textContent).toBe(
          "2 icons"
        )
        expect(host.querySelector('[aria-label="Icon set"]')?.textContent).toBe(
          "Flag (7)"
        )
        expect(
          host.querySelector('[aria-label="Flag variant"] [aria-pressed=true]')
            ?.textContent
        ).toBe("circle")
        expect(
          host.querySelector('[aria-label*="View flag:language-"]')
        ).toBeNull()
        expect(
          host.querySelector('[aria-label*="View flag:other-"]')
        ).toBeNull()
        await click('[aria-label="Flag variant"] button:nth-child(1)')
        await settleCatalog()
        expect(
          host.querySelector('[data-testid="catalog-location"]')?.textContent
        ).toBe("/icons?set=flag&variant=1x1")
      },
      ratioCatalog
    )
  }
)

test("Flag ratio changes drop legacy transport while preserving search and anchors through history", async () => {
  await withApp(
    "/icons?set=flag&category=4x3&q=us&transport=fetch#catalog",
    <>
      <App />
      <CatalogHistory />
    </>,
    async (host, click) => {
      await settleCatalog()
      const selectedRatio = () =>
        host.querySelector('[aria-label="Flag variant"] [aria-pressed=true]')
          ?.textContent
      expect(selectedRatio()).toBe("4x3")
      await click('[aria-label="Flag variant"] button:nth-child(1)')
      await settleCatalog()
      expect(selectedRatio()).toBe("1x1")
      expect(
        host.querySelector('[data-testid="catalog-location"]')?.textContent
      ).toBe("/icons?set=flag&q=us&variant=1x1#catalog")
      expect(
        host.querySelector<HTMLInputElement>("input[type=search]")?.value
      ).toBe("us")
      expect(host.querySelectorAll(".icon-card")).toHaveLength(1)
      await click("#catalog-back")
      await settleCatalog()
      expect(selectedRatio()).toBe("4x3")
      await click("#catalog-forward")
      await settleCatalog()
      expect(selectedRatio()).toBe("1x1")
      await click('[aria-label="Clear search"]')
      await settleCatalog()
      expect(selectedRatio()).toBe("1x1")
      expect(host.querySelectorAll(".icon-card")).toHaveLength(2)
    },
    ratioCatalog
  )
})

test("switching sets resets Flag ratios and restores the normal category and style controls", async () => {
  await withApp(
    "/icons?set=flag&category=4x3",
    <App />,
    async (host, click) => {
      const selectSet = async (name: string) => {
        await click('[aria-label="Icon set"]')
        const listId = host
          .querySelector('[aria-label="Icon set"]')!
          .getAttribute("aria-controls")!
        const option = [
          ...document
            .getElementById(listId)!
            .querySelectorAll<HTMLButtonElement>('[role="option"]'),
        ].find((item) => item.textContent?.startsWith(name + " ("))!
        await act(async () => option.click())
        await settleCatalog()
      }
      await settleCatalog()
      await selectSet("Tabler")
      expect(host.querySelector('[aria-label="Flag variant"]')).toBeNull()
      expect(
        host.querySelector('[aria-label="Icon category"]')?.textContent
      ).toBe("All categories")
      expect(
        host.querySelector('[aria-label="Icon style"] [aria-pressed=true]')
          ?.textContent
      ).toBe("Outline")
      await selectSet("Flag")
      expect(
        host.querySelector('[aria-label="Flag variant"] [aria-pressed=true]')
          ?.textContent
      ).toBe("1x1")
      expect(host.querySelector('[aria-label="Icon category"]')).toBeNull()
      await selectSet("Lucide")
      expect(host.querySelector('[aria-label="Flag variant"]')).toBeNull()
      expect(host.querySelector('[aria-label="Icon category"]')).not.toBeNull()
    },
    ratioCatalog
  )
})

for (const route of [
  "/icons?set=circle-flags&q=us&transport=fetch#catalog",
  "/icons?set=flag&category=circle&q=us&transport=fetch#catalog",
]) {
  test(
    "circle deep links select the merged Flag entry and preserve history: " +
      route,
    async () => {
      await withApp(
        route,
        <>
          <App />
          <CatalogHistory />
        </>,
        async (host, click, requests) => {
          const selected = () =>
            host.querySelector(
              '[aria-label="Flag variant"] [aria-pressed=true]'
            )?.textContent
          await settleCatalog()
          expect(selected()).toBe("circle")
          expect(document.title).toBe("Flag Icons – Icones")
          expect(
            host.querySelector('[aria-label="Icon set"]')?.textContent
          ).toBe("Flag (3)")
          expect(host.querySelectorAll(".icon-card")).toHaveLength(1)
          expect(
            host.querySelector(".icon-card")?.getAttribute("aria-label")
          ).toBe("View flag:us-circle details")
          await click('[aria-label="Flag variant"] button:nth-child(1)')
          await settleCatalog()
          expect(selected()).toBe("1x1")
          expect(
            host.querySelector('[data-testid="catalog-location"]')?.textContent
          ).toBe("/icons?set=flag&q=us&variant=1x1#catalog")
          await click("#catalog-back")
          await settleCatalog()
          expect(selected()).toBe("circle")
          expect(
            host.querySelector('[data-testid="catalog-location"]')?.textContent
          ).toBe(route)
          await click("#catalog-forward")
          await settleCatalog()
          expect(selected()).toBe("1x1")
          await click('[aria-label="Flag variant"] button:last-child')
          await settleCatalog()
          expect(selected()).toBe("circle")
          expect(
            host.querySelector('[data-testid="catalog-location"]')?.textContent
          ).toBe("/icons?set=flag&q=us&variant=circle#catalog")
          const request = new URL(
            requests.filter((url) => url.includes("/catalog?")).at(-1)!,
            "https://icons.test"
          )
          expect(request.searchParams.get("set")).toBe("flag")
          expect(request.searchParams.get("category")).toBe("flags")
          expect(request.searchParams.get("q")).toBe("us")
        },
        ratioCatalog
      )
    }
  )
}

test("homepage counts visible Flag artwork once, excluding language and other categories", async () => {
  await withApp(
    "/",
    <App />,
    async (host) => {
      const text = host.querySelector(".hero-background")?.textContent
      expect(text).toContain("9 icons")
      expect(text).toContain("2 icon sets")
    },
    ratioCatalog
  )
})

const phosphorCatalog: CatalogIcon[] = ["outline", "solid"].flatMap((variant) =>
  ["star", "arrow"].map((name) => ({
    name: `phosphor:${name}${variant === "outline" ? "" : "-fill"}`,
    prefix: "phosphor",
    category: name === "star" ? "shapes" : "arrows",
    variant,
    variantAlias: variant === "outline" ? "regular" : "fill",
  }))
)

test("Phosphor toolbar displays aliases in canonical order and writes canonical variant URLs", async () => {
  await withApp(
    "/icons?set=phosphor&variant=thin&q=star&transport=fetch#catalog",
    <>
      <App />
      <CatalogHistory />
    </>,
    async (host, click, requests) => {
      await settleCatalog()
      const styles = () => [
        ...host.querySelectorAll('[aria-label="Icon style"] button'),
      ]
      expect(styles().map((button) => button.textContent)).toEqual([
        "Regular",
        "Fill",
      ])
      expect(styles()[0]!.getAttribute("aria-pressed")).toBe("true")
      expect(host.querySelector('[aria-label="Icon set"]')?.textContent).toBe(
        "Phosphor (2)"
      )
      expect(host.querySelectorAll(".icon-card")).toHaveLength(1)
      expect(host.querySelector(".icon-card")?.getAttribute("aria-label")).toBe(
        "View phosphor:star details"
      )
      await click('[aria-label="Icon style"] button:nth-child(2)')
      await settleCatalog()
      expect(styles()[1]!.getAttribute("aria-pressed")).toBe("true")
      expect(
        host.querySelector('[data-testid="catalog-location"]')?.textContent
      ).toBe("/icons?set=phosphor&q=star&variant=solid#catalog")
      expect(host.querySelector(".icon-card")?.getAttribute("aria-label")).toBe(
        "View phosphor:star-fill details"
      )
      await click("#catalog-back")
      await settleCatalog()
      expect(styles()[0]!.getAttribute("aria-pressed")).toBe("true")
      expect(host.querySelector(".icon-card")?.getAttribute("aria-label")).toBe(
        "View phosphor:star details"
      )
      const pages = requests
        .filter((url) => url.includes("/catalog?"))
        .map((url) => new URL(url, "https://icons.test"))
      expect(
        pages.every((url) =>
          ["outline", "solid"].includes(url.searchParams.get("variant")!)
        )
      ).toBe(true)
    },
    phosphorCatalog
  )
})

test("homepage counts the two published Phosphor styles", async () => {
  await withApp(
    "/",
    <App />,
    async (host) => {
      expect(host.querySelector(".hero-background")?.textContent).toContain(
        "4 icons"
      )
    },
    phosphorCatalog
  )
})

test("removed introduction pages no longer render articles", async () => {
  for (const route of [
    "/guide/react/installation",
    "/guide/vue/what-is-icones",
    "/guide/vanilla/standard/installation",
  ]) {
    await withApp(route, <App />, async (host) => {
      expect(host.querySelector("#guide")).toBeNull()
      expect(host.querySelector("main h1")?.textContent).toContain(
        "This page is not in the collection."
      )
    })
  }
})
