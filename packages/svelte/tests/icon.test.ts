import { afterEach, describe, expect, test, vi } from "vitest"
import { mount, unmount, tick } from "svelte"
import { createIconScope } from "@icones/svelte"
import Fixture from "./Fixture.svelte"
const cleanups: (() => Promise<void>)[] = []
function render(scope?: ReturnType<typeof createIconScope>, conflicts = false) {
  const host = document.createElement("div")
  document.body.append(host)
  const app = mount(Fixture, { target: host, props: { scope, conflicts } })
  cleanups.push(async () => {
    await unmount(app)
    host.remove()
  })
  return host
}
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()))
})

describe("Svelte Icon", () => {
  test("reactive per-set presets, strokes and APIs share the same active set", async () => {
    const host = render()
    const svg = () => host.querySelector(".set-options svg")!
    expect(svg().getAttribute("width")).toBe("48")
    expect(svg().getAttribute("stroke-width")).toBe("1")
    expect(svg().querySelector("use")?.getAttribute("href")).toBe(
      "/icons/runtime/shape.svg#icon"
    )
    host.querySelector("button")!.click()
    await tick()
    expect(svg().getAttribute("width")).toBe("24")
    expect(svg().getAttribute("stroke-width")).toBe("3")
    expect(svg().querySelector("path")).not.toBeNull()
  })
  test("inline pairs switch reactively and report each conflict only once", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const host = render(undefined, true)
      expect(host.querySelector(".inline-pair circle")).not.toBeNull()
      expect(error).toHaveBeenCalledTimes(2)
      host.querySelector("button")!.click()
      await tick()
      expect(host.querySelector(".inline-pair path")).not.toBeNull()
      expect(host.querySelector(".inline-pair circle")).toBeNull()
      host.querySelector("button")!.click()
      await tick()
      expect(host.querySelector(".inline-pair circle")).not.toBeNull()
      expect(host.querySelector(".inline-pair")!.hasAttribute("altData")).toBe(
        false
      )
      expect(error).toHaveBeenCalledTimes(2)
    } finally {
      error.mockRestore()
    }
  })
  test("merges reactive set defaults and follows the active alternative", async () => {
    const host = render()
    const widths = () =>
      [...host.querySelectorAll(".set-sizes svg")].map((icon) =>
        icon.getAttribute("width")
      )
    expect(widths()).toEqual(["24", "16", "24", "20"])
    host.querySelector("button")!.click()
    await tick()
    expect(widths()).toEqual(["24", "32", "32", "20"])
  })
  test("inherits nested configuration and reacts to alternatives and size changes", async () => {
    const host = render()
    expect(host.querySelector(".icon circle")).not.toBeNull()
    expect(host.querySelector(".icon")?.getAttribute("width")).toBe("16")
    expect(host.querySelector(".icon")?.hasAttribute("aria-hidden")).toBe(false)
    host.querySelector("button")!.click()
    await tick()
    expect(host.querySelector(".icon path")).not.toBeNull()
    expect(host.querySelector(".icon")?.getAttribute("width")).toBe("28")
  })
  test("loads asynchronously and ignores stale responses", async () => {
    const circle = { body: '<circle cx="12" cy="12" r="10"/>' }
    const path = { body: '<path d="M0 12h24"/>' }
    let resolve!: (data: typeof circle) => void
    const scope = createIconScope({
      api: (name) =>
        name === "slow"
          ? new Promise<typeof circle>((done) => {
              resolve = done
            })
          : path,
    })
    const host = render(scope)
    expect(host.textContent).toContain("Loading")
    await expect.poll(() => typeof resolve).toBe("function")
    host.querySelector("button")!.click()
    await expect
      .poll(() => host.querySelector(".async-icon path"))
      .not.toBeNull()
    resolve(circle)
    await tick()
    expect(host.querySelector(".async-icon circle")).toBeNull()
  })
  test("preserves SVG events, custom styles and unique ids", async () => {
    const host = render()
    const icons = host.querySelectorAll<SVGSVGElement>(".gradients svg")
    icons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await tick()
    expect(host.querySelector("output")?.textContent).toBe("1")
    expect(icons[0].style.color).toBe("red")
    expect(icons[0].querySelector("linearGradient")?.id).not.toBe(
      icons[1].querySelector("linearGradient")?.id
    )
  })
})
