import { elementDataToIcon } from "@icones/core/svg-data"
import type { IconData } from "@icones/core/icon-data"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { createIconRepository, type IconRepository } from "./repository.ts"

export type IconDataHandlerOptions = {
  dataDir?: string
  symbolsDir?: string
  basePath?: string
  repository?: IconRepository
  cacheControl?: string
  onError?: (error: unknown) => void
}

/** Node/Bun resource service, not a page renderer. Mount behind a server/router; GET/HEAD only. */
export function createIconDataHandler(options: IconDataHandlerOptions) {
  const repository = options.repository ?? createIconRepository(options.dataDir)
  const symbolsDir = path.resolve(
    options.symbolsDir ?? path.join(repository.root, "../symbols")
  )
  const base = (options.basePath ?? "/icons").replace(/\/+$/, "")
  if (!base.startsWith("/") || base.includes("?") || base.includes("#"))
    throw new TypeError("basePath must be an absolute URL path.")
  return async (request: Request): Promise<Response | undefined> => {
    // Only handle requests rooted at configured base path.
    const url = new URL(request.url)
    if (!url.pathname.startsWith(base + "/")) return
    const route = url.pathname.slice(base.length + 1)
    const reply = (json: unknown, status = 200) =>
      new Response(request.method === "HEAD" ? null : JSON.stringify(json), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control":
            status === 200
              ? (options.cacheControl ?? "public, max-age=60")
              : "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      })
    // Reject unsupported verbs explicitly; data is read-only.
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      })
    try {
      const params = url.searchParams
      const metadata =
        /^([a-z0-9]+(?:-[a-z0-9]+)*)\/(manifest\.json|license\.txt)$/.exec(
          route
        )
      if (metadata) {
        // Public metadata endpoints: manifest/license read path.
        await repository.ready()
        const manifest = repository.manifests.get(metadata[1]!)
        if (!manifest) return reply({ error: "Not found." }, 404)
        if (metadata[2] === "manifest.json") return reply(manifest)
        try {
          const license = await readFile(
            path.join(repository.root, metadata[1]!, "license.txt"),
            "utf8"
          )
          return new Response(request.method === "HEAD" ? null : license, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Content-Type-Options": "nosniff",
            },
          })
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return reply({ error: "Not found." }, 404)
          throw error
        }
      }
      const flat =
        /^([a-z0-9]+(?:-[a-z0-9]+)*)\/(data|symbols)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(json|svg)$/.exec(
          route
        )
      const symbol =
        /^([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.svg$/.exec(
          route
        )
      if (
        flat ||
        symbol ||
        route.startsWith("symbols/") ||
        route.startsWith("data/")
      ) {
        await repository.ready()
        const isData = flat ? flat[2] === "data" : route.startsWith("data/")
        if (flat && isData !== (flat[4] === "json"))
          return reply({ error: "Not found." }, 404)
        const file = flat
          ? repository.files.get(`${flat[1]}/data/${flat[3]}.json`)
          : symbol
            ? repository.resolve(`${symbol[1]}:${symbol[2]}`)
            : repository.files.get(
                isData
                  ? route.slice(5)
                  : route.slice(8).replace(/\.svg$/, ".json")
              )
        if (!file || (!symbol && !route.endsWith(isData ? ".json" : ".svg")))
          return reply({ error: "Not found." }, 404)
        if (isData) return reply(await repository.read(file))
        let svg: string
        try {
          svg = await readFile(repository.symbolFile(file, symbolsDir), "utf8")
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return reply(
              { error: "Symbol not generated. Run generate:symbols." },
              404
            )
          throw error
        }
        return new Response(request.method === "HEAD" ? null : svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": options.cacheControl ?? "public, max-age=60",
            "X-Content-Type-Options": "nosniff",
          },
        })
      }
      if (route === "catalog") {
        // Catalog endpoint supports server-side filtering/pagination.
        const offset = Number(params.get("offset") ?? 0)
        const limit = Number(params.get("limit") ?? 60)
        if (
          !Number.isSafeInteger(offset) ||
          offset < 0 ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 100 ||
          (params.get("q")?.length ?? 0) > 200
        )
          return reply({ error: "Invalid pagination or query." }, 400)
        return reply({
          version: 1,
          ...(await repository.catalog({
            set: params.get("set") ?? undefined,
            category: params.get("category") ?? undefined,
            variant: params.get("variant") ?? undefined,
            q: params.get("q") ?? undefined,
            offset,
            limit,
            suffix: params.get("suffix") ?? undefined,
            excludeSuffix: params.get("excludeSuffix") ?? undefined,
          })),
        })
      }
      const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/.exec(route)
      if (!match) return reply({ error: "Not found." }, 404)
      const prefix = match[1]!
      const names = [...new Set((params.get("icons") ?? "").split(","))]
      if (
        names.length > 100 ||
        names.some((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
      )
        return reply({ error: "Request 1–100 valid icon names." }, 400)
      const icons: Record<string, IconData> = Object.create(null)
      const missing: string[] = []
      // Bound file reads even for batched requests.
      for (let offset = 0; offset < names.length; offset += 8) {
        await Promise.all(
          names.slice(offset, offset + 8).map(async (name) => {
            const data = await repository.get(`${prefix}:${name}`)
            if (data) icons[name] = elementDataToIcon(data)
            else missing.push(name)
          })
        )
      }
      return reply({ prefix, icons, not_found: missing.sort() })
    } catch (error) {
      options.onError?.(error)
      return reply({ error: "Unable to read icon data." }, 500)
    }
  }
}
