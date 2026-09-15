import { createServer } from "node:http"
import { createIconPreviewHandler } from "./preview.ts"

const port = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new RangeError("Invalid PORT")
const handler = createIconPreviewHandler({
  dataDir: process.env.ICON_DATA_DIR ?? "packages/icons",
  symbolsDir: process.env.ICON_SYMBOLS_DIR,
  distDir: process.env.ICON_PREVIEW_DIR ?? "dist/client",
  spa: true,
  basePath: process.env.ICON_API_PATH ?? "/icons",
  onError: (error) => console.error(error),
})
const server = createServer(async (request, response) => {
  try {
    const headers = new Headers()
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      headers.append(request.rawHeaders[index]!, request.rawHeaders[index + 1]!)
    }
    const result = await handler(
      new Request(new URL(request.url ?? "/", "http://localhost"), {
        method: request.method,
        headers,
      })
    )
    response.writeHead(result.status, Object.fromEntries(result.headers))
    response.end(Buffer.from(await result.arrayBuffer()))
  } catch (error) {
    console.error(error)
    response.writeHead(500).end("Internal server error")
  }
})
server.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  console.log(
    `Icones gallery + data: http://${process.env.HOST ?? "127.0.0.1"}:${port}`
  )
})
