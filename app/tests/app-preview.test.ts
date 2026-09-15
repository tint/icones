import { expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { preview, type PreviewServer } from "vite"
import { updateIconManifest } from "@icones/vite/server"
import type { CatalogPage } from "../src/features/catalog/protocol.ts"

test("gallery preview serves built pages, data and symbols without falling back to source collections", async () => {
  const output = await mkdtemp(join(tmpdir(), "icones-preview-"))
  let server: PreviewServer | undefined
  try {
    await Promise.all(
      ["assets/icons", "icons/tabler/data", "icons/tabler/symbols"].map(
        (directory) => mkdir(join(output, directory), { recursive: true })
      )
    )
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="icon" viewBox="0 0 24 24"><path d="M1 2h3"/></symbol></svg>'
    const data = '[ ["path", {"d":"M1 2h3"}] ]\n'
    const record = {
      name: "tabler:star",
      prefix: "tabler",
      category: "shapes",
      variant: "outline",
      variantAlias: "outline",
    }
    const catalog = JSON.stringify([record])
    await updateIconManifest(join(output, "icons"), {
      prefix: "tabler",
      slug: "star",
      category: "shapes",
      variant: "outline",
      variantAlias: "outline",
    })
    await Promise.all([
      writeFile(join(output, "assets/icons/moon.svg"), svg),
      writeFile(join(output, "icons/tabler/data/star.json"), data),
      writeFile(join(output, "icons/tabler/symbols/star.svg"), svg),
      writeFile(join(output, "icons/catalog.json"), catalog),
      writeFile(
        join(output, "index.html"),
        "<!doctype html><title>Icones</title>"
      ),
      writeFile(
        join(output, "icons/index.html"),
        "<!doctype html><title>Built gallery</title>"
      ),
    ])
    server = await preview({
      configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      root: fileURLToPath(new URL("../", import.meta.url)),
      build: { outDir: output },
      preview: { host: "127.0.0.1", port: 0, open: false },
      logLevel: "silent",
    })
    const address = server.httpServer.address()
    if (!address || typeof address === "string")
      throw new Error("Missing preview address")
    const base = "http://127.0.0.1:" + address.port
    expect(
      await (
        await fetch(base + "/icons", { headers: { Accept: "text/html" } })
      ).text()
    ).toContain("<title>Built gallery</title>")
    for (const [file, content, type] of [
      ["/assets/icons/moon.svg", svg, "image/svg+xml"],
      ["/icons/tabler/data/star.json", data, "application/json"],
      ["/icons/tabler/symbols/star.svg", svg, "image/svg+xml"],
      ["/icons/catalog.json", catalog, "application/json"],
    ]) {
      const response = await fetch(base + file)
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain(type!)
      expect(await response.text()).toBe(content!)
      const head = await fetch(base + file, { method: "HEAD" })
      expect(head.status).toBe(200)
      expect(await head.text()).toBe("")
    }
    // Optional preview queries index the emitted manifest, not packages/icons.
    const response = await fetch(base + "/icons/catalog?set=tabler&limit=1")
    expect(response.status).toBe(200)
    const page = (await response.json()) as CatalogPage
    expect(page.total).toBe(1)
    expect(page.icons).toEqual([record])
    // These names exist in the workspace but were not included in this build.
    for (const file of [
      "/icons/tabler/data/heart.json",
      "/icons/tabler/symbols/heart.svg",
      "/icons/lucide/manifest.json",
      "/icons/tabler/heart.svg",
    ]) {
      const response = await fetch(base + file)
      expect(response.status).toBe(404)
      expect(response.headers.get("content-type")).not.toContain("text/html")
    }
  } finally {
    await server?.close()
    await rm(output, { recursive: true, force: true })
  }
})
