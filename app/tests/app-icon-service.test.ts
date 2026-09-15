import { expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, loadConfigFromFile, type ViteDevServer } from "vite"
import { iconService } from "../plugins/icon-service.ts"
import { updateIconManifest } from "@icones/vite/server"
import type { CatalogPage } from "../src/features/catalog/protocol.ts"

test("gallery config tracks repository source instead of caching the built server package", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url))
  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.join(root, "app/vite.config.ts"),
    path.join(root, "app"),
    "silent"
  )
  const dependencies = loaded?.dependencies.map((file) => path.resolve(file))
  expect(dependencies).toContain(path.join(root, "app/plugins/icon-service.ts"))
  expect(dependencies).toContain(
    path.join(root, "packages/vite/src/server/repository.ts")
  )
  expect(dependencies).toContain(
    path.join(root, "packages/vite/src/server/manifest.ts")
  )
})

test("gallery refreshes manifest categories, variants and collections while running", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "icones-gallery-service-"))
  const icons = path.join(root, "icons")
  const manifest = path.join(icons, "demo/manifest.json")
  let server: ViteDevServer | undefined
  try {
    await mkdir(path.join(icons, "demo/data"), { recursive: true })
    await writeFile(
      path.join(icons, "demo/data/star.json"),
      '[ ["path", {"d":"M2 12h20"}] ]'
    )
    await updateIconManifest(icons, {
      prefix: "demo",
      slug: "star",
      category: "shapes",
      variant: "outline",
    })
    server = await createServer({
      configFile: false,
      root,
      plugins: [iconService(icons)],
      publicDir: false,
      optimizeDeps: { noDiscovery: true },
      // Deliver explicit watcher events to avoid platform-specific file timing.
      server: { host: "127.0.0.1", port: 0, watch: null },
      logLevel: "silent",
    })
    await server.listen()
    const address = server.httpServer!.address()
    if (!address || typeof address === "string")
      throw new Error("Missing dev address")
    const base = "http://127.0.0.1:" + address.port
    const catalog = async () => {
      const response = await fetch(base + "/icons/catalog")
      expect(response.status).toBe(200)
      return (await response.json()) as CatalogPage
    }
    const initial = await catalog()
    expect(initial.categories).toEqual([{ id: "shapes", count: 1 }])
    expect(initial.icons[0]?.variant).toBe("outline")

    await updateIconManifest(icons, {
      prefix: "demo",
      slug: "star",
      category: "favorites",
      variant: "filled",
    })
    server.watcher.emit("all", "change", manifest)
    const moved = await catalog()
    expect(moved.categories).toEqual([{ id: "favorites", count: 1 }])
    expect(moved.icons[0]).toMatchObject({
      name: "demo:star",
      category: "favorites",
      variant: "filled",
    })
    // Metadata changes do not change the flat icon URL.
    expect((await fetch(base + "/icons/demo/data/star.json")).status).toBe(200)

    const secondManifest = path.join(icons, "second/manifest.json")
    await updateIconManifest(icons, {
      prefix: "second",
      slug: "arrow",
      category: "arrows",
      variant: "outline",
    })
    server.watcher.emit("all", "add", secondManifest)
    expect((await catalog()).total).toBe(2)
    await rm(secondManifest)
    server.watcher.emit("all", "unlink", secondManifest)
    expect((await catalog()).sets).toEqual([{ id: "demo", count: 1 }])

    // A malformed update must not silently serve the previous classification.
    await writeFile(manifest, "{")
    server.watcher.emit("all", "change", manifest)
    expect((await fetch(base + "/icons/catalog")).status).toBe(500)
    await rm(manifest)
    await updateIconManifest(icons, {
      prefix: "demo",
      slug: "star",
      category: "recovered",
      variant: "outline",
    })
    server.watcher.emit("all", "change", manifest)
    expect((await catalog()).categories).toEqual([
      { id: "recovered", count: 1 },
    ])
  } finally {
    await server?.close()
    await rm(root, { recursive: true, force: true })
  }
})
