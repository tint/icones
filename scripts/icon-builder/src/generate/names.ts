import { readFile, readdir, unlink } from "node:fs/promises"
import path from "node:path"
import { readIconManifest, manifestEntries } from "@icones/core/manifest"
import { writeGeneratedFile } from "../shared/files.ts"

import {
  iconsDirectory as defaultIconsDirectory,
  namesTypesDirectory,
} from "../paths.ts"
const generatedMarker =
  "// Generated from collection manifests. Do not edit by hand.\n"
const generatedHeader = generatedMarker + "// Run: bun run generate:names\n"
/** Read manifests only. No component runtime, network requests or artwork rewrites. */
export async function readIconNames(directory: string) {
  const sets = new Map<string, string[]>()
  const directories = await readdir(directory, { withFileTypes: true })
  for (const entry of directories.sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    const file = path.join(directory, entry.name, "manifest.json")
    let manifest: unknown
    try {
      manifest = JSON.parse(await readFile(file, "utf8"))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue
      throw error
    }
    const validated = readIconManifest(manifest, entry.name)
    const names = new Set(
      manifestEntries(validated).map(({ prefix, slug }) => `${prefix}:${slug}`)
    )
    if (!names.size) throw new Error(`Empty icon manifest: ${file}`)
    sets.set(entry.name, [...names].sort())
  }
  if (!sets.size)
    throw new Error(`No collection manifests found in ${directory}`)
  return sets
}

export async function generateNames(
  directory = defaultIconsDirectory,
  { check = false }: { check?: boolean } = {}
) {
  const sets = await readIconNames(directory)
  const icons = [...sets.values()].reduce(
    (total, names) => total + names.length,
    0
  )
  const outputs = new Map<string, string>()
  const lines = [
    generatedHeader.trimEnd(),
    `// ${sets.size} collections, ${icons} canonical icon names.`,
    "",
    "export interface IconNamesBySet {",
  ]
  for (const [set, names] of sets) {
    if (set === "index")
      throw new Error(
        'Collection name "index" is reserved for the type entry point.'
      )
    outputs.set(
      `${set}.d.ts`,
      [
        generatedHeader.trimEnd(),
        `// ${set}: ${names.length} canonical icon names.`,
        "",
        "export type IconName =",
        ...names.map((name) => `  | ${JSON.stringify(name)}`),
        "",
      ].join("\n")
    )
    lines.push(`  ${JSON.stringify(set)}: import("./${set}.js").IconName`)
  }
  lines.push(
    "}",
    "",
    "export type IconSetName = keyof IconNamesBySet",
    "export type IconName<Set extends IconSetName = IconSetName> = IconNamesBySet[Set]",
    ""
  )
  outputs.set("index.d.ts", lines.join("\n"))
  const workspace =
    path.resolve(directory) === path.resolve(defaultIconsDirectory)
  // Workspace names live only in @icones/names; never create icons/types.
  // Custom fixture/export directories retain their local types output.
  const change = await planTypeChanges(
    workspace ? namesTypesDirectory : path.join(directory, "types"),
    outputs
  )
  const { changed } = change
  if (changed && check)
    throw new Error(
      "Icon name types are out of date. Run bun run generate:names."
    )
  if (!check) await change.write()
  return { sets: sets.size, icons, changed }
}

async function planTypeChanges(
  typesDirectory: string,
  outputs: Map<string, string>
) {
  const previous = new Map<string, string>()
  const entries = await readdir(typesDirectory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
      return []
    }
  )
  for (const entry of entries) {
    if (outputs.has(entry.name) && !entry.isFile())
      throw new Error(`Expected a regular generated type file: ${entry.name}`)
    if (!entry.isFile() || !entry.name.endsWith(".d.ts")) continue
    previous.set(
      entry.name,
      await readFile(path.join(typesDirectory, entry.name), "utf8")
    )
  }
  const outdated = [...outputs].filter(
    ([file, content]) => previous.get(file) !== content
  )
  const stale = [...previous].filter(
    ([file, content]) =>
      !outputs.has(file) && content.startsWith(generatedMarker)
  )
  const changed = outdated.length > 0 || stale.length > 0
  // Validate all manifests and output ownership before changing any files.
  for (const [file] of outdated) {
    const content = previous.get(file)
    if (content !== undefined && !content.startsWith(generatedMarker))
      throw new Error(`Refusing to overwrite non-generated type file: ${file}`)
  }
  return {
    changed,
    async write() {
      for (const [file, content] of outdated)
        await writeGeneratedFile(path.join(typesDirectory, file), content, true)
      for (const [file] of stale) await unlink(path.join(typesDirectory, file))
    },
  }
}
