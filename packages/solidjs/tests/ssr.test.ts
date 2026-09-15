import { expect, test } from "bun:test"
import { createComponent } from "solid-js"
import { renderToString as renderSolid } from "solid-js/web"
import { Icon as SolidIcon, IconConfig as SolidConfig } from "@icones/solidjs"

const data = {
  body: '<defs><linearGradient id="paint"/></defs><path fill="url(#paint)"/>',
  width: 24,
  height: 24,
}

test("Solid's published node export is SSR-safe and inherits configuration", () => {
  const html = renderSolid(() =>
    createComponent(SolidConfig, {
      sources: { local: data },
      defaultSize: "xl",
      get children() {
        return [
          createComponent(SolidIcon, { name: "local", "aria-label": "shape" }),
          createComponent(SolidIcon, { data }),
        ]
      },
    })
  )
  expect(html).toContain('width="28"')
  expect(html).toContain('data-state="loaded"')
  const ids = [...html.matchAll(/id="(icon-[^"]+-paint)"/g)].map(
    (match) => match[1]
  )
  expect(ids.length).toBe(2)
  expect(new Set(ids).size).toBe(2)
})
