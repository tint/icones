import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { build } from "vite"
import { icones } from "../../../../packages/vite/src/index.ts"
import { createIconRepository } from "@icones/vite/server"

// Real local metadata, synthetic build requests. No network or source-icon writes.
import { workspaceRoot as root } from "../paths.ts"
const repository = createIconRepository(path.join(root, "packages/icons"))
const started = performance.now()
await repository.ready()
const indexMs = performance.now() - started
const first =
  [...repository.records.values()].find(
    (record) => record.prefix === "tabler"
  ) ?? repository.records.values().next().value
if (!first) throw new Error("Benchmark requires icons to contain icons.")
const rounds = 5
async function measure(run: () => Promise<void>) {
  const samples: number[] = []
  for (let round = 0; round < rounds; round++) {
    const start = performance.now()
    await run()
    samples.push(performance.now() - start)
  }
  return Number(
    samples.toSorted((a, b) => a - b)[Math.floor(rounds / 2)].toFixed(2)
  )
}
await repository.catalog({ set: first.prefix, limit: 100 })
const catalogMs = await measure(async () => {
  for (let page = 0; page < 100; page++)
    await repository.catalog({
      set: first.prefix,
      offset: page * 100,
      limit: 100,
    })
})
await repository.read(first)
const readMs = await measure(async () => {
  for (let read = 0; read < 500; read++) await repository.read(first)
})
const directory = await mkdtemp(path.join(tmpdir(), "icones-benchmark-"))
const entryId = "virtual:packages-benchmark"
const names = Array.from(
  { length: 80 },
  (_, index) => `benchmark:icon-${index}`
)
let active = 0
let peak = 0
let calls = 0
try {
  const buildStarted = performance.now()
  const output = await build({
    root,
    configFile: false,
    logLevel: "silent",
    cacheDir: path.join(directory, "cache"),
    plugins: [
      icones({
        dataDir: path.join(directory, "data"),
        mode: "symbol",
        emitData: false,
        fallbackToApi: false,
        loadIcon: async () => {
          calls++
          peak = Math.max(peak, ++active)
          try {
            await new Promise((resolve) => setTimeout(resolve, 5))
            return { body: '<path d="M0 12h24"/>' }
          } finally {
            active--
          }
        },
      }),
      {
        name: "benchmark-entry",
        resolveId: (id) => (id === entryId ? "\0" + id : undefined),
        load: (id) =>
          id === "\0" + entryId
            ? 'import { Icon } from "@icones/react"; import { createElement } from "react"; export const icons = [' +
              names
                .map(
                  (name) =>
                    `createElement(Icon, { name: ${JSON.stringify(name)} })`
                )
                .join(",") +
              "];"
            : undefined,
      },
    ],
    build: {
      write: false,
      rollupOptions: { input: entryId, external: ["react", "@icones/react"] },
    },
  })
  const files = (Array.isArray(output) ? output : [output]).flatMap((item) =>
    "output" in item ? item.output : []
  )
  console.log(
    JSON.stringify(
      {
        runtime: process.version,
        icons: repository.records.size,
        sampleIcon: first.name,
        indexMs: Number(indexMs.toFixed(2)),
        medianOf: rounds,
        catalog100PagesMs: catalogMs,
        readSameIcon500TimesMs: readMs,
        syntheticBuild: {
          icons: names.length,
          loaderDelayMs: 5,
          calls,
          peakConcurrency: peak,
          elapsedMs: Number((performance.now() - buildStarted).toFixed(2)),
          symbols: files.filter(
            (file) => file.type === "asset" && file.fileName.endsWith(".svg")
          ).length,
        },
      },
      null,
      2
    )
  )
} finally {
  await rm(directory, { recursive: true, force: true })
}
