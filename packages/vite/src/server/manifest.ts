import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import {
  readIconManifest,
  createIconManifest,
  addManifestEntry,
  serializeManifest,
  type IconManifest,
  type ManifestEntry,
} from "@icones/core/manifest"

// Serialize read/modify/write within a process (parallel Vite extraction/downloads).
const updates = new Map<string, Promise<void>>()
export function updateIconManifest(
  root: string,
  entry: ManifestEntry,
  options: {
    create?: (prefix: string) => IconManifest
    variantOrder?: readonly string[]
  } = {}
) {
  const file = path.resolve(root, entry.prefix, "manifest.json")
  // Serialize per-prefix writes so concurrent workers don't corrupt the file.
  const pending = (updates.get(file) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      let manifest: IconManifest
      try {
        manifest = readIconManifest(
          JSON.parse(await readFile(file, "utf8")),
          entry.prefix
        )
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        manifest = (options.create ?? createIconManifest)(entry.prefix)
      }
      addManifestEntry(manifest, entry)
      await mkdir(path.dirname(file), { recursive: true })
      const temporary = file + "." + randomUUID() + ".tmp"
      await writeFile(
        temporary,
        serializeManifest(manifest, options.variantOrder)
      )
      await rename(temporary, file)
    })
  updates.set(file, pending)
  void pending
    .finally(() => {
      if (updates.get(file) === pending) updates.delete(file)
    })
    .catch(() => {})
  return pending
}
