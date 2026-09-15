import path from "node:path"
import { parseArgs } from "node:util"
import { generateNames } from "../generate/names.ts"

const { values } = parseArgs({
  options: {
    dir: { type: "string" },
    check: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
})
if (values.help)
  console.log("bun run generate:names [--check] [--dir <collection-root>]")
else {
  const result = await generateNames(values.dir && path.resolve(values.dir), {
    check: values.check,
  })
  console.log(
    `${result.icons} icon names in ${result.sets} sets; types ${values.check ? "verified" : result.changed ? "generated" : "unchanged"}.`
  )
}
