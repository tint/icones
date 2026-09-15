import type { Plugin } from "vite"
import { localeMessages } from "../src/shared/i18n/locale-messages.server.ts"
import { prerenderPaths } from "../src/app/prerender.ts"

/** Dictionaries and static-preview fallback only. React Router owns all HTML generation. */
export function localizedAssets(): Plugin {
  let base = "/"
  const pages = new Set(
    prerenderPaths.map((path) => path.replace(/\/$/, "") || "/")
  )
  const documents = Object.fromEntries(
    Object.entries(localeMessages).map(([language, messages]) => [
      `locales/${language}.json`,
      JSON.stringify(messages),
    ])
  )
  return {
    name: "icones:localized-assets",
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost")
        const source = documents[url.pathname.slice(base.length)]
        if (source === undefined) {
          if (url.pathname.endsWith("/index.html")) {
            response
              .writeHead(308, {
                Location: (url.pathname.slice(0, -10) || "/") + url.search,
              })
              .end()
            return
          }
          return next()
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405, { Allow: "GET, HEAD" }).end()
          return
        }
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache",
        })
        response.end(request.method === "HEAD" ? undefined : source)
      })
    },
    generateBundle() {
      if (!this.environment.config.build.emitAssets) return
      for (const [fileName, source] of Object.entries(documents))
        this.emitFile({ type: "asset", fileName, source })
    },
    configurePreviewServer(server) {
      // React Router temporarily starts Vite preview to execute the server build during SSG.
      if (process.env.IS_RR_BUILD_REQUEST === "yes") return
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost")
        if (url.pathname.endsWith(".data"))
          response.setHeader("Content-Type", "text/x-script; charset=utf-8")
        const route = "/" + url.pathname.slice(base.length).replace(/\/$/, "")
        if (
          (request.method === "GET" || request.method === "HEAD") &&
          request.headers.accept?.includes("text/html") &&
          !url.pathname.split("/").at(-1)?.includes(".") &&
          !route.startsWith("/icons/")
        ) {
          request.url = pages.has(route)
            ? base +
              (route === "/" ? "" : route.slice(1) + "/") +
              "index.html" +
              url.search
            : base + "__spa-fallback.html" + url.search
        }
        next()
      })
      return () =>
        server.middlewares.use((request, response, next) => {
          const pathname = new URL(
            request.originalUrl ?? request.url ?? "/",
            "http://localhost"
          ).pathname
          if (
            pathname.split("/").at(-1)?.includes(".") &&
            !pathname.endsWith(".html")
          ) {
            response
              .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
              .end("Not found")
            return
          }
          next()
        })
    },
  }
}
