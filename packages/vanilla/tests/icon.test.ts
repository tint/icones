import { describe, expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { createIcon, mountIcon, createIconConfig } from "../src"
const data = { body: '<circle cx="12" cy="12" r="10"/>', width: 24, height: 24 }

describe("vanilla icons", () => {
  test("per-set presets, strokes and APIs follow updates", () => {
    const dom = new JSDOM("")
    const scope = createIconConfig({
      defaultSize: "lg",
      sizeValues: { tabler: { lg: 48 }, default: { lg: 24 } },
      strokeWidth: { tabler: 2, default: 3 },
      absoluteStrokeWidth: { tabler: true, default: false },
      api: { tabler: { type: "symbol", baseUrl: "/icons" }, default: false },
      sources: { "lucide:star": data },
    })
    const icon = createIcon(
      { name: "tabler:star" },
      { scope, document: dom.window.document }
    )
    try {
      expect(icon.element.getAttribute("width")).toBe("48")
      expect(icon.element.getAttribute("stroke-width")).toBe("1")
      expect(icon.element.querySelector("use")?.getAttribute("href")).toBe(
        "/icons/tabler/star.svg#icon"
      )
      icon.update({
        name: "tabler:star",
        altName: "lucide:star",
        showAlt: true,
      })
      expect(icon.element.getAttribute("width")).toBe("24")
      expect(icon.element.getAttribute("stroke-width")).toBe("3")
      expect(icon.element.querySelector("circle")).not.toBeNull()
    } finally {
      icon.destroy()
      dom.window.close()
    }
  })
  test("inline pairs update immediately and report each conflict only once", () => {
    const dom = new JSDOM("")
    const error = spyOn(console, "error").mockImplementation(() => {})
    const props = {
      name: "unused:main",
      data,
      altName: "unused:alt",
      altData: { body: '<path d="M0 12h24"/>' },
    }
    const icon = createIcon(props, { document: dom.window.document })
    try {
      expect(icon.element.querySelector("circle")).not.toBeNull()
      expect(error).toHaveBeenCalledTimes(2)
      icon.update({ ...props, showAlt: true })
      expect(icon.element.querySelector("path")).not.toBeNull()
      expect(icon.element.querySelector("circle")).toBeNull()
      icon.update({ ...props, altData: data, showAlt: true })
      expect(icon.element.querySelector("circle")).not.toBeNull()
      expect(icon.element.querySelector("path")).toBeNull()
      expect(icon.element.hasAttribute("altData")).toBe(false)
      expect(error).toHaveBeenCalledTimes(2)
    } finally {
      icon.destroy()
      dom.window.close()
      error.mockRestore()
    }
  })
  test("set defaults follow the active source and explicit size during updates", () => {
    const dom = new JSDOM("")
    const scope = createIconConfig({
      defaultSize: { tabler: "lg", default: "md" },
      sources: { "tabler:star": data, "lucide:star": data },
      api: false,
    })
    const icon = createIcon(
      { name: "tabler:star" },
      { scope, document: dom.window.document }
    )
    try {
      expect(icon.element.getAttribute("width")).toBe("24")
      icon.update({
        name: "tabler:star",
        altName: "lucide:star",
        showAlt: true,
      })
      expect(icon.element.getAttribute("width")).toBe("20")
      icon.update({ name: "tabler:star", size: 32 })
      expect(icon.element.getAttribute("width")).toBe("32")
      icon.update({ data })
      expect(icon.element.getAttribute("width")).toBe("20")
    } finally {
      icon.destroy()
      dom.window.close()
    }
  })
  test("creates an SVG with native attributes, updates and removes it", () => {
    const document = new JSDOM("<main/>").window.document
    const icon = mountIcon(document.querySelector("main")!, {
      data,
      class: "icon",
      size: 32,
      "aria-label": "circle",
    })
    expect(icon.element.namespaceURI).toBe("http://www.w3.org/2000/svg")
    expect(icon.element.querySelector("circle")).not.toBeNull()
    expect(icon.element.getAttribute("width")).toBe("32")
    expect(icon.element.hasAttribute("aria-hidden")).toBe(false)
    icon.update({ data, color: "red", attributes: { "data-test": "ok" } })
    expect(icon.element.hasAttribute("class")).toBe(false)
    expect(icon.element.getAttribute("color")).toBe("red")
    expect(icon.element.getAttribute("data-test")).toBe("ok")
    icon.destroy()
    expect(document.querySelector("svg")).toBeNull()
    expect(() => icon.update({ data })).toThrow("destroyed")
  })
  test("loads asynchronously and shares scope caches", async () => {
    const document = new JSDOM("").window.document
    let calls = 0
    const scope = createIconConfig({
      api: async () => {
        calls++
        return data
      },
      defaultSize: "xl",
    })
    const first = createIcon({ name: "remote" }, { scope, document })
    const second = createIcon({ name: "remote" }, { scope, document })
    await Promise.all([first.load(), second.load()])
    expect(calls).toBe(1)
    expect(first.element.getAttribute("data-state")).toBe("loaded")
    expect(second.element.getAttribute("width")).toBe("28")
    first.destroy()
    second.destroy()
  })
  test("symbol references use the configured endpoint without fetching", () => {
    const document = new JSDOM("").window.document
    const scope = createIconConfig({
      api: { type: "symbol", baseUrl: "/icons" },
    })
    const icon = createIcon({ name: "tabler:star" }, { document, scope })
    expect(icon.element.querySelector("use")?.getAttribute("href")).toContain(
      "/icons/tabler/star.svg#icon"
    )
    expect(icon.element.getAttribute("data-state")).toBe("referenced")
    icon.destroy()
  })
})
