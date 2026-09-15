import { createHash } from "node:crypto"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { toAsciiSlug } from "@icones/core/slug"
import { getIconData, iconToSVG, quicklyValidateIconSet } from "@iconify/utils"
import type { IconifyIcon, IconifyJSON } from "@iconify/types"
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite"

import {
  configurableStrokeBody,
  replaceSvgIds,
  withIconViewBox,
} from "@icones/core/svg"
import { elementDataToIcon } from "@icones/core/svg-data"
import type { ElementData } from "@icones/core/element-types"
import { iconToElementData } from "./tooling/elements.ts"
import { readIconData } from "@icones/core/icon-data"
import { readElementData } from "@icones/core/elements"
import { collectStaticNames } from "./collect.ts"
import { collectHtmlNames, resolveAttrPrefixes } from "./collect-html.ts"
import { createExtractionQueue } from "./queue.ts"
import {
  createIconRepository,
  assertIconName as assertName,
  type IconRecord,
  type IconRepository,
} from "./server/repository.ts"
import { collectionEntry } from "./tooling/collections.ts"
import { updateCollectionManifest as updateIconManifest } from "./tooling/collections.ts"
import { createIconSymbolDocument } from "./tooling/symbol.ts"
import { createIconDataHandler } from "./server/handler.ts"

export type Mode = "svg" | "symbol"
export type Options = {
  mode?: Mode
  /** First lookup: <dataDir>/<set>/data/<icon>.json (default: icons/). Missing names fall back to @icones/icons. */
  dataDir?: string
  /** Legacy layout override. New collections keep SVGs in <set>/symbols/. */
  symbolsDir?: string
  /** Public/build output directory, relative to the Vite base. */
  assetsDir?: string
  /** JSON output: all local + collected package icons (true/default), collected only ("used"), or none (false). */
  emitData?: boolean | "used" | "all"
  /** Optional extraction sources. Only statically collected icons are saved. */
  iconSets?: readonly IconifyJSON[]
  icons?: Readonly<Record<string, IconifyIcon>>
  /** Category overrides for sets that do not supply category metadata. */
  categories?: Readonly<Record<string, string>>
  /** Build/dev extraction only. Runtime fallback is configured through IconConfig. */
  fallbackToApi?: boolean
  /** Build/dev API endpoint only; configure runtime api separately. */
  apiBaseUrl?: string
  /** Maximum concurrent extractions across modules. Default: 8. */
  concurrency?: number
  /** Per-active-extraction deadline in milliseconds; queued time is excluded. Default: 15000. */
  timeout?: number
  /** Custom build-time API. Runtime APIs are configured on IconConfig. */
  loadIcon?: (
    name: string,
    request?: { signal: AbortSignal }
  ) =>
    | IconifyIcon
    | IconifyJSON
    | null
    | Promise<IconifyIcon | IconifyJSON | null>
  /** Additional import paths exporting Icon (e.g. a local barrel). */
  importSources?: readonly string[]
  /** Attribute prefixes collected from <i> elements. Defaults to ["icon-"]. */
  attrPrefixes?: readonly string[]
}
export type IconesPluginOptions = Options
/** @deprecated Use IconesPluginOptions instead. */
export type IconifyPluginOptions = IconesPluginOptions

// Virtual module namespace for runtime glue and per-icon static registration.
const runtimeId = "virtual:icones"
const iconId = runtimeId + "/icon/"
const pluginImporter = fileURLToPath(import.meta.url)
type RecordData = { record: IconRecord; repository: IconRepository }
type Asset = { fileName: string; source: string }

