import { expect, test } from "bun:test"
import { act } from "react"
import { renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import { MemoryRouter } from "react-router"
import {
  Link,
  LocalizedRoutingProvider,
  useLocation,
  useNavigate,
} from "../src/shared/routing/router.tsx"

test("app locale routing hydrates static HTML before applying URL filters without losing navigation state", async () => {
  function Page() {
    const location = useLocation()
    const navigate = useNavigate()
    return (
      <>
        <output>{location.pathname + location.search}</output>
        <Link to="/guide/react/color">Guide</Link>
        <button
          onClick={() =>
            void navigate({
              pathname: "/icons",
              search: "?set=lucide&q=star",
              hash: "#catalog",
            })
          }
        >
          Filter
        </button>
        <span>{location.hash}</span>
      </>
    )
  }
  for (const prefix of ["", "/zh-CN"]) {
    const query = "?set=flag&variant=circle&q=china"
    const render = (search: string) => (
      <MemoryRouter initialEntries={[prefix + "/icons" + search]}>
        <LocalizedRoutingProvider value={prefix}>
          <Page />
        </LocalizedRoutingProvider>
      </MemoryRouter>
    )
    const html = renderToString(render(""))
    await withDOM(async (container) => {
      const { hydrateRoot } = await import("react-dom/client")
      container.innerHTML = html
      const errors: unknown[] = []
      let root: ReturnType<typeof hydrateRoot> | undefined
      try {
        await act(async () => {
          root = hydrateRoot(container, render(query), {
            onRecoverableError: (error) => errors.push(error),
          })
        })
        expect(errors).toEqual([])
        expect(container.querySelector("output")?.textContent).toBe(
          "/icons" + query
        )
        expect(container.querySelector("a")?.getAttribute("href")).toBe(
          prefix + "/guide/react/color"
        )
        await act(async () => container.querySelector("button")!.click())
        expect(container.querySelector("output")?.textContent).toBe(
          "/icons?set=lucide&q=star"
        )
        expect(container.querySelector("span")?.textContent).toBe("#catalog")
        expect(errors).toEqual([])
      } finally {
        await act(async () => root?.unmount())
      }
    })
  }
})

async function withDOM(run: (container: HTMLElement) => Promise<void>) {
  const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', {
    url: "https://example.test/",
  })
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [name, value] of Object.entries(globals)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    })
  }
  try {
    await run(dom.window.document.getElementById("root")!)
  } finally {
    dom.window.close()
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  }
}
