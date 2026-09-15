import path from "node:path"
import { galleryCatalogOptions } from "../src/features/catalog/query.ts"
import type { Plugin, PreviewServer, ViteDevServer } from "vite"
// Keep workspace server code in Vite's config dependency graph. Externalizing
// the built package leaves Node's old module cached across config restarts.
import {
  createIconDataHandler,
  createIconRepository,
} from "../../packages/vite/src/server/index.ts"

export function iconService(dataDirectory: string): Plugin {
  const dataDir = path.resolve(dataDirectory)
  const cleanups = new Set<() => void>()
  function install(server: ViteDevServer | PreviewServer, isPreview = false) {
    // React Router prerenders the /icons/ document without a browser Accept header.
    if (process.env.IS_RR_BUILD_REQUEST === "yes") return
    const repository = createIconRepository(
      isPreview
        ? path.resolve(server.config.root, server.config.build.outDir, "icons")
        : dataDir,
      {
        catalog: galleryCatalogOptions,
      }
    )
    const handler = createIconDataHandler({
      repository,
      basePath: "/icons",
      cacheControl: "no-cache",
    })
    let revision = 0
    let appliedRevision = 0
    let pending: Promise<void> | undefined
    let notification: Promise<void> | undefined
    let closed = false

    async function synchronize() {
      while (appliedRevision !== revision) {
        pending ??= (async () => {
          const requestedRevision = revision
          await repository.refresh()
          appliedRevision = requestedRevision
        })().finally(() => {
          pending = undefined
        })
        await pending
      }
    }

    if ("watcher" in server) {
      const changed = (event: string, file: string) => {
        if (!["add", "change", "unlink"].includes(event)) return
        const relative = path.relative(dataDir, file).split(path.sep).join("/")
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/manifest\.json$/.test(relative)) return
        revision++
        notification ??= synchronize()
          .then(() => {
            if (!closed) server.ws.send({ type: "full-reload" })
          })
          .catch((error: unknown) => {
            server.config.logger.error(
              `Unable to refresh icon manifests: ${String(error)}`
            )
          })
          .finally(() => {
            notification = undefined
          })
      }
      server.watcher.add(dataDir)
      server.watcher.on("all", changed)
      cleanups.add(() => {
        closed = true
        server.watcher.off("all", changed)
      })
    }

    server.middlewares.use(async (request, response, next) => {
      try {
        const url = new URL(request.url ?? "/", "http://localhost")
        // Built assets such as /assets/icons/*.svg belong to Vite's static server.
        if (!url.pathname.startsWith("/icons/")) return next()
        // Preview must expose original build files (especially catalog.json),
        // never mask missing assets by loading the workspace's source package.
        if (
          isPreview &&
          /^(?:catalog\.json|[a-z0-9-]+\/(?:manifest\.json|license\.txt|data\/[a-z0-9-]+\.json|symbols\/[a-z0-9-]+\.svg))$/.test(
            url.pathname.slice("/icons/".length)
          )
        )
          return next()
        // The unprefixed English gallery has its own static HTML entry.
        if (
          url.pathname === "/icons/index.html" &&
          (request.method === "GET" || request.method === "HEAD") &&
          request.headers.accept?.includes("text/html")
        )
          return next()
        if (
          url.pathname === "/icons/" &&
          (request.method === "GET" || request.method === "HEAD") &&
          request.headers.accept?.includes("text/html")
        ) {
          response.writeHead(308, { Location: "/icons" + url.search }).end()
          return
        }
        // A request racing a manifest update must not observe the old catalog.
        await synchronize()
        const result = await handler(
          new Request(url, { method: request.method })
        )
        if (!result) return next()
        response.statusCode = result.status
        result.headers.forEach((value, key) => response.setHeader(key, value))
        response.end(Buffer.from(await result.arrayBuffer()))
      } catch (error) {
        next(error)
      }
    })
  }
  return {
    name: "icones:gallery-service",
    configureServer: (server) => install(server),
    configurePreviewServer: (server) => install(server, true),
    closeBundle() {
      for (const cleanup of cleanups) cleanup()
      cleanups.clear()
    },
  }
}
