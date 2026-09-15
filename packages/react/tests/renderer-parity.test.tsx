import { expect, test } from "bun:test"
import { useId, type SVGProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { JSDOM } from "jsdom"
import { Icon, IconConfig, type IconProps, type Size } from "@icones/react"
import {
  createIconController,
  createIconScope,
  renderIcon,
  type ElementData,
  type IconOptions,
  type IconScopeOptions,
  type IconSize,
} from "@icones/core"
import { reactAttributeName } from "@icones/core/elements"

// Keep this fixture's custom preset explicit; it must not rely on another suite.
declare module "@icones/react" {
  interface CustomSize {
    "2xl": true
  }
}

const line = {
  width: 24,
  height: 24,
  body: '<path fill="none" stroke="currentColor" stroke-width="2" d="M2 12h20"/>',
}
const tuples: ElementData = [
  ["circle", { cx: 12, cy: 12, r: 4, strokeWidth: 2 }],
  ["rect", { width: 20, height: 20, opacity: 0.5 }],
]
const definitions = {
  body: '<defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient><mask id="mask"><path fill="white" d="M0 0h24v24z"/></mask></defs><path id="shape" mask="url(#mask)" fill="url(#paint)" d="M0 0h12v12z"/><use xlink:href="#shape"/>',
}

// Independent consumer of the same Core contract used by non-React adapters.
function CoreIcon({
  options,
  config,
}: {
  options: IconOptions
  config: IconScopeOptions
}) {
  const scope = createIconScope(config)
  const controller = createIconController(options, scope)
  const result = renderIcon(
    controller.getState(),
    options,
    scope.appearance,
    useId()
  )
  controller.destroy()
  const attributes = Object.fromEntries(
    Object.entries(result.attributes).map(([name, value]) => [
      reactAttributeName(name),
      value,
    ])
  ) as SVGProps<SVGSVGElement>
  return (
    <svg
      {...attributes}
      style={result.style}
      dangerouslySetInnerHTML={{ __html: result.body }}
    />
  )
}

type SharedSize = Extract<IconSize, Size>
type SharedConfig = Omit<IconScopeOptions, "defaultSize"> & {
  defaultSize?: SharedSize
}
const fixtures: {
  label: string
  props: IconOptions<SharedSize>
  config?: SharedConfig
}[] = [
  { label: "default appearance", props: { data: line } },
  {
    label: "tuple opacity order and fill",
    props: { data: tuples, fill: "blue" },
  },
  { label: "empty tuples", props: { data: [] } },
  {
    label: "custom viewport and relative stroke",
    props: { data: { ...line, width: 256, height: 128 }, strokeWidth: 2 },
  },
  {
    label: "absolute stroke with asymmetric dimensions",
    props: {
      data: { ...line, width: 32, height: 16 },
      width: "48px",
      height: 32,
      strokeWidth: 2,
      absoluteStrokeWidth: true,
    },
  },
  {
    label: "inherited appearance",
    props: { data: line },
    config: {
      defaultSize: "lg",
      sizeValues: { lg: 36 },
      strokeWidth: 2,
      absoluteStrokeWidth: true,
    },
  },
  {
    label: "explicit size overrides width and height",
    props: { data: line, size: "2em", width: 48, height: 96 },
  },
  {
    label: "rotation and flips",
    props: { data: line, rotate: 1, hFlip: true, vFlip: true },
  },
  { label: "meaningful label", props: { data: line, "aria-label": "Search" } },
  { label: "explicit role", props: { data: line, role: "img" } },
  {
    label: "explicit hidden overrides label",
    props: { data: line, "aria-label": "Search", "aria-hidden": true },
  },
  {
    label: "explicit false aria-hidden",
    props: { data: line, "aria-hidden": "false" },
  },
  { label: "definitions and references", props: { data: definitions } },
  {
    label: "registered icon-set alias",
    props: { name: "parity:flipped" },
    config: {
      sources: {
        parity: {
          prefix: "parity",
          icons: { line },
          aliases: { flipped: { parent: "line", hFlip: true } },
        },
      },
    },
  },
  {
    label: "configured source",
    props: { name: "Local" },
    config: { sources: { Local: tuples } },
  },
  {
    label: "alternate source",
    props: { name: "Line", altName: "Other", showAlt: true },
    config: { sources: { Line: line, Other: tuples } },
  },
  { label: "missing source placeholder", props: { name: "Missing" } },
  {
    label: "symbol transport",
    props: { name: "parity:line", rotate: 1 },
    config: { api: { type: "symbol", baseUrl: "/icons" } },
  },
  {
    label: "escaped symbol URL",
    props: { name: "Line" },
    config: {
      api: {
        type: "symbol",
        url: () => '/icons/custom.svg?a=1&b="value"#icon',
        viewBox: "0 0 48 24",
      },
    },
  },
]

function svgAttributes(svg: Element) {
  return Object.fromEntries(
    [...svg.attributes].map(({ name, value }) => [name, value])
  )
}

for (const fixture of fixtures) {
  test(`React matches the shared renderer: ${fixture.label}`, () => {
    const config: SharedConfig = { api: false, ...fixture.config }
    const actual = renderToStaticMarkup(
      <IconConfig {...config}>
        <Icon {...fixture.props} />
      </IconConfig>
    )
    const expected = renderToStaticMarkup(
      <IconConfig {...config}>
        <CoreIcon options={fixture.props} config={config} />
      </IconConfig>
    )
    const dom = new JSDOM(actual + expected)
    try {
      const [reactSvg, coreSvg] = dom.window.document.querySelectorAll("svg")
      expect(svgAttributes(reactSvg!)).toEqual(svgAttributes(coreSvg!))
      expect(reactSvg!.innerHTML).toBe(coreSvg!.innerHTML)
    } finally {
      dom.window.close()
    }
  })
}

test("React preserves native SVG props, style precedence and fallbacks", () => {
  const markup = renderToStaticMarkup(
    <Icon
      data={line}
      id="native"
      className="icon"
      tabIndex={0}
      aria-describedby="help"
      strokeLinecap="round"
      data-test="native"
      style={
        {
          opacity: 0.4,
          "--icones-stroke-width": 4,
        } as SVGProps<SVGSVGElement>["style"]
      }
    />
  )
  expect(markup).toContain('id="native"')
  expect(markup).toContain('class="icon"')
  expect(markup).toContain('tabindex="0"')
  expect(markup).toContain('aria-describedby="help"')
  expect(markup).toContain('stroke-linecap="round"')
  expect(markup).toContain('data-test="native"')
  expect(markup).toContain("--icones-stroke-width:4")
  expect(markup).toContain("opacity:0.4")
  const props: IconProps = { name: "Missing", fallback: <span>Loading</span> }
  expect(
    renderToStaticMarkup(
      <IconConfig api={false}>
        <Icon {...props} />
      </IconConfig>
    )
  ).toBe("<span>Loading</span>")
  expect(
    renderToStaticMarkup(
      <IconConfig api={false}>
        <Icon {...props} fallback={null} />
      </IconConfig>
    )
  ).toBe("")
  expect(renderToStaticMarkup(<Icon data={[]} fallback="Loading" />)).toContain(
    "<svg"
  )
})

test("React retains custom presets and nested size overrides at runtime", () => {
  const markup = renderToStaticMarkup(
    <IconConfig defaultSize="2xl" sizeValues={{ "2xl": 40 }}>
      <IconConfig strokeWidth={2}>
        <Icon data={line} />
        <Icon data={line} size="2xl" width={16} height={16} />
        <Icon data={line} width={32} height="48px" />
      </IconConfig>
    </IconConfig>
  )
  expect(markup.match(/width="40"/g)).toHaveLength(2)
  expect(markup.match(/height="40"/g)).toHaveLength(2)
  expect(markup).toContain('width="32" height="48px"')
})
