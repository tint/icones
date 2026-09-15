import type { Plugin } from "vite"
import { createLlmsDocuments } from "../src/features/llms/markdown.ts"

export function llmsDocuments(): Plugin {
  // Guide imports are in Vite's config dependency graph, so edits refresh the files.
  const documents = createLlmsDocuments()
  return {
    name: "icones:llms-documents",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost")
          .pathname
        const filename = pathname.slice(1)
        if (!Object.hasOwn(documents, filename)) return next()
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405, { Allow: "GET, HEAD" }).end()
          return
        }
        response
          .writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
          })
          .end(
            request.method === "HEAD"
              ? undefined
              : documents[filename as keyof typeof documents]
          )
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(documents)) {
        this.emitFile({ type: "asset", fileName, source })
      }
    },
  }
}
