import path from "node:path"
import { fileURLToPath } from "node:url"

/** Resolve workspace outputs from this module, independently of the CLI working directory. */
export const workspaceRoot = fileURLToPath(
  new URL("../../../", import.meta.url)
)
export const iconsDirectory = path.join(workspaceRoot, "packages/icons")
export const namesTypesDirectory = path.join(
  workspaceRoot,
  "packages/names/types"
)
