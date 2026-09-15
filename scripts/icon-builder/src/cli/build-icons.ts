import { parseArgs } from "node:util"
import { buildCollections } from "../build/collections.ts"
import { deployment } from "../build/deployment.ts"

const { values } = parseArgs({
  options: {
    set: { type: "string", multiple: true },
    help: { type: "boolean", short: "h" },
  },
})
if (values.help)
  console.log(
    "bun run build:icons [--set tabler] [--set flag]\nPrepare static collection deployments locally; never uploads."
  )
else {
  if (!values.set)
    for (const [prefix, notice] of Object.entries(
      deployment.excludedCollections
    ))
      console.warn(`Skipping ${prefix}: ${notice}`)
  await buildCollections({ sets: values.set })
}
