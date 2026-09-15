#!/usr/bin/env node
import { parseArgs } from "node:util"
import {
  serveStdio,
  StdioServerTransport,
} from "@modelcontextprotocol/server/stdio"
import { createIconMcpServer } from "./index.ts"
import { resolveDataDirectory } from "./catalog.ts"
import { version } from "../package.json"

const help = `Usage: icones-mcp-server [--data-dir <directory>]

Read-only local Icones MCP server using stdio (no HTTP listener).

  --data-dir <directory>  Root containing <set>/manifest.json and <set>/data/
  --help, -h             Show this help
  --version, -v          Show the package version

Data directory: --data-dir > ICON_DATA_DIR > installed @icones/icons.
Relative paths resolve from the process working directory.
Normal server mode reserves stdout for MCP messages; diagnostics use stderr.
`

try {
  const { values } = parseArgs({
    options: {
      "data-dir": { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: false,
    strict: true,
  })
  if (values.help) process.stdout.write(help)
  else if (values.version) process.stdout.write(version + "\n")
  else {
    // Precedence: explicit flag > environment variable > installed package data.
    const directory = values["data-dir"] ?? process.env.ICON_DATA_DIR
    if (directory !== undefined && !directory.trim())
      throw new Error("Icon data directory must not be empty.")
    const dataDir = await resolveDataDirectory(directory)
    const handle = serveStdio(() => createIconMcpServer({ dataDir }), {
      transport: new StdioServerTransport(process.stdin, process.stdout, {
        maxBufferSize: 1024 * 1024,
      }),
      onerror: (error) => console.error("[icones-mcp-server]", error.message),
    })
    let closing = false
    const close = () => {
      if (closing) return
      closing = true
      // Always close transport before exit; preserve stderr diagnostics on errors.
      void handle.close().catch((error: unknown) => {
        console.error(
          "[icones-mcp-server]",
          error instanceof Error ? error.message : "Shutdown failed"
        )
        process.exitCode = 1
      })
    }
    process.once("SIGINT", close)
    process.once("SIGTERM", close)
    process.stdin.once("end", close)
  }
} catch (error) {
  console.error(
    "[icones-mcp-server]",
    error instanceof Error ? error.message : "Startup failed"
  )
  process.exitCode = 1
}
