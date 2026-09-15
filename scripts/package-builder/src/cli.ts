import { parseArgs } from "node:util"
import { buildRelease, publishRelease } from "./build.ts"

const { values } = parseArgs({
  options: {
    version: { type: "string" },
    out: { type: "string" },
    pack: { type: "boolean", default: false },
    publish: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    all: { type: "boolean", default: false },
    tag: { type: "string" },
    registry: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
})

if (values.help) {
  console.log(`bun run build:release [--version <semver>] [--out <directory>]
bun run pack:packages [--version <semver>] [--out <directory>]
bun run publish:packages (--dry-run | --all) [--version <semver>] [--tag <tag>] [--registry <url>]

Build final npm package directories, optionally create tarballs, or publish every
package in dependency order. Versions default to each source package manifest;
--version overrides every public package. Publishing is never implicit.`)
} else {
  if (values.publish && values["dry-run"] === values.all)
    throw new Error("Publishing requires exactly one of --dry-run or --all.")
  if (!values.publish && (values["dry-run"] || values.all))
    throw new Error("--dry-run and --all are only valid for publish:packages.")
  const release = await buildRelease({
    version: values.version,
    output: values.out,
    pack: values.pack,
  })
  console.log(
    `${values.pack ? "Packed" : "Built"} ${release.packages.length} packages in ${release.output}`
  )
  for (const pkg of release.packages)
    console.log(
      `- ${pkg.manifest.name}@${pkg.manifest.version}${pkg.archive ? `: ${pkg.archive}` : ""}`
    )
  if (values.publish)
    await publishRelease(release, {
      dryRun: values["dry-run"],
      tag: values.tag,
      registry: values.registry,
    })
}
