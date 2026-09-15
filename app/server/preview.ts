import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import {
  createIconDataHandler,
  createIconRepository,
  type IconDataHandlerOptions,
} from "@icones/vite/server"
import { galleryCatalogOptions } from "../src/features/catalog/query.ts"

export type IconPreviewHandlerOptions = IconDataHandlerOptions & {
  distDir: string
  /** Use __spa-fallback.html when present, otherwise the nearest index.html; never for API errors. */
  spa?: boolean
}

/** Serve the built preview and data protocol under the same origin. No Vite server in production. */
export function createIconPreviewHandler(options: IconPreviewHandlerOptions) {
  const repository =
    options.repository ??
    createIconRepository(options.dataDir, { catalog: galleryCatalogOptions })
  const icons = createIconDataHandler({ ...options, repository })
  const root = path.resolve(options.distDir)
  async function asset(file: string, head: boolean): Promise<Response | null> {
    try {
      let info = await stat(file)
      if (info.isDirectory()) {
        file = path.join(file, "index.html")
        info = await stat(file)
      }
      if (!info.isFile()) return null
      return new Response(head ? null : new Uint8Array(await readFile(file)), {
        headers: {
          "Content-Type":
            contentTypes[path.extname(file)] ?? "application/octet-stream",
          "Content-Length": String(info.size),
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      })
    } catch (error) {
      if (
        ["ENOENT", "ENOTDIR"].includes(
          (error as NodeJS.ErrnoException).code ?? ""
        )
      )
        return null
      throw error
    }
  }
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const apiBase = (options.basePath ?? "/icons").replace(/\/+$/, "")
    // A browser page may live at the API base; normalize its trailing slash
    // without turning missing API resources into HTML.
    if (
      options.spa &&
      url.pathname === apiBase + "/" &&
      (request.method === "GET" || request.method === "HEAD") &&
      request.headers.get("Accept")?.includes("text/html")
    )
      return new Response(null, {
        status: 308,
        headers: { Location: apiBase + url.search },
      })
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      })
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname)
    } catch {
      return new Response("Invalid path", { status: 400 })
    }
    if (pathname.includes("\0") || pathname.includes("\\"))
      return new Response("Invalid path", { status: 400 })
    const file = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname)
    )
    const relative = path.relative(root, file)
    if (relative.startsWith("..") || path.isAbsolute(relative))
      return new Response("Forbidden", { status: 403 })
    try {
      const head = request.method === "HEAD"
      const response = await asset(file, head)
      if (response) return response
      // Static files take priority over optional dynamic APIs. In particular,
      // catalog.json is a file, not an Iconify-style set query named "catalog".
      const api = await icons(request)
      if (api && api.status !== 404) return api
      if (
        options.spa &&
        !api &&
        !path.extname(pathname) &&
        request.headers.get("Accept")?.includes("text/html")
      ) {
        // React Router emits a hydration-safe shell for paths not prerendered.
        const staticFallback = await asset(
          path.join(root, "__spa-fallback.html"),
          head
        )
        if (staticFallback) return staticFallback
        // Locale/static sub-app entries take priority over the root SPA entry.
        let directory = path.dirname(file)
        while (directory === root || directory.startsWith(root + path.sep)) {
          const fallback = await asset(path.join(directory, "index.html"), head)
          if (fallback) return fallback
          directory = path.dirname(directory)
        }
      }
      return api ?? new Response("Not found", { status: 404 })
    } catch (error) {
      options.onError?.(error)
      return new Response("Unable to read preview assets", { status: 500 })
    }
  }
}

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".data": "text/x-script; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
}
