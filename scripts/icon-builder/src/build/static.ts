import { cp, mkdir, readdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { workspaceRoot } from "../paths.ts"
import { createIconRepository } from "@icones/vite/server"

/** Write the site catalog, optionally bundling artwork for same-origin offline previews. */
export async function buildStatic(
  root = workspaceRoot,
  clientDirectory = path.join(root, "dist/client"),
  {
    copyCollections = true,
    exclude = [],
  }: { copyCollections?: boolean; exclude?: readonly string[] } = {}
) {
  const source = path.join(root, "packages/icons")
  const output = path.resolve(clientDirectory, "icons")
  const repository = createIconRepository(source)
  await repository.ready()
  if (!repository.records.size) throw new Error("No icon collections found.")
  await mkdir(output, { recursive: true })
  for (const prefix of repository.manifests.keys()) {
    if (!copyCollections || exclude.includes(prefix)) continue
    const target = path.join(output, prefix)
    await mkdir(target, { recursive: true })
    // Copy original files, including upstream notices, without transforming artwork.
    for (const entry of ["data", "symbols", "manifest.json", "license.txt"]) {
      try {
        await cp(path.join(source, prefix, entry), path.join(target, entry), {
          recursive: true,
        })
        if (entry === "data" || entry === "symbols") {
          // A standalone rebuild must not keep assets removed from the source package.
          // Only prune generated flat JSON/SVG files, never gallery pages or other files.
          const expected = new Set(
            await readdir(path.join(source, prefix, entry))
          )
          const extension = entry === "data" ? ".json" : ".svg"
          for (const file of await readdir(path.join(target, entry), {
            withFileTypes: true,
          })) {
            if (
              file.isFile() &&
              file.name.endsWith(extension) &&
              !expected.has(file.name)
            )
              await unlink(path.join(target, entry, file.name))
          }
        }
      } catch (error) {
        if (
          entry !== "license.txt" ||
          (error as NodeJS.ErrnoException).code !== "ENOENT"
        )
          throw error
      }
    }
  }
  const catalog = [...repository.records.values()]
    .filter(({ prefix }) => !exclude.includes(prefix))
    .map(({ name, prefix, category, variant, variantAlias }) => ({
      name,
      prefix,
      category,
      variant,
      ...(variantAlias ? { variantAlias } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  await writeFile(path.join(output, "catalog.json"), JSON.stringify(catalog))
  console.log(
    `Static site: ${catalog.length} catalog entries${copyCollections ? " with original data/symbols" : " (original data/symbols hosted separately)"} in ${output}/.`
  )
  return { icons: catalog.length }
}

if (import.meta.main) await buildStatic()
