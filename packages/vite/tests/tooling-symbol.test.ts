import { expect, test } from "bun:test"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"

test("remote documents contain one normalized symbol, isolated IDs and configurable strokes", () => {
  const svg = createIconSymbolDocument({
    width: 32,
    height: 16,
    body: '<defs><mask id="mask"><path d="M0 0h32v16H0z"/></mask></defs><path mask="url(#mask)" stroke="currentColor" stroke-width="2" d="M0 8h32"/>',
  })
  expect(svg.match(/<symbol\b/g)).toHaveLength(1)
  expect(svg).toContain('id="icon" viewBox="0 0 24 24"')
  expect(svg).toContain('transform="translate(0 6) scale(0.75)"')
  expect(svg).toContain('mask="url(#remote-mask)"')
  expect(svg).toContain('id="remote-mask"')
  expect(svg).toContain(
    "var(--icones-remote-stroke-width, var(--icones-stroke-width, 2))"
  )
  expect(svg).toContain(
    'style="--icones-remote-stroke-width:calc(var(--icones-stroke-width) / 0.75)"'
  )
  expect(svg).not.toContain("--workspace-")
})

test.each([
  {
    label: "already normalized",
    width: 24,
    height: 24,
    transform: undefined,
    scale: undefined,
  },
  {
    label: "already centered rectangle",
    width: 24,
    height: 12,
    top: 6,
    transform: undefined,
    scale: undefined,
  },
  {
    label: "scaling only",
    width: 48,
    height: 48,
    transform: "scale(0.5)",
    scale: 0.5,
  },
  {
    label: "centering only",
    width: 24,
    height: 12,
    transform: "translate(0 6)",
    scale: undefined,
  },
  {
    label: "origin offset only",
    width: 24,
    height: 24,
    left: 4,
    top: -2,
    transform: "translate(-4 2)",
    scale: undefined,
  },
  {
    label: "offset and scaling",
    width: 48,
    height: 24,
    left: 4,
    top: -2,
    transform: "translate(-2 7) scale(0.5)",
    scale: 0.5,
  },
])(
  "remote documents emit only necessary transforms: $label",
  ({ label: _label, transform, scale, ...dimensions }) => {
    const svg = createIconSymbolDocument({
      ...dimensions,
      body: '<path id="line" stroke="currentColor" stroke-width="2" style="stroke-width:3" d="M0 12h24"/>',
    })
    expect(svg).toContain('id="remote-line"')
    expect(svg).not.toContain("translate(0 0)")
    expect(svg).not.toContain("scale(1)")
    if (transform) expect(svg).toContain(`<g transform="${transform}"`)
    else {
      expect(svg).not.toContain("<g")
      expect(svg).not.toContain("transform=")
      expect(svg).toContain('<symbol id="icon" viewBox="0 0 24 24"><path')
    }
    if (scale !== undefined) {
      expect(svg).toContain(
        `--icones-remote-stroke-width:calc(var(--icones-stroke-width) / ${scale})`
      )
      expect(svg).toContain(
        'stroke-width="var(--icones-remote-stroke-width, var(--icones-stroke-width, 2))"'
      )
      expect(svg).toContain(
        'style="stroke-width:var(--icones-remote-stroke-width, var(--icones-stroke-width, 3))"'
      )
    } else {
      expect(svg).not.toContain("--icones-remote-stroke-width")
      expect(svg).toContain('stroke-width="var(--icones-stroke-width, 2)"')
      expect(svg).toContain(
        'style="stroke-width:var(--icones-stroke-width, 3)"'
      )
    }
  }
)

test("skipping normalization retains transforms belonging to the artwork", () => {
  const svg = createIconSymbolDocument({
    width: 24,
    height: 24,
    body: '<g transform="rotate(45 12 12)"><path stroke="currentColor" stroke-width="2" d="M0 12h24"/></g>',
  })
  expect(svg.match(/<g\b/g)).toHaveLength(1)
  expect(svg).toContain('transform="rotate(45 12 12)"')
  expect(svg).not.toContain("--icones-remote-stroke-width")
})
