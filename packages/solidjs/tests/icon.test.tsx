import { afterEach, describe, expect, test, vi } from "vitest"
import { createSignal } from "solid-js"
import { render } from "solid-js/web"
import { Icon, IconConfig, createIconScope } from "@icones/solidjs"
const circle = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}
const path = { body: '<path d="M0 12h24"/>', width: 24, height: 24 }
const cleanups: (() => void)[] = []
function mount(view: Parameters<typeof render>[0]) {
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(view, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  return host
}
afterEach(() => cleanups.splice(0).forEach((dispose) => dispose()))

describe("Solid Icon", () => {
  test("reactive per-set presets, strokes and APIs share the same active set", async () => {
    const [alternate, setAlternate] = createSignal(false)
    const runtimeName: string = "runtime:shape"
    const alternativeName: string = "local:shape"
    const host = mount(() => (
      <IconConfig
        defaultSize="lg"
        sizeValues={{ runtime: { lg: 48 }, default: { lg: 24 } }}
        strokeWidth={{ runtime: 2, default: 3 }}
        absoluteStrokeWidth={{ runtime: true, default: false }}
        api={{ runtime: { type: "symbol", baseUrl: "/icons" }, default: false }}
        sources={{ [alternativeName]: path }}
      >
        <Icon
          name={runtimeName}
          altName={alternativeName}
          showAlt={alternate()}
        />
      </IconConfig>
    ))
    const svg = () => host.querySelector("svg")!
    expect(svg().getAttribute("width")).toBe("48")
    expect(svg().getAttribute("stroke-width")).toBe("1")
    expect(svg().querySelector("use")?.getAttribute("href")).toBe(
      "/icons/runtime/shape.svg#icon"
    )
    setAlternate(true)
    await expect.poll(() => svg().getAttribute("width")).toBe("24")
    expect(svg().getAttribute("stroke-width")).toBe("3")
    expect(svg().querySelector("path")).not.toBeNull()
  })
  test("inline pairs switch reactively and report each conflict only once", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const [alternate, setAlternate] = createSignal(false)
    const [altData, setAltData] = createSignal(path)
    try {
      const host = mount(() => (
        <Icon
          name="unused:main"
          data={circle}
          altName="unused:alt"
          altData={altData()}
          showAlt={alternate()}
        />
      ))
      expect(host.querySelector("circle")).not.toBeNull()
      expect(error).toHaveBeenCalledTimes(2)
      setAlternate(true)
      await expect.poll(() => host.querySelector("path")).not.toBeNull()
      expect(host.querySelector("circle")).toBeNull()
      setAltData(circle)
      await expect.poll(() => host.querySelector("circle")).not.toBeNull()
      expect(host.querySelector("path")).toBeNull()
      expect(host.querySelector("svg")!.hasAttribute("altData")).toBe(false)
      expect(error).toHaveBeenCalledTimes(2)
    } finally {
      error.mockRestore()
    }
  })
  test("merges reactive set defaults and follows the active alternative", async () => {
    const [alternate, setAlternate] = createSignal(false)
    const [size, setSize] = createSignal(32)
    const host = mount(() => (
      <IconConfig
        sources={{ "tabler:star": circle, "lucide:star": path }}
        api={false}
        defaultSize={{ tabler: "lg", default: "md" }}
      >
        <IconConfig defaultSize={{ lucide: size() }}>
          <Icon
            name="tabler:star"
            altName="lucide:star"
            showAlt={alternate()}
          />
        </IconConfig>
      </IconConfig>
    ))
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("24")
    setAlternate(true)
    await expect
      .poll(() => host.querySelector("svg")?.getAttribute("width"))
      .toBe("32")
    setSize(40)
    await expect
      .poll(() => host.querySelector("svg")?.getAttribute("width"))
      .toBe("40")
  })
  test("inherits nested configuration and reacts to alternatives and size changes", async () => {
    const [alternate, setAlternate] = createSignal(false)
    const [size, setSize] = createSignal<"sm" | "xl">("sm")
    const host = mount(() => (
      <IconConfig sources={{ local: circle, alt: path }} defaultSize={size()}>
        <IconConfig strokeWidth={2}>
          <Icon
            name="local"
            altName="alt"
            showAlt={alternate()}
            aria-label="shape"
            class="icon"
          />
        </IconConfig>
      </IconConfig>
    ))
    expect(host.querySelector("circle")).not.toBeNull()
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("16")
    expect(host.querySelector("svg")?.hasAttribute("aria-hidden")).toBe(false)
    setAlternate(true)
    setSize("xl")
    await expect.poll(() => host.querySelector("path")).not.toBeNull()
    expect(host.querySelector("svg")?.getAttribute("width")).toBe("28")
    expect(host.querySelector("svg")?.getAttribute("class")).toBe("icon")
  })
  test("loads asynchronously and ignores old responses after a name change", async () => {
    let resolve!: (data: typeof circle) => void
    const scope = createIconScope({
      api: (name) =>
        name === "slow"
          ? new Promise<typeof circle>((done) => {
              resolve = done
            })
          : path,
    })
    const [name, setName] = createSignal("slow")
    const host = mount(() => (
      <Icon name={name()} scope={scope} fallback={<span>Loading</span>} />
    ))
    expect(host.textContent).toBe("Loading")
    await expect.poll(() => typeof resolve).toBe("function")
    setName("fast")
    await expect.poll(() => host.querySelector("path")).not.toBeNull()
    resolve(circle)
    await Promise.resolve()
    expect(host.querySelector("circle")).toBeNull()
  })
  test("preserves SVG events and unique ids", () => {
    const data = {
      body: '<defs><linearGradient id="a"/></defs><path fill="url(#a)"/>',
      width: 24,
      height: 24,
    }
    let clicks = 0
    const host = mount(() => (
      <>
        <Icon data={data} onClick={() => clicks++} style={{ color: "red" }} />
        <Icon data={data} />
      </>
    ))
    const icons = host.querySelectorAll("svg")
    icons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(clicks).toBe(1)
    expect(icons[0].style.color).toBe("red")
    expect(icons[0].querySelector("linearGradient")?.id).not.toBe(
      icons[1].querySelector("linearGradient")?.id
    )
  })
})