/** Collect literal Icon references, leaving computed names to the runtime API. */
export function icones(options: Options = {}): Plugin[] {
  const htmlPrefixes = resolveAttrPrefixes(options.attrPrefixes)
  const mode = options.mode ?? "svg"
  const extraction = createExtractionQueue(options.concurrency, options.timeout)
  const assetsDir = options.assetsDir ?? "icons"
  if (
    !assetsDir ||
    assetsDir.startsWith("/") ||
    assetsDir.includes("\\") ||
    assetsDir.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(
      "assetsDir must be a relative output directory without traversal segments."
    )
  }
  const sets = new Map<string, IconifyJSON>()
  for (const set of options.iconSets ?? []) {
    if (!quicklyValidateIconSet(set))
      throw new TypeError("Invalid Iconify icon set.")
    if (sets.has(set.prefix))
      throw new Error("Duplicate icon set prefix: " + set.prefix)
    sets.set(set.prefix, set)
  }
  let repository: IconRepository
  let bundledRepository: IconRepository | undefined
  const assets = new Map<string, Asset>()
  const collected = new Map<string, RecordData>()
  const pending = new Map<string, Promise<RecordData>>()
  const generatedFiles = new Map<string, string>()
  let config: ResolvedConfig
  let coreRuntimeId: string
  let dataDir: string
  let symbolsDir: string
  let legacyLayout = false
  const dataAsset = (record: IconRecord) =>
    record.file.includes("/data/") ? record.file : `data/${record.file}`
  const symbolAsset = (record: IconRecord) =>
    record.file.includes("/data/")
      ? record.file.replace("/data/", "/symbols/")
      : `symbols/${record.file}`

  async function extract(
    name: string,
    signal: AbortSignal
  ): Promise<RecordData> {
    // Local overrides (including unindexed JSON) win over the read-only package.
    await repository.ready()
    signal.throwIfAborted()
    const local = repository.resolve(name)
    if (local) {
      if (!legacyLayout && !repository.manifests.has(local.prefix)) {
        await persistManifest(
          {
            prefix: local.prefix,
            slug: local.name.split(":")[1]!,
            category: local.category,
            variant: local.variant ?? "outline",
          },
          await repository.read(local)
        )
      }
      return { record: local, repository }
    }
    assertName(name)
    const [prefix, slug] = name.split(":")
    if (!legacyLayout) {
      const entry = collectionEntry(prefix!, "general", slug!)
      const file = `${entry.prefix}/data/${entry.slug}.json`
      try {
        const data = readElementData(
          JSON.parse(await readFile(path.join(dataDir, file), "utf8")),
          name
        )
        await persistManifest(entry, data)
        const record = repository.add({
          name: `${entry.prefix}:${entry.slug}`,
          prefix: entry.prefix,
          category: entry.category,
          variant: entry.variant,
          ...(entry.variantAlias ? { variantAlias: entry.variantAlias } : {}),
          file,
        })
        return { record, repository }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
    }
    // Resolve from this plugin's dependencies, not the application's cwd or a
    // monorepo path. Index manifests lazily; only read the requested icon body.
    bundledRepository ??= createIconRepository(
      path.dirname(
        createRequire(import.meta.url).resolve("@icones/icons/package.json")
      )
    )
    await bundledRepository.ready()
    signal.throwIfAborted()
    const bundled = bundledRepository.resolve(name)
    if (bundled) return { record: bundled, repository: bundledRepository }

    const set = sets.get(prefix)
    let data = options.icons?.[name] ?? (set ? getIconData(set, slug) : null)
    let category = options.categories?.[name]
    category ??= Object.entries(set?.categories ?? {}).find(([, names]) =>
      names.includes(slug)
    )?.[0]
    if (!data) {
      let result: IconifyIcon | IconifyJSON | null = null
      if (options.loadIcon) result = await options.loadIcon(name, { signal })
      else if (options.fallbackToApi !== false) {
        const base = (
          options.apiBaseUrl ?? "https://api.iconify.design"
        ).replace(/\/+$/, "")
        const response = await fetch(
          `${base}/${prefix}.json?icons=${encodeURIComponent(slug)}`,
          { signal }
        )
        if (response.ok) result = (await response.json()) as IconifyJSON
        else if (response.status !== 404)
          throw new Error(`Icon API returned ${response.status} for ${name}`)
      }
      signal.throwIfAborted()
      if (result && "icons" in result) {
        if (!quicklyValidateIconSet(result) || result.prefix !== prefix)
          throw new TypeError("Invalid icon set from API: " + name)
        category ??= Object.entries(result.categories ?? {}).find(([, names]) =>
          names.includes(slug)
        )?.[0]
        data = getIconData(result, slug)
      } else if (result) {
        data = readIconData(result, name)
      }
    }
    if (!data)
      throw new Error(
        `Unable to resolve static icon ${name} in dataDir or @icones/icons. Add its JSON to dataDir, configure iconSets, or supply loadIcon.`
      )
    readIconData(data, name)
    // Category is manifest metadata, never part of a new collection’s file path.
    const categoryDirectory = slugify(category ?? "general")
    const entry = collectionEntry(prefix!, categoryDirectory, slug!)
    const file = legacyLayout
      ? `${prefix}/${categoryDirectory}/${slug}.json`
      : `${entry.prefix}/data/${entry.slug}.json`
    const elements = iconToElementData(data)
    const destination = path.join(dataDir, file)
    await mkdir(path.dirname(destination), { recursive: true })
    signal.throwIfAborted()
    const content = JSON.stringify(elements, null, 2) + "\n"
    generatedFiles.set(destination, content)
    try {
      await writeFile(destination, content, {
        flag: "wx",
      })
    } catch (error) {
      generatedFiles.delete(destination)
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      // Never overwrite manually maintained JSON or a concurrent build's file.
      const existing: unknown = JSON.parse(await readFile(destination, "utf8"))
      readElementData(existing, destination)
    }
    signal.throwIfAborted()
    if (!legacyLayout)
      await persistManifest(
        entry,
        readElementData(JSON.parse(await readFile(destination, "utf8")), name)
      )
    const record = repository.add({
      name: legacyLayout ? name : `${entry.prefix}:${entry.slug}`,
      prefix: legacyLayout ? prefix! : entry.prefix,
      category: legacyLayout ? categoryDirectory : entry.category,
      ...(!legacyLayout
        ? { variant: entry.variant, variantAlias: entry.variantAlias }
        : {}),
      file,
    })
    return { record, repository }
  }

  async function persistManifest(
    entry: ReturnType<typeof collectionEntry>,
    data: ElementData
  ) {
    // Keep symbols and manifest in sync so both symbol mode and offline data mode stay discoverable.
    const file = path.join(
      dataDir,
      entry.prefix,
      "symbols",
      entry.slug + ".svg"
    )
    await mkdir(path.dirname(file), { recursive: true })
    try {
      await writeFile(
        file,
        createIconSymbolDocument(data, `${entry.prefix}:${entry.slug}`) + "\n",
        {
          flag: "wx",
        }
      )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
    await updateIconManifest(dataDir, entry)
    const manifest = path.join(dataDir, entry.prefix, "manifest.json")
    generatedFiles.set(manifest, await readFile(manifest, "utf8"))
  }

  function getRecord(name: string) {
    // Avoid duplicated extraction for repeated imports of the same icon name.
    let request = pending.get(name)
    if (!request) {
      request = extraction
        .run(name, (signal) => extract(name, signal))
        .finally(() => {
          if (pending.get(name) === request) pending.delete(name)
        })
      pending.set(name, request)
    }
    return request
  }

  function installMiddleware(
    server: Pick<ViteDevServer, "middlewares" | "config">,
    isPreview = false
  ) {
    // Serve icon data requests from preview/build assets first, then dynamic symbol/data handler.
    const basePath = new URL(
      joinBase(config.base, assetsDir),
      "http://iconify.local"
    ).pathname
    const outputDir = isPreview
      ? path.resolve(
          config.root,
          config.environments.client.build.outDir,
          assetsDir
        )
      : undefined
    const handler = createIconDataHandler({
      dataDir,
      symbolsDir,
      repository,
      basePath,
      cacheControl: "no-cache",
      onError: (error) => server.config.logger.error(String(error)),
    })
    server.middlewares.use(async (request, response, next) => {
      try {
        const url = new URL(request.url ?? "/", "http://iconify.local")
        const pathname = url.pathname
        if (request.method !== "GET" && request.method !== "HEAD") return next()
        const relative = pathname.startsWith(basePath + "/")
          ? pathname.slice(basePath.length + 1)
          : undefined
        if (relative === undefined) return next()
        // Preview starts with an empty asset map. Let Vite serve emitted files
        // (including its HEAD/ETag handling) before consulting source data.
        // Restrict the lookup to generated paths, never arbitrary URL paths.
        if (
          outputDir &&
          /^(?:symbols\/[a-z0-9/-]+\.svg|data\/[a-z0-9/-]+\.json|[a-z0-9-]+\/(?:data\/[a-z0-9-]+\.json|symbols\/[a-z0-9-]+\.svg))$/.test(
            relative
          )
        ) {
          try {
            if ((await stat(path.join(outputDir, relative))).isFile())
              return next()
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code
            if (code !== "ENOENT" && code !== "ENOTDIR") throw error
          }
        }
        const asset = isPreview
          ? undefined
          : assets.get(`${assetsDir}/${relative}`)
        await repository.ready()
        const local = relative.startsWith("data/")
          ? repository.files.get(relative.slice(5))
          : undefined
        // Only collected package JSON is exposed here; the dynamic catalog/API
        // remains scoped to dataDir, just like the standalone server entry.
        const source = local
          ? { record: local, repository }
          : isPreview
            ? undefined
            : collected.get(relative)
        if (asset || source) {
          response.setHeader(
            "Content-Type",
            asset
              ? "image/svg+xml; charset=utf-8"
              : "application/json; charset=utf-8"
          )
          response.setHeader("Cache-Control", "no-cache")
          response.end(
            request.method === "HEAD"
              ? undefined
              : (asset?.source ??
                  JSON.stringify(await source!.repository.read(source!.record)))
          )
          return
        }
        const result = await handler(
          new Request(url, { method: request.method })
        )
        if (!result) return next()
        response.statusCode = result.status
        result.headers.forEach((value, key) => response.setHeader(key, value))
        response.end(await result.text())
      } catch (error) {
        next(error)
      }
    })
  }

  const resolver: Plugin = {
    name: "icones:resolve",
    enforce: "pre",
    resolveId(id) {
      if (id === runtimeId || id === "@icones/core/runtime")
        return "\0" + runtimeId
      if (id.startsWith(iconId)) return "\0" + id
    },
  }
  const plugin: Plugin = {
    name: "icones",
    enforce: "post",
    config() {
      return {
        optimizeDeps: {
          exclude: [
            "@icones/react",
            "@icones/vue",
            "@icones/svelte",
            "@icones/solidjs",
            "@icones/astro",
            "@icones/vanilla",
            "@icones/core",
            "@icones/core/runtime",
          ],
        },
        ssr: { noExternal: [/^@icones\//] },
      }
    },
    async configResolved(value) {
      config = value
      coreRuntimeId =
        (await value.createResolver()(
          "@icones/core/runtime",
          pluginImporter
        )) ?? ""
      if (!coreRuntimeId)
        throw new Error("Unable to resolve @icones/core/runtime.")
      dataDir = path.resolve(config.root, options.dataDir ?? "icons")
      symbolsDir = path.resolve(
        config.root,
        options.symbolsDir ?? path.join(dataDir, "../symbols")
      )
      legacyLayout = path.basename(dataDir) === "data"
      repository = createIconRepository(dataDir, {
        legacyVariant: (prefix, category, slug) =>
          collectionEntry(prefix, category, slug).variant,
      })
    },
    async buildStart() {
      assets.clear()
      collected.clear()
      await repository.refresh()
      await bundledRepository?.refresh()
      if (
        config.command === "build" &&
        this.environment.config.build.emitAssets &&
        options.emitData !== false &&
        options.emitData !== "used"
      ) {
        for (const record of repository.records.values()) {
          const data = await repository.read(record)
          this.emitFile({
            type: "asset",
            fileName: `${assetsDir}/${dataAsset(record)}`,
            source: JSON.stringify(data, null, 2) + "\n",
          })
        }
      }
    },
    buildEnd(error) {
      if (error) extraction.cancel(error)
    },
    closeBundle() {
      if (config.command === "serve") extraction.cancel()
    },
    async transform(code, id) {
      if (
        id.includes("node_modules") ||
        id.startsWith("\0" + runtimeId) ||
        !code.includes("Icon")
      )
        return
      const program = this.parse(code)
      // Vue can split script-setup and render functions into separate modules.
      // Inspect its own compiled script to retain binding-aware collection.
      if (config.command === "build" && id.endsWith(".vue")) {
        const scripts = program.body.flatMap((statement) => {
          if (statement.type !== "ImportDeclaration") return []
          const script = statement.source.value
          return typeof script === "string" &&
            script.startsWith(id + "?vue&type=script")
            ? [script]
            : []
        })
        const compiled = await Promise.all(
          scripts.map(async (script) => {
            const loaded = await this.load({ id: script })
            return loaded.code ? this.parse(loaded.code).body : []
          })
        )
        program.body.unshift(...compiled.flat())
      }
      const names = collectStaticNames(
        program,
        options.importSources,
        /\.vue(?:$|\?)/.test(id)
      )
      if (!names.length) return
      await Promise.all(names.map(getRecord))
      return {
        code:
          code +
          "\n" +
          names
            .map((name) => `import ${JSON.stringify(iconId + name)};`)
            .join("\n"),
        map: null,
      }
    },
    transformIndexHtml: {
      order: "pre",
      async handler(html) {
        if (!/<(?:icones-icon|i)[\s>]/i.test(html)) return
        const names = collectHtmlNames(html, htmlPrefixes)
        if (!names.length) return
        await Promise.all(names.map(getRecord))
        return [
          {
            tag: "script",
            attrs: { type: "module" },
            children: names
              .map((name) => `import ${JSON.stringify(iconId + name)};`)
              .join("\n"),
            injectTo: "head-prepend",
          },
        ]
      },
    },
    async load(id) {
      if (id === "\0" + runtimeId) {
        return [
          `export const mode = ${JSON.stringify(mode)}`,
          `export { iconLoader, registerStatic, resolve } from ${JSON.stringify(coreRuntimeId)}`,
        ].join("\n")
      }
      if (!id.startsWith("\0" + iconId)) return
      const name = id.slice(iconId.length + 1)
      const resolvedRecord = await getRecord(name)
      const { record, repository: owner } = resolvedRecord
      this.addWatchFile(path.join(owner.root, record.file))
      if (owner.manifests.has(record.prefix))
        this.addWatchFile(path.join(owner.root, record.prefix, "manifest.json"))
      const emit =
        config.command === "build" && this.environment.config.build.emitAssets
      const data = await owner.read(record)
      if (owner !== repository) collected.set(dataAsset(record), resolvedRecord)
      if (emit && options.emitData !== false)
        this.emitFile({
          type: "asset",
          fileName: `${assetsDir}/${dataAsset(record)}`,
          source: JSON.stringify(data, null, 2) + "\n",
        })
      let resolved: { data?: ElementData; href?: string; viewBox?: string } = {
        data,
      }
      if (mode === "symbol") {
        const svg = iconToSVG(
          withIconViewBox(elementDataToIcon(data), record.name)
        )
        const symbolId = "iconify-" + Buffer.from(name).toString("hex")
        const body = replaceSvgIds(
          configurableStrokeBody(svg.body),
          symbolId + "-"
        )
        const source = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><symbol id="${symbolId}" viewBox="${svg.attributes.viewBox}">${body}</symbol></defs></svg>`
        const hash = createHash("sha256")
          .update(source)
          .digest("hex")
          .slice(0, 10)
        const fileName = `${assetsDir}/${symbolAsset(record).slice(0, -5)}-${hash}.svg`
        assets.set(fileName, { fileName, source })
        if (emit) this.emitFile({ type: "asset", fileName, source })
        resolved = {
          href: joinBase(config.base, fileName) + "#" + symbolId,
          viewBox: svg.attributes.viewBox,
        }
      }
      return {
        code: `import { registerStatic } from ${JSON.stringify(runtimeId)};\nregisterStatic(${JSON.stringify(name)}, ${JSON.stringify(resolved)});`,
        moduleSideEffects: "no-treeshake",
      }
    },
    generateBundle(_options, bundle) {
      // SSR frameworks move assets to the client output using Vite's manifest.
      // These URLs are generated rather than imported, so link their metadata.
      const chunks = Object.values(bundle).filter(
        (output) => output.type === "chunk"
      )
      const entry = chunks.find((chunk) => chunk.isEntry) ?? chunks[0]
      if (!entry?.viteMetadata) return
      for (const output of Object.values(bundle)) {
        if (
          output.type === "asset" &&
          output.fileName.startsWith(assetsDir + "/")
        )
          entry.viteMetadata.importedAssets.add(output.fileName)
      }
    },
    configureServer(server) {
      // closeBundle runs after Vite waits for pending transforms. Cancel before
      // that wait, including middleware mode where there is no HTTP close event.
      const close = server.close.bind(server)
      server.close = () => {
        extraction.cancel()
        return close()
      }
      server.watcher.add(dataDir)
      installMiddleware(server)
    },
    configurePreviewServer(server) {
      installMiddleware(server, true)
    },
    async handleHotUpdate(context) {
      const relative = path.relative(dataDir, context.file)
      const bundledRelative = bundledRepository
        ? path.relative(bundledRepository.root, context.file)
        : undefined
      if (
        !context.file.endsWith(".json") ||
        (relative.startsWith("..") &&
          (bundledRelative === undefined || bundledRelative.startsWith("..")))
      )
        return
      // Initial extraction is already part of the module being loaded. Its
      // watcher event must not erase that module's freshly registered icon.
      const generated = generatedFiles.get(context.file)
      if (generated !== undefined && (await context.read()) === generated)
        return []
      generatedFiles.delete(context.file)
      assets.clear()
      collected.clear()
      await repository.refresh()
      await bundledRepository?.refresh()
      for (const module of context.server.moduleGraph.idToModuleMap.values()) {
        if (module.id?.startsWith("\0" + runtimeId))
          context.server.moduleGraph.invalidateModule(module)
      }
      context.server.ws.send({ type: "full-reload" })
      return []
    },
  }
  return [resolver, plugin]
}

/** @deprecated Use icones instead. */
export const iconify = icones
/** @deprecated Use icones instead. */
export const icons = icones

function slugify(value: string) {
  return toAsciiSlug(value) || "general"
}
function joinBase(base: string, file: string) {
  return (base.endsWith("/") ? base : base + "/") + file
}
