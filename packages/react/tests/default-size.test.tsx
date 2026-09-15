import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { Icon, IconConfig, type Size } from "@icones/react"
import {
  createIconScope,
  renderIcon,
  type IconDefaultSize,
  type IconOptions,
  type IconSize,
} from "@icones/core"

type SharedSize = Extract<IconSize, Size>

type DefaultSize = IconDefaultSize<SharedSize>

const data = { width: 24, height: 24, body: '<path d="M0 12h24"/>' }

const defaults = { tabler: "lg", default: "md" } as const

const fixtures: {
  label: string
  props: IconOptions<SharedSize>
  size: string | number
  defaults?: DefaultSize
}[] = [
  { label: "matching set", props: { name: "tabler:star" }, size: 24 },
  { label: "fallback set", props: { name: "lucide:star" }, size: 20 },
  { label: "bare name", props: { name: "Local" }, size: 20 },
  { label: "provider name", props: { name: "@custom:tabler:star" }, size: 24 },
  { label: "legacy dashed name", props: { name: "tabler-star" }, size: 24 },
  { label: "icon shorthand", props: { icon: "tabler:star" }, size: 24 },
  {
    label: "explicit size",
    props: { name: "tabler:star", size: 32 },
    size: 32,
  },
  { label: "explicit zero", props: { name: "tabler:star", size: 0 }, size: 0 },
  { label: "anonymous JSON", props: { data }, size: 20 },
  { label: "anonymous tuples", props: { data: [] }, size: 20 },
  {
    label: "active alternative set",
    props: { name: "tabler:star", altName: "lucide:star", showAlt: true },
    size: 20,
  },
  {
    label: "inactive alternative",
    props: { name: "tabler:star", altName: "lucide:star", showAlt: false },
    size: 24,
  },
  {
    label: "anonymous alternative",
    props: { name: "tabler:star", altIcon: data, showAlt: true },
    size: 20,
  },
  {
    label: "anonymous altData",
    props: { name: "tabler:star", altData: data, showAlt: true },
    size: 20,
  },
  {
    label: "inactive altData",
    props: { name: "tabler:star", altData: data, showAlt: false },
    size: 24,
  },
  {
    label: "built-in fallback",
    props: { name: "lucide:star" },
    defaults: { tabler: "lg" },
    size: 20,
  },
  {
    label: "empty map",
    props: { name: "tabler:star" },
    defaults: {},
    size: 20,
  },
  {
    label: "numeric entry",
    props: { name: "tabler:star" },
    defaults: { tabler: 30 },
    size: 30,
  },
  {
    label: "zero entry",
    props: { name: "tabler:star" },
    defaults: { tabler: 0 },
    size: 0,
  },
  {
    label: "CSS entry",
    props: { name: "tabler:star" },
    defaults: { tabler: "1.5em" },
    size: "1.5em",
  },
  {
    label: "CSS fallback",
    props: { name: "lucide:star" },
    defaults: { default: "2rem" },
    size: "2rem",
  },
  {
    label: "scalar compatibility",
    props: { name: "tabler:star" },
    defaults: "xl",
    size: 28,
  },
  {
    label: "prototype key",
    props: { name: "constructor:star" },
    defaults: { default: "sm" },
    size: 16,
  },
]

for (const fixture of fixtures) {
  test(`defaultSize: ${fixture.label}`, () => {
    const defaultSize = fixture.defaults ?? defaults
    const attributes = renderIcon({ status: "loaded", data }, fixture.props, {
      defaultSize,
    }).attributes
    expect(attributes.width).toBe(fixture.size)
    expect(attributes.height).toBe(fixture.size)
    const html = renderToStaticMarkup(
      <IconConfig defaultSize={defaultSize} api={false}>
        <Icon {...fixture.props} />
      </IconConfig>
    )
    expect(html).toContain(`width="${fixture.size}" height="${fixture.size}"`)
  })
}

test("nested scopes and React providers merge maps, inherit fallbacks and allow scalar resets", () => {
  const cases: {
    parent: DefaultSize
    child?: DefaultSize
    widths: number[]
  }[] = [
    { parent: defaults, child: { lucide: "xl" }, widths: [24, 28, 20] },
    { parent: defaults, child: { default: "sm" }, widths: [24, 16, 16] },
    { parent: defaults, child: { tabler: 32 }, widths: [32, 20, 20] },
    { parent: defaults, child: 16, widths: [16, 16, 16] },
    { parent: 32, child: { tabler: 24 }, widths: [24, 32, 32] },
    { parent: defaults, child: {}, widths: [24, 20, 20] },
    { parent: defaults, widths: [24, 20, 20] },
  ]
  const names = ["tabler:star", "lucide:star", "Local"]
  for (const { parent, child, widths } of cases) {
    Object.freeze(parent)
    if (child) Object.freeze(child)
    const scope = createIconScope({ defaultSize: parent, api: false })
    const nested = createIconScope({ defaultSize: child }, scope)
    expect(nested.store).toBe(scope.store)
    expect(
      names.map(
        (name) =>
          renderIcon({ status: "loaded", data }, { name }, nested.appearance)
            .attributes.width
      )
    ).toEqual(widths)
    const html = renderToStaticMarkup(
      <IconConfig defaultSize={parent} api={false}>
        <IconConfig defaultSize={child}>
          {names.map((name) => (
            <Icon key={name} name={name} />
          ))}
        </IconConfig>
      </IconConfig>
    )
    expect(
      [...html.matchAll(/ width="([^"]+)"/g)].map((match) => Number(match[1]))
    ).toEqual(widths)
    expect(scope.appearance.defaultSize).toEqual(
      typeof parent === "object" ? { default: "md", ...parent } : parent
    )
  }
})
