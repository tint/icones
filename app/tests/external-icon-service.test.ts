import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { createServer as createHttpServer } from "node:http"
import { createServer } from "vite"
import { icones } from "@icones/vite"
import type { IconData } from "@icones/core/types"
import { createIconApiLoader } from "@icones/core/loaders"

const circle: IconData = {
  body: '<path fill="none" stroke="currentColor" stroke-width="2" d="M2 12h20"/>',
  width: 24,
  height: 24,
}

const filled: IconData = {
  body: '<path fill="currentColor" d="M2 10h20v4H2z"/>',
  width: 24,
  height: 24,
}

const temporaryDirectories: string[] = []

async function temporaryData() {
  const directory = await mkdtemp(tmpdir() + "/icones-test-")
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

for (const perCollection of [false, true])
  test(`preview loads individual JSON files from a separate server (per-collection: ${perCollection})`, async () => {
    const requested: string[] = []
    const dataServer = createHttpServer((request, response) => {
      requested.push(request.url!)
      response.setHeader("Content-Type", "application/json")
      response.end(
        JSON.stringify(request.url!.includes("-filled") ? filled : circle)
      )
    })
    await new Promise<void>((resolve) =>
      dataServer.listen(0, "127.0.0.1", resolve)
    )
    let server: Awaited<ReturnType<typeof createServer>> | undefined
    try {
      const address = dataServer.address() as { port: number }
      server = await createServer({
        root: import.meta.dir + "/../..",
        configFile: false,
        optimizeDeps: { noDiscovery: true, include: [] },
        cacheDir: await temporaryData(),
        logLevel: "silent",
        define: {
          "import.meta.env.VITE_ICON_DATA_BASE_URL": JSON.stringify(
            `http://127.0.0.1:${address.port}/icons/`
          ),
          "import.meta.env.VITE_ICON_COLLECTION_URL": JSON.stringify(
            perCollection
              ? `http://127.0.0.1:${address.port}/collections/{set}/`
              : ""
          ),
        },
        plugins: [icones({ fallbackToApi: false })],
        server: { middlewareMode: true },
      })
      const { dataBaseUrl, catalogBaseUrl, previewIconApi, collectionBaseUrl } =
        await server.ssrLoadModule("/app/src/shared/icons/config.ts")
      expect(previewIconApi).toMatchObject({
        type: "fetch",
        baseUrl: `http://127.0.0.1:${address.port}/icons`,
      })
      expect(dataBaseUrl).toBe(`http://127.0.0.1:${address.port}/icons`)
      expect(catalogBaseUrl).toBe("/icons")
      const collectionPath = perCollection
        ? "/collections/tabler"
        : "/icons/tabler"
      expect(collectionBaseUrl("tabler")).toBe(
        `http://127.0.0.1:${address.port}${collectionPath}`
      )
      const fetchIcon = createIconApiLoader(previewIconApi)
      expect(
        await fetchIcon("tabler:star", {
          provider: "",
          prefix: "tabler",
          name: "star",
        })
      ).toEqual(circle)
      expect(requested).toEqual([`${collectionPath}/data/star.json`])
      expect(
        await fetchIcon("tabler:star-filled", {
          provider: "",
          prefix: "tabler",
          name: "star-filled",
        })
      ).toEqual(filled)
      expect(requested).toEqual([
        `${collectionPath}/data/star.json`,
        `${collectionPath}/data/star-filled.json`,
      ])
    } finally {
      await server?.close()
      await new Promise<void>((resolve, reject) =>
        dataServer.close((error) => (error ? reject(error) : resolve()))
      )
    }
  })
