import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import ts from "typescript"
import { buildStatic } from "../../../../scripts/icon-builder/src/build/static.ts"
import { updateIconManifest } from "@icones/vite/server"
import { queryStaticCatalog } from "../../../../app/src/features/catalog/static-catalog.ts"
import { loadGallerySelection } from "../../../../app/src/features/catalog/service.ts"

test("deployment uses the static client output without a custom Worker entry", async () => {
  const root = new URL("../../../../", import.meta.url)
  const config = ts.parseConfigFileTextToJson(
    "wrangler.jsonc",
    await readFile(new URL("wrangler.jsonc", root), "utf8")
  )
  expect(config.error).toBeUndefined()
  expect(config.config.assets.directory).toBe("dist/client")
  expect(config.config.main).toBeUndefined()
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"))
  expect(pkg.scripts.build).toBe(
    "bun run build:packages && bun run --cwd app build"
  )
  expect(pkg.scripts["deploy:app"]).toBe(
    "bun run build && WRANGLER_SEND_METRICS=false bunx wrangler@4 deploy --config wrangler.jsonc"
  )
  const appConfig = await readFile(
    new URL("app/react-router.config.ts", root),
    "utf8"
  )
  expect(appConfig).toContain("buildEnd")
  expect(appConfig).toContain("reactRouterConfig.buildDirectory")
})

for (const customOutput of [false, true])
  test(`static output serves original artwork and searchable catalog without a handler (custom output: ${customOutput})`, async () => {
    const root = await mkdtemp(path.join(tmpdir(), "icones-static-"))
    try {
      const source = path.join(root, "packages/icons")
      const output = path.join(
        root,
        customOutput ? "custom/client" : "dist/client"
      )
      await mkdir(path.join(output, "icons"), { recursive: true })
      await writeFile(path.join(output, "icons/index.html"), "gallery")
      for (const directory of ["data", "symbols"])
        await mkdir(path.join(source, "demo", directory), { recursive: true })
      for (const [directory, extension] of [
        ["data", ".json"],
        ["symbols", ".svg"],
      ]) {
        const destination = path.join(output, "icons/demo", directory!)
        await mkdir(destination, { recursive: true })
        await writeFile(
          path.join(destination, "removed-thin" + extension),
          "stale generated artwork"
        )
        await writeFile(path.join(destination, "notes.txt"), "keep")
      }
      const tuple = '[["svg",{"viewBox":"0 0 24 24"},[]]]'
      const symbol = '<svg><symbol id="icon" viewBox="0 0 24 24"/></svg>'
      await updateIconManifest(source, {
        prefix: "demo",
        slug: "star",
        category: "shapes",
        variant: "outline",
        variantAlias: "linear",
      })
      await writeFile(path.join(source, "demo/data/star.json"), tuple)
      await writeFile(path.join(source, "demo/symbols/star.svg"), symbol)
      await writeFile(path.join(source, "demo/license.txt"), "license")
      expect(
        await buildStatic(root, customOutput ? output : undefined)
      ).toEqual({ icons: 1 })
      if (customOutput)
        await expect(
          readFile(path.join(root, "dist/client/icons/catalog.json"))
        ).rejects.toMatchObject({ code: "ENOENT" })
      for (const [directory, extension] of [
        ["data", ".json"],
        ["symbols", ".svg"],
      ]) {
        const destination = path.join(output, "icons/demo", directory!)
        await expect(
          readFile(path.join(destination, "removed-thin" + extension))
        ).rejects.toMatchObject({ code: "ENOENT" })
        expect(
          await readFile(path.join(destination, "notes.txt"), "utf8")
        ).toBe("keep")
      }
      expect(
        await readFile(path.join(output, "icons/index.html"), "utf8")
      ).toBe("gallery")
      expect(
        await readFile(path.join(output, "icons/demo/data/star.json"), "utf8")
      ).toBe(tuple)
      expect(
        await readFile(path.join(output, "icons/demo/symbols/star.svg"), "utf8")
      ).toBe(symbol)
      expect(
        await readFile(path.join(output, "icons/demo/license.txt"), "utf8")
      ).toBe("license")
      let requests = 0
      const fetcher: typeof queryStaticCatalog = (base, query, options) =>
        queryStaticCatalog(base, query, {
          ...options,
          fetch: (async (url: string) => {
            requests++
            expect(url).toBe(`${root}/icons/catalog.json`)
            return new Response(
              await readFile(path.join(output, "icons/catalog.json"))
            )
          }) as typeof fetch,
        })
      const page = await loadGallerySelection(
        `${root}/icons`,
        { set: "demo", q: "star" },
        new AbortController().signal,
        fetcher
      )
      expect(page.total).toBe(1)
      expect(page.icons[0].name).toBe("demo:star")
      expect(page.variants).toEqual([
        { id: "outline", count: 1, alias: "linear" },
      ])
      expect(page.icons[0].variantAlias).toBe("linear")
      expect((await fetcher(`${root}/icons`, { q: "missing" })).total).toBe(0)
      expect(requests).toBe(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
