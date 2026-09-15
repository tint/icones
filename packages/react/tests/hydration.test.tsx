import { expect, test } from "bun:test"
import { act, createRef, StrictMode } from "react"
import { useState } from "react"
import { renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import {
  createIconStore,
  Icon,
  IconConfig,
  type IconLoader,
} from "@icones/react"

const line = { body: '<path d="M2 12h20"/>' }

const circle = { body: '<circle cx="12" cy="12" r="10"/>' }

test("hydrates remote symbol URLs without preloading and switches transport on mount", async () => {
  const api = { type: "symbol" as const, baseUrl: "/icons" }
  const render = (store: ReturnType<typeof createIconStore>) => (
    <IconConfig store={store}>
      <Icon name="tabler:star" />
    </IconConfig>
  )
  const html = renderToString(render(createIconStore({ api })))
  await withDOM(async (container) => {
    const { hydrateRoot } = await import("react-dom/client")
    container.innerHTML = html
    const errors: unknown[] = []
    const symbolStore = createIconStore({ api })
    let requests = 0
    const fetchStore = createIconStore({
      api: async () => {
        requests++
        return circle
      },
    })
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, render(symbolStore), {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      expect(errors).toEqual([])
      expect(container.querySelector("use")?.getAttribute("href")).toBe(
        "/icons/tabler/star.svg#icon"
      )
      expect(container.querySelector("svg")?.dataset.state).toBe("referenced")
      expect(symbolStore.snapshot()).toEqual({})
      await act(async () => root!.render(render(fetchStore)))
      expect(requests).toBe(1)
      expect(container.querySelector("use")).toBeNull()
      expect(container.querySelector("circle")).not.toBeNull()
      await act(async () => root!.render(render(symbolStore)))
      expect(container.querySelector("use")?.getAttribute("href")).toBe(
        "/icons/tabler/star.svg#icon"
      )
      expect(requests).toBe(1)
    } finally {
      await act(async () => root?.unmount())
    }
  })
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

function pendingLoader() {
  const requests: {
    name: string
    signal: AbortSignal | undefined
    finish: (data: typeof line) => void
  }[] = []
  const loader: IconLoader = (name, _parsed, context) =>
    new Promise((resolve) => {
      requests.push({ name, signal: context?.signal, finish: resolve })
    })
  return { loader, requests }
}

for (const strict of [false, true]) {
  test(`private loaders cancel on name changes, replacement and unmount (StrictMode: ${strict})`, async () => {
    await withDOM(async (container) => {
      const { createRoot } = await import("react-dom/client")
      const root = createRoot(container)
      const first = pendingLoader()
      const replacement = pendingLoader()
      const parent = createIconStore({ api: false })
      const render = (name: string, loader: IconLoader) => {
        const icon = (
          <IconConfig store={parent}>
            <Icon name={name} loader={loader} />
          </IconConfig>
        )
        return strict ? <StrictMode>{icon}</StrictMode> : icon
      }
      try {
        await act(async () => root.render(render("x:first", first.loader)))
        expect(first.requests).toHaveLength(1)
        expect(first.requests[0]!.signal?.aborted).toBe(false)
        await act(async () => root.render(render("x:second", first.loader)))
        expect(first.requests[0]!.signal?.aborted).toBe(true)
        expect(first.requests).toHaveLength(2)
        await act(async () =>
          root.render(render("x:second", replacement.loader))
        )
        expect(first.requests[1]!.signal?.aborted).toBe(true)
        expect(replacement.requests).toHaveLength(1)
        await act(async () =>
          first.requests.forEach((request) => request.finish(line))
        )
        expect(container.querySelector("path")).toBeNull()
        expect(container.querySelector("svg")?.dataset.state).toBe("loading")
        await act(async () => root.render(null))
        expect(replacement.requests[0]!.signal?.aborted).toBe(true)
        await act(async () =>
          root.render(render("x:third", replacement.loader))
        )
        expect(replacement.requests).toHaveLength(2)
        expect(replacement.requests[1]!.signal?.aborted).toBe(false)
        await act(async () => {
          replacement.requests[0]!.finish(line)
          replacement.requests[1]!.finish(circle)
        })
        expect(container.querySelector("path")).toBeNull()
        expect(container.querySelector("circle")).not.toBeNull()
      } finally {
        await act(async () => root.unmount())
        for (const request of [...first.requests, ...replacement.requests])
          request.finish(line)
        parent.invalidate()
      }
    })
  })
}

test("switching to inline data cancels the component's previous private request", async () => {
  await withDOM(async (container) => {
    const { createRoot } = await import("react-dom/client")
    const root = createRoot(container)
    const { loader, requests } = pendingLoader()
    try {
      await act(async () =>
        root.render(<Icon name="x:pending" loader={loader} />)
      )
      await act(async () => root.render(<Icon data={circle} loader={loader} />))
      expect(requests[0]!.signal?.aborted).toBe(true)
      await act(async () => requests[0]!.finish(line))
      expect(container.querySelector("path")).toBeNull()
      expect(container.querySelector("circle")).not.toBeNull()
    } finally {
      await act(async () => root.unmount())
      requests.forEach((request) => request.finish(line))
    }
  })
})

test("unmounting consumers does not cancel requests owned by a shared store", async () => {
  await withDOM(async (container) => {
    const { createRoot } = await import("react-dom/client")
    const root = createRoot(container)
    const { loader, requests } = pendingLoader()
    const store = createIconStore({ api: loader })
    const render = (count: number) => (
      <StrictMode>
        <IconConfig store={store}>
          {Array.from({ length: count }, (_, index) => (
            <Icon key={index} name="x:shared" />
          ))}
        </IconConfig>
      </StrictMode>
    )
    try {
      await act(async () => root.render(render(2)))
      expect(requests).toHaveLength(1)
      await act(async () => root.render(render(1)))
      expect(requests[0]!.signal?.aborted).toBe(false)
      expect(container.querySelector("svg")?.dataset.state).toBe("loading")
      await act(async () => root.render(null))
      expect(requests[0]!.signal?.aborted).toBe(false)
      await act(async () => requests[0]!.finish(line))
      expect(store.getState("x:shared").data).toEqual(line)
    } finally {
      await act(async () => root.unmount())
      store.invalidate()
      requests.forEach((request) => request.finish(line))
    }
  })
})

for (const transport of ["sources", "symbol"]) {
  test(`React can mount ${transport} icons over capacity without snapshot churn`, async () => {
    const names = Array.from({ length: 20 }, (_, index) => `x:icon-${index}`)
    const options =
      transport === "sources"
        ? {
            sources: Object.fromEntries(names.map((name) => [name, line])),
            api: false as const,
          }
        : { api: { type: "symbol" as const, baseUrl: "/icons" } }
    await withDOM(async (container) => {
      const { createRoot } = await import("react-dom/client")
      const root = createRoot(container)
      const store = createIconStore({ ...options, maxEntries: 2 })
      const render = (color: string) => (
        <StrictMode>
          <IconConfig store={store}>
            {names.map((name) => (
              <Icon key={name} name={name} color={color} />
            ))}
          </IconConfig>
        </StrictMode>
      )
      try {
        await act(async () => root.render(render("red")))
        expect(container.querySelectorAll("svg")).toHaveLength(names.length)
        expect(
          container.querySelectorAll(options.sources ? "path" : "use")
        ).toHaveLength(names.length)
        const states = names.map((name) => store.getState(name))
        await act(async () => root.render(render("blue")))
        names.forEach((name, index) =>
          expect(store.getState(name)).toBe(states[index]!)
        )
        expect(container.querySelectorAll('svg[color="blue"]')).toHaveLength(
          names.length
        )
        await act(async () => root.render(null))
        expect(Object.keys(store.snapshot()).length).toBeLessThanOrEqual(2)
      } finally {
        await act(async () => root.unmount())
        store.invalidate()
      }
    })
  })
}

test("mounted dynamic icons fetch once, update, and ignore a previous name's late response", async () => {
  await withDOM(async (container) => {
    const { createRoot } = await import("react-dom/client")
    const root = createRoot(container)
    const requests: string[] = []
    let finishOld!: (value: typeof line) => void
    const store = createIconStore({
      api: async (name) => {
        requests.push(name)
        if (name === "tabler:old")
          return new Promise<typeof line>((resolve) => {
            finishOld = resolve
          })
        return circle
      },
    })
    const render = (name: string) => (
      <IconConfig store={store}>
        <Icon name={`tabler:${name}`} />
        <Icon name={`tabler:${name}`} />
      </IconConfig>
    )
    try {
      await act(async () => root.render(render("old")))
      expect(container.querySelectorAll('[data-state="loading"]')).toHaveLength(
        2
      )
      await act(async () => root.render(render("new")))
      expect(container.querySelectorAll("circle")).toHaveLength(2)
      await act(async () => {
        finishOld(line)
      })
      expect(container.querySelectorAll("circle")).toHaveLength(2)
      expect(container.querySelector("path")).toBeNull()
      expect(requests).toEqual(["tabler:old", "tabler:new"])
    } finally {
      await act(async () => root.unmount())
    }
  })
})

test("hydrates server-preloaded API data without mismatch or another fetch", async () => {
  const serverStore = createIconStore({ api: async () => line })
  await serverStore.preload(["tabler:refresh"])
  const render = (store: typeof serverStore) => (
    <IconConfig store={store}>
      <Icon name="tabler:refresh" />
    </IconConfig>
  )
  const html = renderToString(render(serverStore))
  await withDOM(async (container) => {
    const { hydrateRoot } = await import("react-dom/client")
    container.innerHTML = html
    let requests = 0
    const clientStore = createIconStore({
      initialData: JSON.parse(JSON.stringify(serverStore.snapshot())),
      api: async () => {
        requests++
        return circle
      },
    })
    const errors: unknown[] = []
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, render(clientStore), {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      expect(errors).toEqual([])
      expect(requests).toBe(0)
      expect(container.querySelectorAll("path")).toHaveLength(1)
      expect(container.querySelector("svg")?.dataset.state).toBe("loaded")
    } finally {
      await act(async () => root?.unmount())
    }
  })
})

test("style buttons request filled data only on selection and reuse outline when switching back", async () => {
  await withDOM(async (container) => {
    const { createRoot } = await import("react-dom/client")
    const root = createRoot(container)
    const requests: string[] = []
    const store = createIconStore({
      api: async (name) => {
        requests.push(name)
        return name.endsWith("-filled") ? circle : line
      },
    })
    function Example() {
      const [style, setStyle] = useState<"outline" | "solid">("outline")
      return (
        <IconConfig store={store}>
          <button type="button" onClick={() => setStyle("outline")}>
            Outline
          </button>
          <button type="button" onClick={() => setStyle("solid")}>
            Solid
          </button>
          <Icon name={`tabler:heart${style === "solid" ? "-filled" : ""}`} />
          <Icon name="tabler:heart" />
        </IconConfig>
      )
    }
    try {
      await act(async () => root.render(<Example />))
      expect(container.querySelectorAll("path")).toHaveLength(2)
      expect(requests).toEqual(["tabler:heart"])
      await act(async () => container.querySelectorAll("button")[1]!.click())
      expect(container.querySelectorAll("circle")).toHaveLength(1)
      expect(container.querySelectorAll("path")).toHaveLength(1)
      expect(
        container
          .querySelector('[data-icon="tabler:heart-filled"]')
          ?.getAttribute("data-state")
      ).toBe("loaded")
      await act(async () => container.querySelectorAll("button")[0]!.click())
      expect(container.querySelectorAll("path")).toHaveLength(2)
      expect(requests).toEqual(["tabler:heart", "tabler:heart-filled"])
    } finally {
      await act(async () => root.unmount())
    }
  })
})

test("hydrates solid data independently from outline data", async () => {
  const initialData = { "tabler:heart": line, "tabler:heart-filled": circle }
  const store = createIconStore({ initialData, api: false })
  const render = (value: typeof store) => (
    <IconConfig store={value}>
      <Icon name="tabler:heart" />
      <Icon name="tabler:heart-filled" />
    </IconConfig>
  )
  const html = renderToString(render(store))
  await withDOM(async (container) => {
    const { hydrateRoot } = await import("react-dom/client")
    container.innerHTML = html
    const errors: unknown[] = []
    let requests = 0
    const clientStore = createIconStore({
      initialData: JSON.parse(JSON.stringify(store.snapshot())),
      api: () => {
        requests++
        return null
      },
    })
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, render(clientStore), {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      expect(errors).toEqual([])
      expect(requests).toBe(0)
      expect(container.querySelectorAll("circle")).toHaveLength(1)
      expect(container.querySelectorAll("path")).toHaveLength(1)
    } finally {
      await act(async () => root?.unmount())
    }
  })
})

test("React forwards native props, refs and current events without rebuilding unchanged artwork", async () => {
  await withDOM(async (container) => {
    const { createRoot } = await import("react-dom/client")
    const root = createRoot(container)
    let reads = 0
    const data = {
      get body() {
        reads++
        return line.body
      },
    }
    const ref = createRef<SVGSVGElement>()
    const clicks: string[] = []
    const render = (revision: string) => (
      <Icon
        data={data}
        ref={ref}
        className={revision}
        data-revision={revision}
        style={{ opacity: revision === "first" ? 0.5 : 1 }}
        onClick={() => clicks.push(revision)}
      />
    )
    try {
      await act(async () => root.render(render("first")))
      const svg = container.querySelector("svg")!
      const path = svg.querySelector("path")
      const previousReads = reads
      expect(previousReads).toBeGreaterThan(0)
      expect(ref.current).toBe(svg)
      await act(async () =>
        svg.dispatchEvent(new window.MouseEvent("click", { bubbles: true }))
      )
      await act(async () => root.render(render("second")))
      expect(reads).toBe(previousReads)
      expect(ref.current).toBe(svg)
      expect(svg.querySelector("path") === path).toBe(true)
      expect(svg.getAttribute("class")).toBe("second")
      expect(svg.dataset.revision).toBe("second")
      expect(svg.style.opacity).toBe("1")
      await act(async () =>
        svg.dispatchEvent(new window.MouseEvent("click", { bubbles: true }))
      )
      expect(clicks).toEqual(["first", "second"])
      await act(async () => root.render(null))
      expect(ref.current).toBeNull()
    } finally {
      await act(async () => root.unmount())
    }
  })
})

test("shared rendering keeps SVG definitions unique and hydration-stable in React", async () => {
  const data = {
    body: '<defs><mask id="mask"><path d="M0 0h24v24z"/></mask></defs><circle mask="url(#mask)" cx="12" cy="12" r="8"/>',
  }
  const render = () => (
    <StrictMode>
      <Icon data={data} />
      <Icon data={data} />
    </StrictMode>
  )
  const html = renderToString(render())
  await withDOM(async (container) => {
    const { hydrateRoot } = await import("react-dom/client")
    container.innerHTML = html
    const before = container.innerHTML
    const errors: unknown[] = []
    let root: ReturnType<typeof hydrateRoot> | undefined
    try {
      await act(async () => {
        root = hydrateRoot(container, render(), {
          onRecoverableError: (error) => errors.push(error),
        })
      })
      expect(errors).toEqual([])
      expect(container.innerHTML).toBe(before)
      const icons = [...container.querySelectorAll("svg")]
      const ids = icons.map((svg) => svg.querySelector("mask")!.id)
      expect(new Set(ids).size).toBe(2)
      icons.forEach((svg, index) => {
        expect(svg.querySelector("circle")?.getAttribute("mask")).toBe(
          `url(#${ids[index]})`
        )
      })
    } finally {
      await act(async () => root?.unmount())
    }
  })
})
