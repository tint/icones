import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { createIconRepository } from "@icones/vite/server"
import { workspaceRoot } from "../paths.ts"
import { createCollectionPage } from "./collection-page.ts"
import {
  collectionConfig,
  collectionHeaders,
  deployment,
  selectCollections,
} from "./deployment.ts"

const marker = ".icones-generated.json"
// Manually assigned directory/ownership format version, not an artwork or package
// release. Bump only for incompatible layout/cleanup changes, with explicit migration.
const owner = "@icones/icon-builder/collection-v1"

export type CollectionReport = {
  prefix: string
  domain: string
  icons: number
  files: number
  bytes: number
  largestFile: { path: string; bytes: number }
  /** Relative to build-report.json, so the entire deployment folder can be moved. */
  configFile: "./wrangler.jsonc"
}

export type CollectionBuild = CollectionReport & {
  /** Internal execution location; never serialized into build-report.json. */
  directory: string
}

/** Reject oversize artifacts before replacing output or invoking Wrangler. */
export function checkAssetLimits(
  files: readonly { path: string; bytes: number }[],
  limits = {
    maxFiles: deployment.maxFiles,
    maxFileBytes: deployment.maxFileBytes,
  }
) {
  if (
    !Number.isSafeInteger(limits.maxFiles) ||
    limits.maxFiles < 1 ||
    !Number.isSafeInteger(limits.maxFileBytes) ||
    limits.maxFileBytes < 1
  )
    throw new Error("Asset limits must be positive integers.")
  if (files.length > limits.maxFiles)
    throw new Error(
      `Asset count ${files.length} exceeds limit ${limits.maxFiles}.`
    )
  for (const file of files)
    if (file.bytes > limits.maxFileBytes)
      throw new Error(
        `Asset ${file.path} (${file.bytes} bytes) exceeds limit ${limits.maxFileBytes}.`
      )
}

async function exists(file: string) {
  return lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error
    return undefined
  })
}

async function assertOwned(directory: string, prefix: string) {
  if (!(await lstat(directory)).isDirectory())
    throw new Error(`Refusing to replace non-directory: ${directory}`)
  const content = JSON.parse(
    await readFile(path.join(directory, marker), "utf8").catch(() => "null")
  )
  if (content?.owner !== owner || content?.prefix !== prefix)
    throw new Error(`Refusing to replace unowned output: ${directory}`)
}

