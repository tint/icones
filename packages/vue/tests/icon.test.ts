import { afterEach, describe, expect, test, vi } from "vitest"
import { createApp, h, nextTick, ref, type App } from "vue"
import { Icon, IconConfig, createIconScope } from "@icones/vue"
const circle = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}
const path = { body: '<path d="M0 12h24"/>', width: 24, height: 24 }
const apps: App[] = []
const hosts: HTMLElement[] = []
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div")
  document.body.append(host)
  const app = createApp({ render })
  app.mount(host)
  apps.push(app)
  hosts.push(host)
  return host
}
afterEach(() => {
  apps.splice(0).forEach((app) => app.unmount())
  hosts.splice(0).forEach((host) => host.remove())
})

describe("Vue Icon", () => {
  test("reactive per-set presets, strokes and APIs share the same active set", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {})
    const alternate = ref(false)
    const absolute = ref(true)
    const runtimeName: string = "runtime:shape"
    const alternativeName: string = "local:shape"
    try {
      const host = mount(() =>
        h(
          IconConfig,
          {
            defaultSize: "lg",
            sizeValues: { runtime: { lg: 48 }, default: { lg: 24 } },
            strokeWidth: { runtime: 2, default: 3 },
            absoluteStrokeWidth: { runtime: absolute.value, default: false },
            api: {
              runtime: { type: "symbol", baseUrl: "/icons" },
              default: false,
            },
            sources: { [alternativeName]: path },
          },
          () =>
            h(Icon, {
              name: runtimeName,
              altName: alternativeName,
              showAlt: alternate.value,
            })
        )
      )
      const svg = () => host.querySelector("svg")!
      expect(svg().getAttribute("width")).toBe("48")
      expect(svg().getAttribute("stroke-width")).toBe("1")
      expect(svg().querySelector("use")?.getAttribute("href")).toBe(
        "/icons/runtime/shape.svg#icon"
      )
      absolute.value = false
      await nextTick()
      expect(svg().getAttribute("stroke-width")).toBe("2")
      alternate.value = true
      await nextTick()
      expect(svg().getAttribute("width")).toBe("24")
      expect(svg().getAttribute("stroke-width")).toBe("3")
      expect(svg().querySelector("path")).not.toBeNull()
      expect(warning).not.toHaveBeenCalled()
    } finally {
      warning.mockRestore()
    }
  })
  test("inline pairs switch reactively and report each conflict only once", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const alternate = ref(false)
    const altData = ref(path)
    try {
      const host = mount(() =>
        h(Icon, {
          name: "unused:main",
          data: circle,
          altName: "unused:alt",
          altData: altData.value,
          showAlt: alternate.value,
        })
      )
      expect(host.querySelector("circle")).not.toBeNull()
      expect(error).toHaveBeenCalledTimes(2)
      alternate.value = true
      await nextTick()
      expect(host.querySelector("path")).not.toBeNull()
      expect(host.querySelector("circle")).toBeNull()
      altData.value = circle
      await nextTick()
      expect(host.querySelector("circle")).not.toBeNull()
      expect(host.querySelector("path")).toBeNull()
      expect(host.querySelector("svg")!.hasAttribute("altData")).toBe(false)
      expect(error).toHaveBeenCalledTimes(2)
    } finally {
      error.mockRestore()
    }
  })
  test("merges reactive set defaults and follows the active alternative", async () => {
    const alternate = ref(false)
    const size = ref(32)
    const host = mount(() =>
      h(
        IconConfig,
        {
          sources: { "tabler:star": circle, "lucide:star": path },
          api: false,
          defaultSize: { tabler: "lg", default: "md" },
        },
        () =>
          h(IconConfig, { defaultSize: { lucide: size.value } }, () =>
            h(Icon, {
              name: "tabler:star",
              altName: "lucide:star",
              showAlt: alternate.value,
            })
          )
      )
    )
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("24")
    alternate.value = true
    await nextTick()
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("32")
    size.value = 40
    await nextTick()
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("40")
  })
  test("inherits nested configuration and reacts to sources, sizes and alternatives", async () => {
    const alternate = ref(false)
    const size = ref<"sm" | "xl">("sm")
    const host = mount(() =>
      h(
        IconConfig,
        { sources: { local: circle, alt: path }, defaultSize: size.value },
        () =>
          h(IconConfig, { strokeWidth: 2 }, () =>
            h(Icon, {
              name: "local",
              altName: "alt",
              showAlt: alternate.value,
              "aria-label": "shape",
              class: "icon",
            })
          )
      )
    )
    expect(host.querySelector("circle")).not.toBeNull()
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("16")
    expect(host.querySelector("svg")?.hasAttribute("aria-hidden")).toBe(false)
    alternate.value = true
    size.value = "xl"
    await nextTick()
    expect(host.querySelector("path")).not.toBeNull()
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("28")
    expect(host.querySelector("svg")?.getAttribute("class")).toBe("icon")
  })
  test("loads async icons, ignores stale results and renders fallback slots", async () => {
    let resolve!: (data: typeof circle) => void
    const scope = createIconScope({
      api: (name) =>
        name === "slow"
          ? new Promise<typeof circle>((done) => {
              resolve = done
            })
          : path,
    })
    const name = ref("slow")
    const host = mount(() =>
      h(
        Icon,
        { name: name.value, scope },
        { fallback: () => h("span", "Loading") }
      )
    )
    expect(host.textContent).toBe("Loading")
    await expect.poll(() => typeof resolve).toBe("function")
    name.value = "fast"
    await expect.poll(() => host.querySelector("path")).not.toBeNull()
    resolve(circle)
    await nextTick()
    expect(host.querySelector("circle")).toBeNull()
  })
  test("preserves SVG events, styles and unique ids", async () => {
    const data = {
      body: '<defs><linearGradient id="a"/></defs><path fill="url(#a)"/>',
      width: 24,
      height: 24,
    }
    let clicks = 0
    const host = mount(() =>
      h("div", [
        h(Icon, { data, onClick: () => clicks++, style: { color: "red" } }),
        h(Icon, { data }),
      ])
    )
    const icons = host.querySelectorAll("svg")
    icons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(clicks).toBe(1)
    expect(icons[0].style.color).toBe("red")
    expect(icons[0].querySelector("linearGradient")?.id).not.toBe(
      icons[1].querySelector("linearGradient")?.id
    )
  })
})
