import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createIconDataHandler } from "@icones/vite/server"
import { createIconStore } from "@icones/react"
import { iconToElementData } from "@icones/vite/tooling/elements"
import { generateSymbols } from "../../../../scripts/icon-builder/src/generate/symbols.ts"

const temporary: string[] = []

test("Vite server subpath exports reusable data services, not gallery hosting", async () => {
  const server = await import("@icones/vite/server")
  expect(server).not.toHaveProperty("createIconPreviewHandler")
  expect(server.createIconDataHandler).toBeFunction()
  expect(server.createIconRepository).toBeFunction()
})

async function fixture() {
  const iconsDir = await mkdtemp(path.join(tmpdir(), "iconify-protocol-"))
  temporary.push(iconsDir)
  const dataDir = path.join(iconsDir, "data")
  for (const [name, body] of Object.entries({
    "tabler/shapes/star": "<path/>",
    "tabler/shapes/star-filled": "<circle/>",
    "tabler/arrows/refresh": "<path/>",
    "brand/logos/github": "<path/>",
  })) {
    const file = path.join(dataDir, name + ".json")
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(
      file,
      JSON.stringify(iconToElementData({ width: 24, height: 24, body }))
    )
  }
  await generateSymbols(iconsDir)
  return dataDir
}

afterEach(async () => {
  await Promise.all(
    temporary
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

test("protocol resolves exact names without category knowledge or an index request", async () => {
  const dataDir = await fixture()
  const handler = createIconDataHandler({ dataDir })
  const requests: string[] = []
  const store = createIconStore({
    api: {
      baseUrl: "https://icons.test/icons",
      fetch: async (input, init) => {
        requests.push(String(input))
        return (await handler(new Request(input, init)))!
      },
    },
  })
  await store.preload(["tabler:star"])
  expect(requests).toEqual(["https://icons.test/icons/tabler.json?icons=star"])
  expect(Object.keys(store.snapshot())).toEqual(["tabler:star"])
  expect(await store.load("tabler:absent")).toBeNull()
  const batch = await handler(
    new Request(
      "https://icons.test/icons/tabler.json?icons=star,star-filled,absent"
    )
  )
  const body = await batch!.json()
  expect(Object.keys(body.icons)).toEqual(["star", "star-filled"])
  expect(body.not_found).toEqual(["absent"])
})
