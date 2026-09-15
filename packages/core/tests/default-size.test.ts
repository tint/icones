import { expect, test } from "bun:test"
import { createIconScopeResolver, renderIcon } from "@icones/core"

const data = { width: 24, height: 24, body: '<path d="M0 12h24"/>' }

const defaults = { tabler: "lg", default: "md" } as const

test("set defaults resolve custom presets and keep explicit dimensions and stroke scaling", () => {
  const props = { name: "tabler:star" } as const
  const config = {
    defaultSize: defaults,
    sizeValues: { lg: 40 },
    strokeWidth: 2,
    absoluteStrokeWidth: true,
  }
  for (const state of [
    { status: "loaded", data },
    { status: "referenced", href: "/icons/tabler/star.svg#icon" },
    { status: "loading" },
  ] as const) {
    expect(renderIcon(state, props, config).attributes.width).toBe(40)
  }
  const svg = renderIcon({ status: "loaded", data }, props, config)
  expect(svg.attributes["stroke-width"]).toBe(1.2)
  const explicit = renderIcon(
    { status: "loaded", data },
    { ...props, width: 48, height: "2em" },
    config
  )
  expect(explicit.attributes.width).toBe(48)
  expect(explicit.attributes.height).toBe("2em")
})

test("updating set defaults reuses the store and does not retain removed entries", () => {
  const resolve = createIconScopeResolver()
  const first = resolve({
    defaultSize: { tabler: 24, default: 16 },
    api: false,
  })
  const second = resolve({ defaultSize: { lucide: 32 }, api: false })
  expect(second.store).toBe(first.store)
  expect(second.appearance.defaultSize).toEqual({ default: "md", lucide: 32 })
  const inherited = Object.create({ tabler: "xl" })
  inherited.default = "sm"
  expect(
    renderIcon(
      { status: "loaded", data },
      { name: "tabler:star" },
      { defaultSize: inherited }
    ).attributes.width
  ).toBe(16)
})
