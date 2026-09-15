import { afterEach, expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import {
  Icon,
  IconConfig,
  createIconStore,
  addIconData,
  addIconSet,
  clearIconData,
  loadIconData,
  resolveIconData,
  type IconSet,
} from "@icones/react"

const outline = {
  body: '<path d="M2 12h20" fill="none" stroke="currentColor"/>',
  width: 24,
  height: 24,
}

const solid = {
  body: '<path d="M2 10h20v4H2z" fill="currentColor"/>',
  width: 24,
  height: 24,
}

const tabler: IconSet = {
  prefix: "tabler",
  width: 24,
  height: 24,
  icons: { heart: outline, "heart-filled": solid, refresh: outline },
}

afterEach(() => clearIconData())

test("sources and individual JSON contain just the requested drawing", () => {
  const html = renderToString(
    <IconConfig sources={{ Search01: outline, SearchFilled: solid }}>
      <Icon name="Search01" />
      <Icon name="SearchFilled" />
      <Icon data={outline} />
      <Icon data={solid} />
    </IconConfig>
  )
  expect(html.match(/M2 10h20v4H2z/g)).toHaveLength(2)
  expect(html.match(/M2 12h20/g)).toHaveLength(2)
  expect(html.match(/data-state="loaded"/g)).toHaveLength(4)
})

test("resolves exact set names without inventing a filled counterpart", async () => {
  const store = createIconStore({ sources: { tabler }, api: false })
  expect(store.getState("tabler:heart").data).toEqual(outline)
  expect(store.getState("tabler:heart-filled").data).toEqual(solid)
  expect(await store.load("tabler:refresh-filled")).toBeNull()
  expect(
    renderToString(
      <IconConfig store={store}>
        <Icon name="tabler:heart-filled" />
      </IconConfig>
    )
  ).toContain(solid.body)
  expect(
    renderToString(
      <IconConfig store={store}>
        <Icon
          name="tabler:refresh-filled"
          fallback={<span>Unavailable</span>}
        />
      </IconConfig>
    )
  ).toBe("<span>Unavailable</span>")
})

test("loads only requested names, deduplicates, and snapshots only loaded data for SSR", async () => {
  const requested: string[] = []
  const store = createIconStore({
    api: async (name) => {
      requested.push(name)
      return name.endsWith("-filled") ? solid : outline
    },
  })
  await store.preload(["tabler:heart", "tabler:heart"])
  expect(requested).toEqual(["tabler:heart"])
  expect(store.snapshot()).toEqual({ "tabler:heart": outline })
  await store.preload(["tabler:heart-filled", "tabler:heart-filled"])
  expect(requested).toEqual(["tabler:heart", "tabler:heart-filled"])
  expect(store.snapshot()).toEqual({
    "tabler:heart": outline,
    "tabler:heart-filled": solid,
  })
  const hydrated = createIconStore({
    initialData: JSON.parse(JSON.stringify(store.snapshot())),
    api: () => {
      throw new Error("Must not refetch")
    },
  })
  await hydrated.preload(["tabler:heart", "tabler:heart-filled"])
  const render = (data: typeof store) =>
    renderToString(
      <IconConfig store={data}>
        <Icon name="tabler:heart-filled" />
      </IconConfig>
    )
  expect(render(hydrated)).toBe(render(store))
})

test("global registration and set updates isolate independent names", async () => {
  addIconData("LocalIcon", outline)
  addIconData("LocalFilledIcon", solid)
  expect(renderToString(<Icon name="LocalFilledIcon" />)).toContain(solid.body)
  expect(await loadIconData("OtherIcon", async () => solid)).toEqual(solid)
  addIconSet(tabler)
  expect(resolveIconData("tabler:heart-filled")).toEqual(solid)
  addIconSet({
    ...tabler,
    icons: { heart: outline, "heart-filled": { body: "<circle/>" } },
  })
  expect(resolveIconData("tabler:heart-filled")).toHaveProperty(
    "body",
    "<circle/>"
  )
  expect(resolveIconData("tabler:heart")).toEqual(outline)
  clearIconData("LocalIcon")
  expect(resolveIconData("LocalIcon")).toBeNull()
  expect(resolveIconData("LocalFilledIcon")).toEqual(solid)
})
