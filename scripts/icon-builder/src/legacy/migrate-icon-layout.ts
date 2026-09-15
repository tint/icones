import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import {
  collectionEntry,
  createCollectionManifest as createIconManifest,
  serializeCollectionManifest as serializeManifest,
} from "@icones/vite/tooling/collections"
import { type IconSource } from "@icones/core/manifest"

import { iconsDirectory as defaultIconsDirectory } from "../paths.ts"

/** Offline migration; old generations remain in a recoverable sibling directory. */
export async function migrateIconLayout(root: string, apply = false) {
  root = path.resolve(root)
  const sources: Record<string, IconSource> = JSON.parse(
    await readFile(path.join(root, "sources.json"), "utf8")
  )
  const files = (await readdir(path.join(root, "data"), { recursive: true }))
    .filter((file) => file.endsWith(".json"))
    .sort()
  const manifests = new Map<string, ReturnType<typeof createIconManifest>>()
  const targets = new Set<string>()
  const jobs = files.map((file) => {
    const parts = file.split(path.sep)
    if (parts.length !== 3) throw new Error("Unexpected source path: " + file)
    const [source, category, filename] = parts as [string, string, string]
    const entry = collectionEntry(source, category, filename.slice(0, -5))
    const target = entry.prefix + "/" + entry.slug
    if (targets.has(target)) throw new Error("Filename collision: " + target)
    targets.add(target)
    let manifest = manifests.get(entry.prefix)
    if (!manifest) {
      manifest = createIconManifest(entry.prefix)
      manifests.set(entry.prefix, manifest)
    }
    manifest.sources ??= {}
    if (!sources[source]) throw new Error("Missing source metadata: " + source)
    manifest.sources[source] = sources[source]!
    const categories = (manifest.variants[entry.variant] ??= {})
    const group = (categories[entry.category] ??= { json: [], svg: [] })
    group.json.push(entry.slug + ".json")
    group.svg.push(entry.slug + ".svg")
    return { file, source, ...entry }
  })
  const expected = Object.values(sources).reduce(
    (total, source) => total + Number(source.icons),
    0
  )
  const symbols = (
    await readdir(path.join(root, "symbols"), { recursive: true })
  ).filter((file) => file.endsWith(".svg"))
  if (jobs.length !== expected || symbols.length < expected)
    throw new Error("Source counts do not match inventory.")
  const pairedSymbols = new Set(
    files.map((file) => file.replace(/\.json$/, ".svg"))
  )
  const unpaired = symbols.filter((file) => !pairedSymbols.has(file))
  if (unpaired.length)
    console.log(
      "Unindexed SVGs retained in the original-directory backup:",
      unpaired
    )
  for (const [prefix, manifest] of manifests) {
    serializeManifest(manifest)
    try {
      await stat(path.join(root, prefix))
      throw new Error("Destination already exists: " + prefix)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  console.log(
    "Validated " +
      jobs.length +
      " icons, " +
      manifests.size +
      " collections, no filename collisions."
  )
  if (!apply) return
  const stage = await mkdtemp(path.join(path.dirname(root), ".icones-layout-"))
  const backup = path.join(stage, "previous")
  await mkdir(backup)
  const hash = (buffer: Buffer) =>
    createHash("sha256").update(buffer).digest("hex")
  for (const [prefix, manifest] of manifests) {
    const directory = path.join(stage, prefix)
    await mkdir(path.join(directory, "data"), { recursive: true })
    await mkdir(path.join(directory, "symbols"))
    await writeFile(
      path.join(directory, "manifest.json"),
      serializeManifest(manifest)
    )
    const licenses = await Promise.all(
      Object.keys(manifest.sources!)
        .sort()
        .map(async (source) => {
          const license = await readFile(
            path.join(root, "licenses", source + ".txt"),
            "utf8"
          )
          return Object.keys(manifest.sources!).length === 1
            ? license
            : "===== " + source + " =====\n\n" + license
        })
    )
    await writeFile(path.join(directory, "license.txt"), licenses.join("\n\n"))
  }
  // Bounded IO; verify both formats byte-for-byte before publishing anything.
  for (let offset = 0; offset < jobs.length; offset += 32) {
    await Promise.all(
      jobs.slice(offset, offset + 32).map(async (job) => {
        for (const kind of ["data", "symbols"] as const) {
          const extension = kind === "data" ? ".json" : ".svg"
          const original = path.join(
            root,
            kind,
            job.file.replace(/\.json$/, extension)
          )
          const target = path.join(
            stage,
            job.prefix,
            kind,
            job.slug + extension
          )
          await copyFile(original, target)
          const [before, after] = await Promise.all([
            readFile(original),
            readFile(target),
          ])
          if (hash(before) !== hash(after))
            throw new Error("Copy verification failed: " + target)
        }
      })
    )
    if (offset % 4096 === 0)
      console.log(
        "Verified " + Math.min(offset + 32, jobs.length) + "/" + jobs.length
      )
  }
  const installed: string[] = []
  const saved: string[] = []
  try {
    for (const prefix of manifests.keys()) {
      await rename(path.join(stage, prefix), path.join(root, prefix))
      installed.push(prefix)
    }
    for (const name of ["data", "symbols", "licenses", "sources.json"]) {
      await rename(path.join(root, name), path.join(backup, name))
      saved.push(name)
    }
  } catch (error) {
    for (const name of saved.reverse())
      await rename(path.join(backup, name), path.join(root, name))
    for (const prefix of installed.reverse())
      await rename(path.join(root, prefix), path.join(stage, prefix))
    throw error
  }
  console.log(
    "Migrated " +
      jobs.length +
      " JSON/SVG pairs. Recoverable originals: " +
      backup
  )
  return backup
}

if (import.meta.main)
  await migrateIconLayout(
    defaultIconsDirectory,
    process.argv.includes("--apply")
  )
