import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { createIconStore, Icon, IconConfig, type Data } from "@icones/react"

const line = {
  body: '<path d="M1 12h22" stroke="currentColor"/>',
  width: 24,
  height: 24,
}

const circle = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}

test("bare static/dynamic names and workspace tuples render synchronously from sources", () => {
  const dynamicName: string = "Search01"
  const markup = renderToString(
    <IconConfig
      sources={{
        Search01: line,
        "search-01": line,
        Tuple: [["path", { d: "M3 12h18", stroke: "currentColor" }]],
      }}
      api={false}
      defaultSize="lg"
    >
      <Icon name="Search01" />
      <Icon name={dynamicName} />
      <Icon name="search-01" />
      <Icon name="Tuple" />
    </IconConfig>
  )
  expect(markup.match(/data-state="loaded"/g)).toHaveLength(4)
  expect(markup).toContain('width="24"')
  expect(markup).toContain('d="M3 12h18"')
})

test("nested sources merge child-first while size/stroke-only scopes reuse the store", () => {
  const parent = { Search01: line, Brand: circle }
  const markup = renderToString(
    <IconConfig sources={parent} api={false} defaultSize="lg">
      <IconConfig sources={{ Search01: circle }}>
        <IconConfig strokeWidth={2}>
          <Icon name="Search01" />
          <Icon name="Brand" />
        </IconConfig>
      </IconConfig>
    </IconConfig>
  )
  expect(markup.match(/<circle/g)).toHaveLength(2)
  expect(markup).not.toContain("<path")
  expect(markup.match(/stroke-width="2"/g)).toHaveLength(2)
  expect(markup.match(/width="24"/g)).toHaveLength(2)
})

test("SSR preloads computed names with per-request isolation, then hydrates from data", async () => {
  let firstRequests = 0
  let secondRequests = 0
  const first = createIconStore({
    api: async () => {
      firstRequests++
      return line
    },
  })
  const second = createIconStore({
    api: async () => {
      secondRequests++
      return circle
    },
  })
  const name = "refresh"
  await Promise.all([
    first.preload([`tabler:${name}`, `tabler:${name}`]),
    second.preload([`tabler:${name}`]),
  ])
  const render = (store: typeof first) =>
    renderToString(
      <IconConfig store={store}>
        <Icon name={`tabler:${name}`} />
      </IconConfig>
    )
  const serverMarkup = render(first)
  expect(serverMarkup).toContain("<path")
  expect(render(second)).toContain("<circle")
  expect(firstRequests).toBe(1)
  expect(secondRequests).toBe(1)
  const initialData = JSON.parse(JSON.stringify(first.snapshot())) as Record<
    string,
    Data
  >
  const client = createIconStore({
    initialData,
    api: () => {
      throw new Error("Hydration must not fetch")
    },
  })
  await client.preload([`tabler:${name}`])
  expect(render(client)).toBe(serverMarkup)
})

test("does not start an API request during render when it has not been preloaded", () => {
  let requests = 0
  const store = createIconStore({
    api: () => {
      requests++
      return line
    },
  })
  expect(
    renderToString(
      <IconConfig store={store}>
        <Icon name="tabler:refresh" fallback={<span>loading</span>} />
      </IconConfig>
    )
  ).toBe("<span>loading</span>")
  expect(requests).toBe(0)
})
