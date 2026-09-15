import { expect, test } from "bun:test"
import { readFile, readdir } from "node:fs/promises"
import { renderToStaticMarkup } from "react-dom/server"
import { Icon, IconConfig, parseElementData } from "@icones/react"
import { getIconViewBox, iconViewBoxes, renderIcon } from "@icones/core"
import { resolveIconSymbol } from "@icones/core/symbol"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"
import { elementDataToIcon } from "@icones/core/svg-data"
import type { ElementData } from "@icones/core/element-types"

const flat: ElementData = [["path", { fill: "#fff", d: "M0 0h512v512H0z" }]]

test.each(["us-circle", "us-square", "us"])(
  "named Flag %s uses native coordinates in inline, remote and React rendering",
  async (slug) => {
    const name = `flag:${slug}`
    const data = parseElementData(
      JSON.parse(
        await readFile(
          new URL(
            `../../../../packages/icons/flag/data/${slug}.json`,
            import.meta.url
          ),
          "utf8"
        )
      )
    )
    const expected = getIconViewBox(name)
    const state = resolveIconSymbol({ type: "symbol" }, name)!
    expect(state.viewBox).toBe(expected)
    const inline = renderIcon({ status: "loaded", data }, { name, size: 24 })
    const remote = renderIcon(
      { status: "referenced", ...state },
      { name, size: 24 }
    )
    expect(inline.attributes.viewBox).toBe(expected)
    expect(remote.attributes.viewBox).toBe(expected)
    expect(inline.attributes.width).toBe(24)
    expect(inline.attributes.height).toBe(24)
    const [, , width, height] = expected.split(" ")
    expect(remote.body).toContain(`width="${width}" height="${height}"`)
    const symbol = createIconSymbolDocument(data, name)
    expect(symbol).toContain(`<symbol id="icon" viewBox="${expected}">`)
    expect(symbol).not.toContain("--icones-remote-stroke-width")
    expect(symbol).not.toContain("translate(0 3) scale(0.0375)")
    if (slug === "us") expect(symbol).toContain('stroke-width="37"')
    const markup = renderToStaticMarkup(
      <IconConfig api={false} sources={{ [name]: data }}>
        <Icon name={name} size={24} />
      </IconConfig>
    )
    expect(markup).toContain(`viewBox="${expected}"`)
    expect(markup).toContain('width="24" height="24"')
    const rotatedInline = renderIcon(
      { status: "loaded", data },
      { name, rotate: 1, hFlip: true }
    )
    const rotatedRemote = renderIcon(
      { status: "referenced", ...state },
      { name, rotate: 1, hFlip: true }
    )
    expect(rotatedInline.attributes.viewBox).toBe(
      rotatedRemote.attributes.viewBox
    )
  }
)

test("named flags do not need a root svg tuple; direct Data is not inferred from its label", () => {
  const state = { status: "loaded" as const, data: flat }
  expect(renderIcon(state, { name: "flag:us" }).attributes.viewBox).toBe(
    iconViewBoxes.flagLandscape
  )
  expect(renderIcon(state, { icon: "flag:us-square" }).attributes.viewBox).toBe(
    iconViewBoxes.flagSquare
  )
  expect(
    renderIcon(state, { data: flat, name: "flag:us" }).attributes.viewBox
  ).toBe(iconViewBoxes.default)
  expect(renderIcon(state, { icon: flat }).attributes.viewBox).toBe(
    iconViewBoxes.default
  )
  expect(createIconSymbolDocument(flat)).toContain(
    '<symbol id="icon" viewBox="0 0 24 24">'
  )
  expect(
    renderIcon({ status: "idle" }, { name: "flag:us" }).attributes.viewBox
  ).toBe(iconViewBoxes.flagLandscape)
})

test("explicit custom viewports keep working for ordinary Data and custom symbol services", () => {
  const data = { width: 256, height: 128, body: '<path d="M0 0h256v128H0z"/>' }
  expect(
    renderIcon({ status: "loaded", data }, { data, name: "flag:us" }).attributes
      .viewBox
  ).toBe("0 0 256 128")
  const state = resolveIconSymbol(
    { type: "symbol", viewBox: "0 0 48 32" },
    "flag:us"
  )!
  expect(
    renderIcon({ status: "referenced", ...state }, { name: "flag:us" })
      .attributes.viewBox
  ).toBe("0 0 48 32")
})

test("all Flag source files match the name contract and their regenerated symbols", async () => {
  const directory = new URL(
    "../../../../packages/icons/flag/data/",
    import.meta.url
  )
  const files = await readdir(directory)
  expect(files).toHaveLength(986)
  await Promise.all(
    files.map(async (file) => {
      const name = `flag:${file.slice(0, -5)}`
      const data = parseElementData(
        JSON.parse(await readFile(new URL(file, directory), "utf8"))
      )
      const icon = elementDataToIcon(data)
      expect(`0 0 ${icon.width} ${icon.height}`).toBe(getIconViewBox(name))
      const symbol = await readFile(
        new URL(
          `../../../../packages/icons/flag/symbols/${file.slice(0, -5)}.svg`,
          import.meta.url
        ),
        "utf8"
      )
      expect(symbol).toBe(createIconSymbolDocument(data, name) + "\n")
    })
  )
})
