import { afterEach, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  addIconData,
  addIconSet,
  clearIconData,
  Icon,
  IconConfig,
  loadIconData,
  resolveIconSetData,
  type IconData,
  type IconSet,
  type ElementData,
} from "@icones/react"

const circle: IconData = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}

const brands: IconSet = {
  prefix: "brand",
  width: 24,
  height: 24,
  icons: {
    github: circle,
  },
  aliases: {
    hub: {
      parent: "github",
      hFlip: true,
    },
  },
}

afterEach(() => {
  clearIconData()
})

test("accepts name=prefix:icon and inherits nested workspace configuration", () => {
  addIconSet(brands)
  const markup = renderToStaticMarkup(
    <IconConfig defaultSize="xl" strokeWidth={2}>
      <IconConfig absoluteStrokeWidth>
        <Icon name="brand:github" color="red" />
      </IconConfig>
    </IconConfig>
  )
  expect(markup).toContain('width="28"')
  expect(markup).toContain('color="red"')
  expect(markup).toContain('stroke-width="' + (2 * 24) / 28 + '"')
  expect(markup).toContain("<circle")
})

test("preserves raw workspace element data, opacity order, and alternate icons", () => {
  const primary: ElementData = [
    ["path", { d: "M1 1h2", stroke: "currentColor" }],
  ]
  const alternative: ElementData = [
    ["circle", { cx: 12, cy: 12, r: 4, strokeWidth: 2 }],
    ["rect", { width: 20, height: 20, opacity: 0.5 }],
  ]
  const markup = renderToStaticMarkup(
    <Icon
      icon={primary}
      altIcon={alternative}
      showAlt
      size="16px"
      strokeWidth={2}
      absoluteStrokeWidth
      className="size-8"
    />
  )
  expect(markup).not.toContain("<path")
  expect(markup.indexOf("<rect")).toBeLessThan(markup.indexOf("<circle"))
  expect(markup).toContain('fill="none"')
  expect(markup).toContain('stroke-width="3"')
  expect(markup).toContain('class="size-8"')
})

test("supports alternate names, size overrides, filled icons, and non-24 viewBoxes", () => {
  addIconData("custom:wide", {
    body: '<path fill="#f00" d="M0 0h32v16H0z"/>',
    width: 32,
    height: 16,
  })
  const markup = renderToStaticMarkup(
    <IconConfig sizeValues={{ lg: 32 }} defaultSize="lg">
      <Icon
        name="brand:github"
        altName="custom:wide"
        showAlt
        aria-label="Logo"
      />
    </IconConfig>
  )
  expect(markup).toContain('width="32"')
  expect(markup).toContain('viewBox="0 0 32 16"')
  expect(markup).toContain('fill="#f00"')
  expect(markup).not.toContain('aria-hidden="true"')
})

test("makes hard-coded path and group stroke widths configurable without changing fills", () => {
  const markup = renderToStaticMarkup(
    <Icon
      data={{
        width: 24,
        height: 24,
        body: '<g stroke-width="2"><path stroke="currentColor" fill="none" stroke-width="3" d="M0 0h8"/></g>',
      }}
      strokeWidth={1.75}
    />
  )
  expect(markup).toContain("--icones-stroke-width:1.75")
  expect(markup).toContain("var(--icones-stroke-width, 2)")
  expect(markup).toContain("var(--icones-stroke-width, 3)")
  expect(markup).toContain('fill="none"')
})

test("gives repeated SVG masks distinct deterministic IDs", () => {
  const data = {
    body: '<defs><mask id="a"><path d="M0 0h8v8"/></mask></defs><path mask="url(#a)" d="M0 0h8"/>',
  }
  const markup = renderToStaticMarkup(
    <>
      <Icon data={data} />
      <Icon data={data} />
    </>
  )
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  expect(new Set(ids).size).toBe(2)
  for (const id of ids) expect(markup).toContain("url(#" + id + ")")
  expect(
    renderToStaticMarkup(
      <>
        <Icon data={data} />
        <Icon data={data} />
      </>
    )
  ).toBe(markup)
})

test("renders an individual icon data object", () => {
  const markup = renderToStaticMarkup(<Icon data={circle} size={20} />)

  expect(markup).toContain('width="20"')
  expect(markup).toContain('height="20"')
  expect(markup).toContain('viewBox="0 0 24 24"')
  expect(markup).toContain("<circle")
})

test("resolves an icon and aliases from an icon set", () => {
  const alias = resolveIconSetData(brands, "hub")

  expect(alias?.body).toBe(circle.body)
  expect(alias?.hFlip).toBe(true)
  expect(
    renderToStaticMarkup(
      <IconConfig sources={{ brand: brands }} api={false}>
        <Icon name="brand:github" />
      </IconConfig>
    )
  ).toContain("<circle")
})

test("legacy registration and loading also accept workspace tuple data", async () => {
  const tuples: ElementData = [["path", { d: "M1 12h22" }]]
  addIconData("CustomLine", tuples)
  expect(renderToStaticMarkup(<Icon name="CustomLine" />)).toContain(
    'd="M1 12h22"'
  )
  expect(await loadIconData("OtherLine", async () => tuples)).toEqual(tuples)
})
