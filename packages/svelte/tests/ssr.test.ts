import { expect, test } from "vitest"
import { render } from "svelte/server"
import { createIconScope } from "@icones/svelte"
import Fixture from "./Fixture.svelte"

test("SSR uses preloaded sources and emits unique SVG ids without running loaders", async () => {
  let calls = 0
  const scope = createIconScope({
    api: async () => {
      calls++
      return { body: '<path d="M0 0h24"/>' }
    },
  })
  await scope.store.preload(["slow"])
  const { body } = render(Fixture, { props: { scope } })
  expect(body).toContain('data-state="loaded"')
  expect(body).toContain('data-icon="slow"')
  expect(body).toContain('width="16"')
  expect(calls).toBe(1)
  const ids = [...body.matchAll(/id="(icon-[^"]+-a)"/g)].map(
    (match) => match[1]
  )
  expect(ids.length).toBe(2)
  expect(new Set(ids).size).toBe(2)
})
