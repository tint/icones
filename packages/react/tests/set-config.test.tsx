import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { Icon, IconConfig, type IconProps } from "@icones/react"
import {
  createIconScope,
  renderIcon,
  type IconScopeOptions,
  type IconOptions,
} from "@icones/core"

const data = { width: 24, height: 24, body: '<path d="M0 12h24"/>' }

const config = {
  defaultSize: { tabler: "lg", default: "md" },
  sizeValues: { tabler: { lg: 48 }, default: { md: 32 } },
  strokeWidth: { tabler: 2, default: 3 },
  absoluteStrokeWidth: { tabler: true, default: false },
  api: { default: false },
} as const satisfies IconScopeOptions

const attrs = (
  options: IconScopeOptions,
  props: IconOptions = { name: "tabler:star" }
) => renderIcon({ status: "loaded", data }, props, options).attributes

test("per-set appearance resolves the active source and preserves explicit icon overrides", () => {
  const cases: { props: IconProps; width: number; stroke: number }[] = [
    { props: { name: "tabler:star" }, width: 48, stroke: 1 },
    { props: { name: "lucide:star" }, width: 32, stroke: 3 },
    { props: { name: "@custom:tabler:star" }, width: 48, stroke: 1 },
    { props: { name: "tabler-star" }, width: 48, stroke: 1 },
    { props: { name: "Local" }, width: 32, stroke: 3 },
    { props: { data }, width: 32, stroke: 3 },
    { props: { data: [] }, width: 32, stroke: 3 },
    {
      props: { name: "tabler:star", altName: "lucide:star", showAlt: true },
      width: 32,
      stroke: 3,
    },
    {
      props: { name: "tabler:star", altData: data, showAlt: true },
      width: 32,
      stroke: 3,
    },
    {
      props: { name: "tabler:star", altData: data, showAlt: false },
      width: 48,
      stroke: 1,
    },
    {
      props: { name: "tabler:star", size: 24, strokeWidth: 4 },
      width: 24,
      stroke: 4,
    },
    {
      props: { name: "tabler:star", absoluteStrokeWidth: false },
      width: 48,
      stroke: 2,
    },
    { props: { name: "tabler:star", strokeWidth: 0 }, width: 48, stroke: 0 },
  ]
  for (const { props, width, stroke } of cases) {
    const result = renderIcon(
      { status: "loaded", data },
      props,
      config
    ).attributes
    expect(result.width).toBe(width)
    expect(result["stroke-width"]).toBe(stroke)
    const html = renderToStaticMarkup(
      <IconConfig {...config}>
        <Icon {...props} />
      </IconConfig>
    )
    expect(html).toContain(`width="${width}"`)
    expect(html).toContain(`stroke-width="${stroke}"`)
  }
})

test("nested appearance maps merge by set and presets merge by key without mutating inputs", () => {
  const parent = createIconScope(config)
  const next = {
    sizeValues: { tabler: { xl: 64 }, default: { sm: 18 } },
    strokeWidth: { lucide: 4 },
    absoluteStrokeWidth: { default: true },
  }
  const before = JSON.stringify([config, next])
  const child = createIconScope(next, parent)
  expect(child.store).toBe(parent.store)
  expect(attrs(child.appearance).width).toBe(48)
  expect(attrs(child.appearance)["stroke-width"]).toBe(1)
  expect(attrs(child.appearance, { name: "lucide:star" })["stroke-width"]).toBe(
    3
  )
  expect(
    attrs(child.appearance, { name: "tabler:star", size: "xl" }).width
  ).toBe(64)
  expect(
    attrs(child.appearance, { name: "tabler:star", size: "sm" }).width
  ).toBe(18)
  const flat = createIconScope(
    { sizeValues: { md: 40 }, strokeWidth: 5, absoluteStrokeWidth: false },
    child
  )
  expect(attrs(flat.appearance).width).toBe(48) // A flat preset patch updates default, keeping set-specific presets.
  expect(attrs(flat.appearance, { name: "lucide:star" }).width).toBe(40)
  expect(attrs(flat.appearance)["stroke-width"]).toBe(5)
  expect(JSON.stringify([config, next])).toBe(before)
  const html = renderToStaticMarkup(
    <IconConfig {...config}>
      <IconConfig {...next}>
        <Icon name="tabler:star" />
        <Icon name="lucide:star" />
        <IconConfig
          strokeWidth={5}
          absoluteStrokeWidth={false}
          sizeValues={{ md: 40 }}
        >
          <Icon name="lucide:star" />
        </IconConfig>
      </IconConfig>
    </IconConfig>
  )
  expect(html).toContain('stroke-width="1"')
  expect(html).toContain('stroke-width="3"')
  expect(html).toContain('width="40"')
  expect(html).toContain('stroke-width="5"')
})

test("React providers inherit API maps and render set-specific symbols during SSR", () => {
  const html = renderToStaticMarkup(
    <IconConfig
      api={{
        tabler: { type: "symbol", baseUrl: "/tabler-icons" },
        default: { type: "symbol", baseUrl: "/fallback-icons" },
      }}
    >
      <IconConfig api={{ lucide: false }} sources={{ "lucide:star": data }}>
        <Icon name="tabler:star" />
        <Icon name="lucide:star" />
        <Icon name="other:star" />
        <IconConfig api={false}>
          <Icon name="tabler:heart" />
        </IconConfig>
      </IconConfig>
    </IconConfig>
  )
  expect(html).toContain('href="/tabler-icons/tabler/star.svg#icon"')
  expect(html).toContain('href="/fallback-icons/other/star.svg#icon"')
  expect(html).toContain('d="M0 12h24"')
  expect(html).not.toContain("heart.svg")
  expect(html.match(/data-state="referenced"/g)).toHaveLength(2)
})