/** Each set gets a complete, validated snapshot; unlisted artwork is not published. */
export async function buildCollections({
  root = workspaceRoot,
  outputDirectory = path.join(root, "dist/icons"),
  sets,
}: { root?: string; outputDirectory?: string; sets?: readonly string[] } = {}) {
  const source = path.resolve(root, "packages/icons")
  const output = path.resolve(outputDirectory)
  if (
    source === output ||
    source.startsWith(output + path.sep) ||
    output.startsWith(source + path.sep)
  )
    throw new Error("Deployment output must not overlap packages/icons.")
  const repository = createIconRepository(source)
  await repository.ready()
  const selected = selectCollections([...repository.manifests.keys()], sets)
  const plans: {
    prefix: string
    files: { path: string; bytes: number }[]
    icons: number
    index: string
  }[] = []
  for (const prefix of selected) {
    for (const directory of [prefix, `${prefix}/data`, `${prefix}/symbols`])
      if (!(await lstat(path.join(source, directory))).isDirectory())
        throw new Error(`Expected a real collection directory: ${directory}`)
    const records = [...repository.records.values()].filter(
      (record) => record.prefix === prefix
    )
    if (!records.length) throw new Error(`Empty collection: ${prefix}`)
    const sample = records
      .map((record) => record.name.slice(prefix.length + 1))
      .sort()[0]!
    const index = createCollectionPage(
      repository.manifests.get(prefix)!,
      records.length,
      sample
    )
    const paths = records
      .flatMap((record) => {
        const slug = record.name.slice(prefix.length + 1)
        return [`data/${slug}.json`, `symbols/${slug}.svg`]
      })
      .concat("manifest.json", "license.txt")
    const files: { path: string; bytes: number }[] = []
    for (let offset = 0; offset < paths.length; offset += 64)
      files.push(
        ...(await Promise.all(
          paths.slice(offset, offset + 64).map(async (file) => {
            const info = await lstat(path.join(source, prefix, file))
            if (!info.isFile())
              throw new Error(`Expected a regular asset: ${prefix}/${file}`)
            return { path: file, bytes: info.size }
          })
        ))
      )
    files.push(
      {
        path: "_headers",
        bytes: Buffer.byteLength(collectionHeaders),
      },
      {
        path: "index.html",
        bytes: Buffer.byteLength(index),
      }
    )
    checkAssetLimits(files)
    plans.push({ prefix, files, icons: records.length, index })
  }
  // Validate ownership for every replacement before writing any final output.
  const existingOutput = await exists(output)
  if (existingOutput && !existingOutput.isDirectory())
    throw new Error(`Expected a real deployment directory: ${output}`)
  await mkdir(output, { recursive: true })
  for (const prefix of selected)
    if (await exists(path.join(output, prefix)))
      await assertOwned(path.join(output, prefix), prefix)
  const stale: string[] = []
  if (!sets)
    for (const entry of await readdir(output, { withFileTypes: true })) {
      if (!entry.isDirectory() || selected.includes(entry.name)) continue
      const directory = path.join(output, entry.name)
      if (await exists(path.join(directory, marker))) {
        await assertOwned(directory, entry.name)
        stale.push(entry.name)
      }
    }

  const temporary = await mkdtemp(path.join(output, ".build-"))
  const results: CollectionBuild[] = []
  let preserveRecovery = false
  try {
    for (const plan of plans) {
      const directory = path.join(temporary, plan.prefix)
      const publicDirectory = path.join(directory, "public")
      for (const part of ["data", "symbols"])
        await mkdir(path.join(publicDirectory, part), { recursive: true })
      const artwork = plan.files.filter(
        (file) => !["_headers", "index.html"].includes(file.path)
      )
      for (let offset = 0; offset < artwork.length; offset += 64)
        await Promise.all(
          artwork
            .slice(offset, offset + 64)
            .map((file) =>
              cp(
                path.join(source, plan.prefix, file.path),
                path.join(publicDirectory, file.path)
              )
            )
        )
      const config = collectionConfig(plan.prefix)
      const report: CollectionReport = {
        prefix: plan.prefix,
        domain: config.routes[0]!.pattern,
        icons: plan.icons,
        files: plan.files.length,
        bytes: plan.files.reduce((sum, file) => sum + file.bytes, 0),
        largestFile: plan.files.reduce((largest, file) =>
          file.bytes > largest.bytes ? file : largest
        ),
        configFile: "./wrangler.jsonc",
      }
      await writeFile(path.join(publicDirectory, "_headers"), collectionHeaders)
      await writeFile(path.join(publicDirectory, "index.html"), plan.index)
      await writeFile(
        path.join(directory, "wrangler.jsonc"),
        JSON.stringify(config, null, 2) + "\n"
      )
      await writeFile(
        path.join(directory, marker),
        JSON.stringify({ owner, prefix: plan.prefix }) + "\n"
      )
      await writeFile(
        path.join(directory, "build-report.json"),
        JSON.stringify(report, null, 2) + "\n"
      )
      results.push({ ...report, directory: path.join(output, plan.prefix) })
    }
    for (const prefix of selected) {
      const target = path.join(output, prefix)
      const previous = path.join(temporary, `previous-${prefix}`)
      const hadPrevious = !!(await exists(target))
      if (hadPrevious) await rename(target, previous)
      try {
        await rename(path.join(temporary, prefix), target)
      } catch (error) {
        if (hadPrevious)
          try {
            await rename(previous, target)
          } catch (recoveryError) {
            preserveRecovery = true
            throw new AggregateError(
              [error, recoveryError],
              `Previous snapshot preserved at ${previous}; restore it before retrying.`,
              { cause: recoveryError }
            )
          }
        throw error
      }
    }
    // Only obsolete, builder-owned snapshots are removed; source packages are untouched.
    for (const prefix of stale) {
      await rename(
        path.join(output, prefix),
        path.join(temporary, `stale-${prefix}`)
      )
      console.log(`Removed obsolete generated deployment: ${prefix}`)
    }
  } finally {
    if (!preserveRecovery) await rm(temporary, { recursive: true, force: true })
  }
  for (const result of results)
    console.log(
      `${result.prefix}: ${result.icons} icons, ${result.files} files, ${(result.bytes / 1048576).toFixed(2)} MiB → https://${result.domain}`
    )
  return results
}
