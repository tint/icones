import { expect, test } from "bun:test"
import { act } from "react"
import { renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import { GuideTocIndicator } from "../src/features/guide/components/toc-indicator.tsx"

async function fixture(
  run: (ui: {
    render: (
      first: number,
      last: number,
      top: number,
      height: number
    ) => Promise<void>
    resize: (top: number, height: number) => Promise<void>
    reduceMotion: (value: boolean) => void
    animations: {
      frames: Keyframe[]
      options: KeyframeAnimationOptions
      playState: string
      cancelled: boolean
    }[]
    window: JSDOM["window"]
    host: HTMLElement
  }) => Promise<void>
) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>')
  let layout = { top: 0, height: 0 }
  let reduced = false
  const listeners = new Set<() => void>()
  const animations: {
    frames: Keyframe[]
    options: KeyframeAnimationOptions
    playState: string
    cancelled: boolean
  }[] = []
  const observers: { update: () => void; connected: boolean }[] = []
  dom.window.matchMedia = (() => ({
    get matches() {
      return reduced
    },
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  })) as unknown as typeof window.matchMedia
  Object.defineProperties(dom.window.HTMLElement.prototype, {
    offsetTop: { get: () => layout.top },
    offsetHeight: { get: () => layout.height },
  })
  dom.window.HTMLElement.prototype.animate = ((
    frames: Keyframe[],
    options: KeyframeAnimationOptions
  ) => {
    const animation = {
      frames,
      options,
      playState: "finished",
      cancelled: false,
      cancel() {
        this.cancelled = true
        this.playState = "idle"
      },
    }
    animations.push(animation)
    return animation
  }) as unknown as typeof HTMLElement.prototype.animate
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      item: (typeof observers)[number]
      constructor(update: () => void) {
        this.item = { update, connected: true }
        observers.push(this.item)
      }
      observe() {}
      disconnect() {
        this.item.connected = false
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
  try {
    await run({
      host,
      window: dom.window,
      animations,
      reduceMotion: (value) => {
        reduced = value
        listeners.forEach((listener) => listener())
      },
      render: async (first, last, top, height) => {
        layout = { top, height }
        await act(async () =>
          root.render(<GuideTocIndicator first={first} last={last} count={6} />)
        )
      },
      resize: async (top, height) => {
        layout = { top, height }
        await act(async () => {
          observers
            .filter((observer) => observer.connected)
            .forEach((observer) => observer.update())
        })
      },
    })
  } finally {
    await act(async () => root.unmount())
    expect(observers.every((observer) => !observer.connected)).toBe(true)
    expect(listeners.size).toBe(0)
    expect(animations.every((animation) => animation.cancelled)).toBe(true)
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

test("TOC indicator eases position and height changes and remeasures wrapped rows", async () => {
  await fixture(async ({ render, resize, animations, host }) => {
    await render(0, 2, 0, 104)
    expect(animations[0]!.frames).toEqual([{ opacity: 0 }, { opacity: 1 }])
    await render(1, 3, 36, 104)
    expect(animations[1]!.frames).toEqual([
      { transform: "translateY(-36px) scaleY(1)" },
      { transform: "translateY(0) scaleY(1)" },
    ])
    expect(animations[1]!.options.duration).toBe(200)
    expect(
      host.querySelector<HTMLElement>("[data-toc-indicator]")!.style.gridRow
    ).toBe("2 / 5")
    await resize(56, 208)
    expect(animations[2]!.frames[0]).toEqual({
      transform: "translateY(-20px) scaleY(0.5)",
    })
    await resize(56, 208)
    expect(animations).toHaveLength(3)
  })
})

test("TOC animation interrupted by fast scrolling resumes from the current visual position", async () => {
  await fixture(async ({ render, animations, window, host }) => {
    await render(0, 2, 0, 100)
    animations[0]!.playState = "running"
    window.DOMMatrixReadOnly = class {
      m42 = 18
      m22 = 0.75
      constructor(value: string) {
        expect(value).toBe("matrix(1, 0, 0, 0.75, 0, 18)")
      }
    } as unknown as typeof DOMMatrixReadOnly
    host.querySelector<HTMLElement>("[data-toc-indicator]")!.style.transform =
      "matrix(1, 0, 0, 0.75, 0, 18)"
    await render(1, 3, 36, 150)
    expect(animations[0]!.cancelled).toBe(true)
    expect(animations[1]!.frames[0]).toEqual({
      transform: "translateY(-18px) scaleY(0.5)",
    })
  })
})

test("TOC indicator respects reduced motion and cancels active animation when preference changes", async () => {
  await fixture(async ({ render, reduceMotion, animations }) => {
    reduceMotion(true)
    await render(0, 2, 0, 104)
    expect(animations).toHaveLength(0)
    reduceMotion(false)
    await render(1, 3, 36, 104)
    expect(animations).toHaveLength(1)
    reduceMotion(true)
    expect(animations[0]!.cancelled).toBe(true)
    await render(2, 4, 72, 104)
    expect(animations).toHaveLength(1)
  })
})

test("TOC indicator remains usable without animation support and renders static HTML", async () => {
  expect(
    renderToString(<GuideTocIndicator first={2} last={4} count={6} />)
  ).toContain("grid-row:3 / 6")
  await fixture(async ({ render, animations, window, host }) => {
    Reflect.deleteProperty(window.HTMLElement.prototype, "animate")
    await render(0, 2, 0, 104)
    await render(2, 4, 72, 104)
    expect(animations).toHaveLength(0)
    expect(
      host.querySelector<HTMLElement>("[data-toc-indicator]")!.style.gridRow
    ).toBe("3 / 6")
  })
})
