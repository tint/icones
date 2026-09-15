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
import { fileURLToPath } from "node:url"

type JsonObject = Record<string, unknown>

const owner = "@icones/package-builder/release-v1"

export const packageOrder = [
  "names",
  "icons",
  "core",
  "react",
  "vue",
  "svelte",
  "solidjs",
  "vanilla",
  "astro",
  "vite",
  "mcp-server",
] as const

const releaseFiles: Record<(typeof packageOrder)[number], readonly string[]> = {
  names: ["README.md", "index.js", "types"],
  icons: ["README.md"],
  core: ["README.md", "RUNTIME.md", "UTILITIES.md", "dist"],
  react: ["README.md", "dist"],
  vue: ["README.md", "dist"],
  svelte: ["README.md", "dist"],
  solidjs: ["README.md", "dist"],
  vanilla: ["README.md", "dist"],
  astro: ["README.md", "dist"],
  vite: ["README.md", "SERVER.md", "TOOLING.md", "client.d.ts", "dist"],
  "mcp-server": ["README.md", "dist"],
}

export type ReleasePackage = {
  directory: string
  manifest: JsonObject & { name: string; version: string }
  archive?: string
}

export type ReleaseBuild = {
  output: string
  packages: ReleasePackage[]
}

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** Published exports must resolve only files produced by the package build. */
function finalExport(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(finalExport)
  if (!isObject(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([condition]) => condition !== "development" && condition !== "bun"
      )
      .map(([condition, target]) => [condition, finalExport(target)])
  )
}

function releaseRange(range: string, version: string) {
  if (range === "workspace:*" || range === "workspace:") return version
  if (range === "workspace:^") return `^${version}`
  if (range === "workspace:~") return `~${version}`
  if (range.startsWith("workspace:")) return range.slice("workspace:".length)
  return range
}

function releaseDependencies(
  value: unknown,
  versions: ReadonlyMap<string, string>
) {
  if (!isObject(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([name, range]) => {
      if (typeof range !== "string" || !range.startsWith("workspace:"))
        return [name, range]
      const version = versions.get(name)
      if (!version) throw new Error(`Unknown workspace dependency: ${name}`)
      return [name, releaseRange(range, version)]
    })
  )
}

export function createReleaseManifest(
  source: JsonObject,
  version: string,
  versions: ReadonlyMap<string, string>
) {
  const manifest = structuredClone(source)
  manifest.version = version
  manifest.exports = finalExport(manifest.exports)
  if (Array.isArray(manifest.sideEffects))
    manifest.sideEffects = manifest.sideEffects.filter(
      (entry) => typeof entry !== "string" || !entry.startsWith("./src/")
    )
  for (const field of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ])
    if (manifest[field])
      manifest[field] = releaseDependencies(manifest[field], versions)
  delete manifest.private
  delete manifest.files
  delete manifest.scripts
  delete manifest.devDependencies
  manifest.publishConfig = {
    ...(isObject(manifest.publishConfig) ? manifest.publishConfig : {}),
    access: "public",
  }
  return manifest
}

function assertVersion(version: string) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version))
    throw new Error(`Expected a complete semver version, received: ${version}`)
}

async function exists(file: string) {
  return lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error
    return undefined
  })
}

async function collectionDirectories(source: string) {
  const directories: string[] = []
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (await exists(path.join(source, entry.name, "manifest.json")))
      directories.push(entry.name)
  }
  return directories.sort()
}

function exportTargets(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(exportTargets)
  if (!isObject(value)) return []
  return Object.values(value).flatMap(exportTargets)
}

async function validatePackage(directory: string, manifest: JsonObject) {
  const serialized = JSON.stringify(manifest)
  if (typeof manifest.license !== "string" || !manifest.license)
    throw new Error(`${manifest.name}: missing license metadata`)
  if (
    manifest.license === "MIT" &&
    !(await exists(path.join(directory, "LICENSE")))
  )
    throw new Error(`${manifest.name}: missing MIT license file`)
  const referencedLicense = /^SEE LICENSE IN (.+)$/.exec(manifest.license)?.[1]
  if (
    referencedLicense &&
    !(await exists(path.resolve(directory, referencedLicense)))
  )
    throw new Error(
      `${manifest.name}: missing referenced license file ${referencedLicense}`
    )
  if (serialized.includes("workspace:"))
    throw new Error(`${manifest.name}: workspace dependency remains in release`)
  if (
    /"(?:development|bun)":/.test(serialized) ||
    serialized.includes("./src/")
  )
    throw new Error(`${manifest.name}: source export remains in release`)
  for (const target of [
    ...exportTargets(manifest.exports),
    ...(typeof manifest.types === "string" ? [manifest.types] : []),
    ...(typeof manifest.bin === "string"
      ? [manifest.bin]
      : isObject(manifest.bin)
        ? Object.values(manifest.bin).filter(
            (value): value is string => typeof value === "string"
          )
        : []),
  ]) {
    if (!target.startsWith("./") || target.includes("*")) continue
    if (!(await exists(path.resolve(directory, target))))
      throw new Error(`${manifest.name}: missing release export ${target}`)
  }
}

function validateInternalDependencies(
  source: JsonObject,
  release: JsonObject,
  versions: ReadonlyMap<string, string>
) {
  for (const field of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const sourceDependencies = isObject(source[field]) ? source[field] : {}
    const releaseDependencies = isObject(release[field]) ? release[field] : {}
    for (const [name, range] of Object.entries(sourceDependencies)) {
      const targetVersion = versions.get(name)
      if (!targetVersion) continue
      if (typeof range !== "string")
        throw new Error(`${source.name}: invalid dependency range for ${name}`)
      const expected = releaseRange(range, targetVersion)
      if (releaseDependencies[name] !== expected)
        throw new Error(
          `${source.name}: expected ${name}@${expected}, received ${String(releaseDependencies[name])}`
        )
    }
  }
}

