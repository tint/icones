import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { Icon } from "@icones/react"
import { svgToElementData } from "@icones/vite/tooling/elements"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"

test("256-grid icons match relative and absolute stroke sizing in inline and remote rendering", () => {
  const data = svgToElementData(
    '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16"><path d="M0 128h256"/></svg>'
  )
  expect(
    renderToStaticMarkup(<Icon data={data} strokeWidth={1.5} size={32} />)
  ).toContain("--icones-stroke-width:16")
  expect(
    renderToStaticMarkup(
      <Icon data={data} strokeWidth={2} size={32} absoluteStrokeWidth />
    )
  ).toContain("--icones-stroke-width:16")
  expect(createIconSymbolDocument(data)).toContain(
    "calc(var(--icones-stroke-width) / 0.09375)"
  )
})
