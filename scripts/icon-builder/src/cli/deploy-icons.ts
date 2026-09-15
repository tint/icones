import { spawn } from "node:child_process"
import { parseArgs } from "node:util"
import { buildCollections } from "../build/collections.ts"

const { values } = parseArgs({
  options: {
    set: { type: "string", multiple: true },
    all: { type: "boolean" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
})
if (values.help)
  console.log(
    "bun run deploy:icons (--set tabler | --all) [--dry-run]\nRebuild and deploy explicitly selected collections. --dry-run only checks locally."
  )
else {
  if (!!values.all === !!values.set?.length)
    throw new Error("Choose --set <prefix> (repeatable) OR --all explicitly.")
  const results = await buildCollections({ sets: values.set })
  for (const result of results) {
    console.log(
      `${values["dry-run"] ? "Checking" : "Deploying"} ${result.domain}`
    )
    const args = ["wrangler@4", "deploy", "--config", result.configFile]
    if (values["dry-run"]) args.push("--dry-run")
    const status = await new Promise<number>((resolve, reject) => {
      const child = spawn("bunx", args, {
        cwd: result.directory,
        stdio: "inherit",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      })
      child.once("error", reject)
      child.once("exit", (code) => resolve(code ?? 1))
    })
    if (status !== 0)
      throw new Error(
        `Wrangler failed for ${result.prefix} (exit ${status}); remaining deployments stopped.`
      )
  }
}
