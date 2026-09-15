import { randomUUID } from "node:crypto"
import { link, mkdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

/** Publish a complete file atomically. Without replace, a concurrent writer wins. */
export async function writeGeneratedFile(
  file: string,
  content: string,
  replace: boolean
) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.download`
  try {
    await writeFile(temporary, content, { flag: "wx" })
    if (replace) await rename(temporary, file)
    else {
      try {
        await link(temporary, file)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
        return false
      }
    }
    return true
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    })
  }
}
