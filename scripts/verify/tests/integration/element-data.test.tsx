import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  Icon,
  IconConfig,
  createIconStore,
  parseElementData,
} from "@icones/react"
import { elementDataToIcon } from "@icones/core/svg-data"
import { iconToElementData } from "@icones/vite/tooling/elements"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"

test("downloads the workspace tuple format with React attributes and stable keys", () => {
  const data = iconToElementData({
    width: 24,
    height: 24,
    body: '<path d="M12 5v14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  })
  expect(data).toEqual([
    [
      "path",
      {
        d: "M12 5v14",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        key: "0",
      },
    ],
  ])
  expect(parseElementData(JSON.parse(JSON.stringify(data)))).toEqual(data)
  expect(JSON.stringify(data)).not.toContain("<path")
  expect(elementDataToIcon(data).body).toContain('stroke-width="1.5"')
  expect(elementDataToIcon(data).body).not.toContain("key=")
})

test("preserves non-default viewports and baked alias transforms across JSON and symbol output", () => {
  const data = iconToElementData({
    width: 32,
    height: 16,
    left: 2,
    top: 3,
    hFlip: true,
    body: '<path fill="#f00" stroke="currentColor" stroke-width="2" d="M2 3h32v16H2z"/>',
  })
  expect(data[0][0]).toBe("svg")
  expect(elementDataToIcon(data)).toMatchObject({ width: 32, height: 16 })
  expect(elementDataToIcon(data).body).toContain("scale(-1 1)")
  const markup = renderToStaticMarkup(
    <Icon data={data} size={32} strokeWidth={2} absoluteStrokeWidth />
  )
  expect(markup).toContain('viewBox="0 0 32 16"')
  expect(markup).toContain('fill="#f00"')
  expect(markup).toContain('stroke-width="2"')
  const svg = createIconSymbolDocument(data)
  expect(svg).toContain('viewBox="0 0 24 24"')
  expect(svg).toContain("translate(0 6) scale(0.75)")
  expect(svg.match(/<symbol\b/g)).toHaveLength(1)
})

test("keeps Iconify's implicit fill and original opacity layering when stored as tuples", () => {
  const data = iconToElementData({
    width: 24,
    height: 24,
    body: '<path id="back" d="M0 0h24v24H0z"/><path id="front" opacity=".5" fill="#f00" d="M0 0h12v12H0z"/>',
  })
  const markup = renderToStaticMarkup(<Icon data={data} />)
  expect(markup).toContain('fill="currentColor"')
  expect(markup.indexOf('-back"')).toBeLessThan(markup.indexOf('-front"'))
  expect(markup).toContain('opacity=".5"')
})

test("tuple masks receive independent IDs on repeated SSR renders", () => {
  const data = iconToElementData({
    width: 24,
    height: 24,
    body: '<defs><mask id="a"><path d="M0 0h20v20H0z"/></mask></defs><g mask="url(#a)"><circle cx="12" cy="12" r="10"/></g>',
  })
  const markup = renderToStaticMarkup(
    <>
      <Icon data={data} />
      <Icon data={data} />
    </>
  )
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(2)
  for (const id of ids) expect(markup).toContain(`url(#${id})`)
})

test("a custom tuple JSON API can preload for SSR and supply bare names through sources", async () => {
  const data = iconToElementData({
    width: 24,
    height: 24,
    body: '<path fill="none" stroke="currentColor" d="M1 12h22"/>',
  })
  let requests = 0
  const store = createIconStore({
    api: {
      url: () => "https://icons.test/icons/data/tabler/general/line.json",
      fetch: async () => {
        requests++
        return Response.json(data)
      },
    },
  })
  await store.preload(["tabler:line"])
  expect(store.snapshot()["tabler:line"]).toEqual(data)
  const serverMarkup = renderToStaticMarkup(
    <IconConfig store={store}>
      <Icon name="tabler:line" />
    </IconConfig>
  )
  const hydratedStore = createIconStore({
    api: false,
    initialData: JSON.parse(JSON.stringify(store.snapshot())),
  })
  expect(
    renderToStaticMarkup(
      <IconConfig store={hydratedStore}>
        <Icon name="tabler:line" />
      </IconConfig>
    )
  ).toBe(serverMarkup)
  expect(serverMarkup).toContain('d="M1 12h22"')
  const markup = renderToStaticMarkup(
    <IconConfig sources={{ LocalLine: parseElementData(data) }} api={false}>
      <Icon name="LocalLine" />
    </IconConfig>
  )
  expect(markup).toContain('d="M1 12h22"')
  expect(requests).toBe(1)
})

test("workspace outline tuples keep fill=none in JSON APIs and remote symbols", () => {
  const data = parseElementData([
    [
      "circle",
      {
        cx: 12,
        cy: 12,
        r: 10,
        stroke: "currentColor",
        strokeWidth: "1.5",
        key: "0",
      },
    ],
  ])
  expect(elementDataToIcon(data).body).toContain('fill="none"')
  expect(createIconSymbolDocument(data)).toContain('fill="none"')
  const markup = renderToStaticMarkup(<Icon data={data} fill="red" />)
  expect(markup).not.toContain('fill="none"')
  expect(markup).toContain("<circle")
})