async function run(command: string[], cwd: string) {
  const process = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" })
  const [status, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  if (status !== 0)
    throw new Error(
      `${command.join(" ")} failed in ${cwd}:\n${stderr || stdout}`
    )
  return stdout.trim()
}

async function packPackages(directory: string, packages: ReleasePackage[]) {
  const destination = path.join(directory, "tarballs")
  await mkdir(destination)
  for (const pkg of packages) {
    const output = await run(
      [
        process.execPath,
        "pm",
        "pack",
        "--destination",
        destination,
        "--ignore-scripts",
        "--quiet",
      ],
      pkg.directory
    )
    const archive = output.split(/\r?\n/).filter(Boolean).at(-1)
    if (!archive || !(await exists(archive)))
      throw new Error(`${pkg.manifest.name}: package archive was not created`)
    pkg.archive = path.basename(archive)
  }
}

async function assertOwned(directory: string) {
  const marker = JSON.parse(
    await readFile(
      path.join(directory, ".icones-generated.json"),
      "utf8"
    ).catch(() => "null")
  )
  if (marker?.owner !== owner)
    throw new Error(
      `Refusing to replace unowned release directory: ${directory}`
    )
}

export async function buildRelease({
  root = fileURLToPath(new URL("../../../", import.meta.url)),
  output = path.join(root, "dist/packages"),
  version,
  pack = false,
}: {
  root?: string
  output?: string
  version?: string
  pack?: boolean
} = {}): Promise<ReleaseBuild> {
  const sourceRoot = path.resolve(root, "packages")
  const target = path.resolve(output)
  if (
    sourceRoot === target ||
    sourceRoot.startsWith(target + path.sep) ||
    target.startsWith(sourceRoot + path.sep)
  )
    throw new Error("Release output must not overlap source packages.")

  const sources = await Promise.all(
    packageOrder.map(async (name) => {
      const directory = path.join(sourceRoot, name)
      const manifest = JSON.parse(
        await readFile(path.join(directory, "package.json"), "utf8")
      ) as JsonObject & { name: string; version: string }
      const finalVersion = version ?? manifest.version
      assertVersion(finalVersion)
      return { name, directory, manifest, version: finalVersion }
    })
  )
  const versions = new Map(
    sources.map(({ manifest, version }) => [manifest.name, version])
  )

  const parent = path.dirname(target)
  await mkdir(parent, { recursive: true })
  if (await exists(target)) await assertOwned(target)
  const temporary = await mkdtemp(path.join(parent, ".packages-build-"))
  const candidate = path.join(temporary, "release")
  await mkdir(candidate)
  const packages: ReleasePackage[] = []
  try {
    for (const source of sources) {
      const directory = path.join(candidate, source.name)
      await mkdir(directory)
      const entries = [...releaseFiles[source.name]]
      if (source.name === "icons")
        entries.push(...(await collectionDirectories(source.directory)))
      for (const entry of entries)
        await cp(
          path.join(source.directory, entry),
          path.join(directory, entry),
          {
            recursive: true,
          }
        )
      if (source.manifest.license === "MIT")
        await cp(path.join(root, "LICENSE"), path.join(directory, "LICENSE"))
      const manifest = createReleaseManifest(
        source.manifest,
        source.version,
        versions
      ) as JsonObject & { name: string; version: string }
      await writeFile(
        path.join(directory, "package.json"),
        JSON.stringify(manifest, null, 2) + "\n"
      )
      await validatePackage(directory, manifest)
      validateInternalDependencies(source.manifest, manifest, versions)
      packages.push({ directory, manifest })
    }
    if (pack) await packPackages(candidate, packages)
    await writeFile(
      path.join(candidate, ".icones-generated.json"),
      JSON.stringify(
        {
          owner,
          packages: packages.map(({ manifest }) => ({
            name: manifest.name,
            version: manifest.version,
          })),
          packed: pack,
        },
        null,
        2
      ) + "\n"
    )
    const previous = path.join(temporary, "previous")
    const hadPrevious = !!(await exists(target))
    if (hadPrevious) await rename(target, previous)
    try {
      await rename(candidate, target)
    } catch (error) {
      if (hadPrevious) await rename(previous, target)
      throw error
    }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }

  for (const pkg of packages) {
    pkg.directory = path.join(target, path.basename(pkg.directory))
    if (pkg.archive) pkg.archive = path.join(target, "tarballs", pkg.archive)
  }
  return { output: target, packages }
}

export async function publishRelease(
  release: ReleaseBuild,
  {
    dryRun,
    tag,
    registry,
  }: { dryRun: boolean; tag?: string; registry?: string }
) {
  for (const pkg of release.packages) {
    if (!pkg.archive) throw new Error(`${pkg.manifest.name}: missing archive`)
    const command = [
      process.execPath,
      "publish",
      "--access",
      "public",
      "--ignore-scripts",
      "--quiet",
    ]
    if (dryRun) command.push("--dry-run")
    if (tag) command.push("--tag", tag)
    if (registry) command.push("--registry", registry)
    command.push(pkg.archive)
    console.log(
      `${dryRun ? "Checking" : "Publishing"} ${pkg.manifest.name}@${pkg.manifest.version}`
    )
    await run(command, release.output)
  }
}
