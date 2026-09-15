import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { observeGuideSections } from "../src/features/guide/observe-sections.ts"

function environment() {
  const dom = new JSDOM(
    '<!doctype html><header></header><main><section id="react"></section><section id="vue"></section><section id="svelte"></section></main>'
  )
  const sections = [...dom.window.document.querySelectorAll("section")].map(
    (element) => ({ id: element.id, element })
  )
  const header = dom.window.document.querySelector("header")!
  const calls = { rectangles: 0, headerHeight: 0 }
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => {
    calls.rectangles++
    return { top: 0, bottom: 72, height: 72 } as DOMRect
  }
  Object.defineProperty(header, "offsetHeight", {
    get: () => {
      calls.headerHeight++
      return 72
    },
  })
  const intersections: IntersectionMock[] = []
  class IntersectionMock {
    observed: Element[] = []
    disconnected = false
    constructor(
      public callback: IntersectionObserverCallback,
      public options: IntersectionObserverInit
    ) {
      intersections.push(this)
    }
    observe(element: Element) {
      this.observed.push(element)
    }
    disconnect() {
      this.disconnected = true
    }
    emit(
      values: {
        index: number
        visible: boolean
        height?: number
        width?: number
      }[]
    ) {
      this.callback(
        values.map(
          ({ index, visible, height = 1, width = 100 }) =>
            ({
              target: sections[index]!.element,
              isIntersecting: visible,
              intersectionRect: { height, width },
            }) as unknown as IntersectionObserverEntry
        ),
        this as unknown as IntersectionObserver
      )
    }
  }
  dom.window.IntersectionObserver =
    IntersectionMock as unknown as typeof IntersectionObserver
  const resizes: ResizeMock[] = []
  class ResizeMock {
    observed: Element[] = []
    disconnected = false
    constructor(public callback: ResizeObserverCallback) {
      resizes.push(this)
    }
    observe(element: Element) {
      this.observed.push(element)
    }
    disconnect() {
      this.disconnected = true
    }
    emit(height: number) {
      this.callback(
        [
          {
            target: header,
            borderBoxSize: [{ blockSize: height }],
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      )
    }
  }
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    ResizeObserver: ResizeMock,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  const updates: string[][] = []
  const disconnect = observeGuideSections(sections, header, (ids) =>
    updates.push(ids)
  )
  return {
    sections,
    header,
    calls,
    intersections,
    resizes,
    updates,
    disconnect,
    window: dom.window,
    cleanup() {
      disconnect()
      dom.window.close()
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    },
  }
}

test("native section visibility uses observer entries without measuring rectangles while scrolling", () => {
  const ui = environment()
  try {
    expect(ui.intersections[0]!.observed).toEqual(
      ui.sections.map(({ element }) => element)
    )
    expect(ui.intersections[0]!.options.rootMargin).toBe("-72px 0px 0px 0px")
    expect(ui.resizes[0]!.observed).toEqual([ui.header])
    for (let i = 0; i < 100; i++)
      ui.window.dispatchEvent(new ui.window.Event("scroll"))
    ui.intersections[0]!.emit([
      { index: 2, visible: true },
      { index: 0, visible: true },
      { index: 1, visible: true },
    ])
    expect(ui.updates).toEqual([["react", "vue", "svelte"]])
    ui.intersections[0]!.emit([{ index: 1, visible: true }])
    expect(ui.updates).toHaveLength(1)
    ui.intersections[0]!.emit([{ index: 0, visible: false }])
    expect(ui.updates.at(-1)).toEqual(["vue", "svelte"])
    expect(ui.calls).toEqual({ rectangles: 0, headerHeight: 1 })
  } finally {
    ui.cleanup()
  }
})

test("edge contact does not highlight a section until its intersection has positive area", () => {
  const ui = environment()
  try {
    const observer = ui.intersections[0]!
    expect(observer.options.threshold).toEqual([0, Number.EPSILON])
    observer.emit([
      { index: 0, visible: true, height: 0 },
      { index: 1, visible: true, width: 0 },
    ])
    expect(ui.updates).toEqual([])
    observer.emit([{ index: 0, visible: true, height: 0.01 }])
    expect(ui.updates).toEqual([["react"]])
    observer.emit([{ index: 0, visible: true, height: 0 }])
    expect(ui.updates.at(-1)).toEqual([])
  } finally {
    ui.cleanup()
  }
})

test("only header size changes rebuild the observer, using ResizeObserver measurements", () => {
  const ui = environment()
  try {
    const first = ui.intersections[0]!
    first.emit([{ index: 0, visible: true }])
    ui.resizes[0]!.emit(72)
    expect(ui.intersections).toHaveLength(1)
    ui.resizes[0]!.emit(96)
    expect(ui.intersections).toHaveLength(2)
    expect(first.disconnected).toBe(true)
    expect(ui.intersections[1]!.options.rootMargin).toBe("-96px 0px 0px 0px")
    first.emit([{ index: 0, visible: false }])
    expect(ui.updates).toEqual([["react"]])
    ui.intersections[1]!.emit([{ index: 1, visible: true }])
    expect(ui.updates.at(-1)).toEqual(["vue"])
    expect(ui.calls).toEqual({ rectangles: 0, headerHeight: 1 })
    ui.disconnect()
    const updateCount = ui.updates.length
    ui.intersections[1]!.emit([{ index: 2, visible: true }])
    ui.resizes[0]!.emit(120)
    expect(ui.updates).toHaveLength(updateCount)
    expect(ui.intersections).toHaveLength(2)
    expect(ui.resizes[0]!.disconnected).toBe(true)
  } finally {
    ui.cleanup()
  }
})
