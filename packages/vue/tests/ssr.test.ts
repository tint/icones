import { expect, test } from "bun:test"
import { createSSRApp, h } from "vue"
import { renderToString as renderVue } from "vue/server-renderer"
import { Icon as VueIcon, IconConfig as VueConfig } from "@icones/vue"
import { createIconScope } from "@icones/core"

const data = {
  body: '<defs><linearGradient id="paint"/></defs><path fill="url(#paint)"/>',
  width: 24,
  height: 24,
}

test("Vue renders on the server with nested config, unique ids and preloaded state", async () => {
  const scope = createIconScope({ api: async () => data })
  await scope.store.preload(["async"])
  const html = await renderVue(
    createSSRApp({
      render: () =>
        h(VueConfig, { defaultSize: "xl" }, () => [
          h(VueIcon, { name: "async", scope, "aria-label": "shape" }),
          h(VueIcon, { data }),
          h(VueIcon, { data }),
        ]),
    })
  )
  expect(html).toContain('data-state="loaded"')
  expect(html).toContain('width="28"')
  const ids = [...html.matchAll(/id="(icon-[^"]+-paint)"/g)].map(
    (match) => match[1]
  )
  expect(ids.length).toBe(3)
  expect(new Set(ids).size).toBe(3)
})
