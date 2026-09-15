import { expect, test } from "bun:test"
import { StrictMode, act } from "react"
import { JSDOM } from "jsdom"
import { MemoryRouter } from "react-router"
import { IconConfig } from "@icones/react"
import { Header } from "../src/app/components/header.tsx"
import { themeStorageKey, type Theme } from "../src/shared/theme/theme.ts"

async function withTheme(
  options: { saved?: string; systemDark?: boolean; blockedStorage?: boolean },
  run: (context: {
    host: HTMLElement
    dom: JSDOM
    choose: (theme: Theme) => Promise<void>
    systemChange: (dark: boolean) => Promise<void>
    remount: () => Promise<void>
  }) => Promise<void>
) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://icons.test/",
    pretendToBeVisual: true,
  })
  let systemDark = options.systemDark ?? false
  const media = new dom.window.EventTarget()
  Object.defineProperty(media, "matches", { get: () => systemDark })
  dom.window.matchMedia = (() =>
    media) as unknown as typeof dom.window.matchMedia
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  if (options.saved !== undefined)
    dom.window.localStorage.setItem(themeStorageKey, options.saved)
  if (options.blockedStorage)
    Object.defineProperty(dom.window, "localStorage", {
      get() {
        throw new Error("Storage blocked")
      },
    })
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, value })
  }
  const { createRoot } = await import("react-dom/client")
  const host = dom.window.document.getElementById("root")!
  const root = createRoot(host)
  let revision = 0
  const remount = async () => {
    await act(async () =>
      root.render(
        <StrictMode>
          <MemoryRouter key={revision++}>
            <IconConfig api={false}>
              <Header />
            </IconConfig>
          </MemoryRouter>
        </StrictMode>
      )
    )
  }
  try {
    await remount()
    await run({
      host,
      dom,
      remount,
      choose: async (theme) => {
        await act(async () =>
          host
            .querySelector<HTMLButtonElement>('[aria-label^="Theme:"]')!
            .click()
        )
        const label = theme[0]!.toUpperCase() + theme.slice(1)
        const option = [
          ...host.querySelectorAll<HTMLButtonElement>('[role="option"]'),
        ].find((option) => option.textContent === label)!
        await act(async () => option.click())
        expect(document.documentElement.dataset.theme).toBe(theme)
        expect(
          host
            .querySelector('[aria-label^="Theme:"]')
            ?.getAttribute("aria-expanded")
        ).toBe("false")
      },
      systemChange: async (dark) => {
        systemDark = dark
        await act(async () =>
          media.dispatchEvent(new dom.window.Event("change"))
        )
      },
    })
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

test("theme defaults to system and reacts to system changes", async () => {
  await withTheme({ systemDark: true }, async ({ host, systemChange }) => {
    expect(document.documentElement.dataset.theme).toBe("system")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(
      host.querySelector('[aria-label="Theme: System"] svg')
    ).not.toBeNull()
    expect(
      host.querySelector('[aria-label="Theme: System"]')?.textContent
    ).toBe("")
    await systemChange(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe("light")
    await systemChange(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})

test("manual themes override the system, survive navigation/remount and expose the selected option", async () => {
  await withTheme(
    { systemDark: true },
    async ({ host, dom, choose, systemChange, remount }) => {
      await choose("light")
      expect(document.documentElement.classList.contains("dark")).toBe(false)
      expect(dom.window.localStorage.getItem(themeStorageKey)).toBe("light")
      await systemChange(false)
      await systemChange(true)
      expect(document.documentElement.classList.contains("dark")).toBe(false)
      await act(async () =>
        host.querySelector<HTMLAnchorElement>('nav a[href="/guide"]')!.click()
      )
      expect(host.querySelector('[aria-label="Theme: Light"]')).not.toBeNull()
      await remount()
      expect(document.documentElement.dataset.theme).toBe("light")
      await choose("dark")
      await systemChange(false)
      expect(document.documentElement.classList.contains("dark")).toBe(true)
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>('[aria-label="Theme: Dark"]')!
          .click()
      )
      expect(
        host.querySelector(
          '[data-open="true"] [role="option"][aria-selected="true"]'
        )?.textContent
      ).toBe("Dark")
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>('[aria-label="Theme: Dark"]')!
          .click()
      )
      await choose("system")
      expect(document.documentElement.classList.contains("dark")).toBe(false)
      expect(dom.window.localStorage.getItem(themeStorageKey)).toBe("system")
    }
  )
})

test("theme syncs changes from another tab and falls back to system after storage is cleared", async () => {
  await withTheme(
    { saved: "light", systemDark: true },
    async ({ dom, host }) => {
      dom.window.localStorage.setItem(themeStorageKey, "dark")
      await act(async () =>
        dom.window.dispatchEvent(
          new dom.window.StorageEvent("storage", {
            key: themeStorageKey,
            newValue: "dark",
          })
        )
      )
      expect(document.documentElement.classList.contains("dark")).toBe(true)
      expect(host.querySelector('[aria-label="Theme: Dark"]')).not.toBeNull()
      dom.window.localStorage.clear()
      await act(async () =>
        dom.window.dispatchEvent(
          new dom.window.StorageEvent("storage", { key: null })
        )
      )
      expect(document.documentElement.dataset.theme).toBe("system")
      expect(document.documentElement.classList.contains("dark")).toBe(true)
    }
  )
})

test("theme selection still works when browser storage is blocked", async () => {
  await withTheme({ blockedStorage: true }, async ({ choose }) => {
    expect(document.documentElement.dataset.theme).toBe("system")
    await choose("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    await choose("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})

test("first-paint bootstrap agrees with saved/system themes and tolerates blocked storage", async () => {
  const { themeScript: script } =
    await import("../src/shared/theme/theme-script.ts")
  for (const [saved, systemDark, expected, preference] of [
    ["light", true, false, "light"],
    ["dark", false, true, "dark"],
    ["system", true, true, "system"],
    ["invalid", false, false, "system"],
    [null, true, true, "system"],
  ] as const) {
    const dom = new JSDOM("<!doctype html>", {
      url: "https://icons.test",
      runScripts: "outside-only",
    })
    dom.window.matchMedia = (() => ({
      matches: systemDark,
    })) as unknown as typeof dom.window.matchMedia
    if (saved !== null) dom.window.localStorage.setItem(themeStorageKey, saved)
    else
      Object.defineProperty(dom.window, "localStorage", {
        get() {
          throw new Error("Blocked")
        },
      })
    dom.window.eval(script)
    expect(dom.window.document.documentElement.classList.contains("dark")).toBe(
      expected
    )
    expect(dom.window.document.documentElement.dataset.theme).toBe(preference)
    expect(dom.window.document.documentElement.style.colorScheme).toBe(
      expected ? "dark" : "light"
    )
    dom.window.close()
  }
})
