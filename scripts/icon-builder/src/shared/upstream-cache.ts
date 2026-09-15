import { createWriteStream } from "node:fs"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { setTimeout as sleep } from "node:timers/promises"
import { officialSources, type ArchiveSource } from "../import/sources.ts"

const execute = promisify(execFile)
class HttpError extends Error {
  readonly status: number
  constructor(status: number, url: string) {
    super(`${status}: ${url}`)
    this.status = status
  }
}
export async function request(url: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(120_000),
        headers: { "User-Agent": "icones-downloader/1.0" },
      })
      if (response.ok) return response
      await response.body?.cancel()
      throw new HttpError(response.status, url)
    } catch (error) {
      if (
        attempt >= 3 ||
        (error instanceof HttpError &&
          error.status !== 429 &&
          error.status < 500)
      )
        throw error
    }
    await sleep(300 * 2 ** attempt)
  }
}

export async function cachedText(url: string, file: string) {
  try {
    return await readFile(file, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  const text = await (await request(url)).text()
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = file + ".download"
  await writeFile(temporary, text)
  await rename(temporary, file)
  return text
}

export async function prepareArchive(
  source: ArchiveSource,
  cacheDir: string,
  log = console.log
) {
  const config = officialSources[source]
  const folder = path.resolve(cacheDir, `${source}-${config.revision}`)
  const destination = path.join(folder, "extracted")
  try {
    if (
      (await readFile(path.join(folder, "complete"), "utf8")) ===
      config.revision
    )
      return destination
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  await mkdir(folder, { recursive: true })
  const archive = path.join(folder, "source.archive")
  const url =
    "archivePath" in config
      ? `https://raw.githubusercontent.com/${config.repo}/${config.revision}/${config.archivePath}`
      : `https://codeload.github.com/${config.repo}/tar.gz/${config.revision}`
  log(`Downloading ${source}: ${url}`)
  const response = await request(url)
  if (!response.body) throw new Error(`Empty archive: ${url}`)
  const temporary = archive + ".download"
  await pipeline(
    Readable.fromWeb(
      response.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>
    ),
    createWriteStream(temporary)
  )
  await rename(temporary, archive)
  const { stdout } = await execute("tar", ["-tf", archive], {
    maxBuffer: 32 * 1024 * 1024,
  })
  const entries = stdout.trim().split("\n")
  if (
    !entries.length ||
    entries.some(
      (entry) =>
        path.isAbsolute(entry) ||
        entry.includes("\\") ||
        entry.split("/").includes("..")
    )
  )
    throw new Error(`Unsafe archive entries: ${source}`)
  // Extract pinned upstream archives into an isolated cache; never execute their code.
  const stage = path.join(folder, "extracting")
  await mkdir(stage, { recursive: true })
  await execute(
    "tar",
    [
      "-xf",
      archive,
      "-C",
      stage,
      ...("archivePath" in config ? [] : ["--strip-components", "1"]),
      "--no-same-owner",
      "--no-same-permissions",
    ],
    { maxBuffer: 8 * 1024 * 1024 }
  )
  await rename(stage, destination)
  await writeFile(path.join(folder, "complete"), config.revision)
  await rm(archive)
  return destination
}
