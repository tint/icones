import type { Config } from "@react-router/dev/config"
import path from "node:path"
import { buildStatic } from "../scripts/icon-builder/src/build/static.ts"
import { buildCollections } from "../scripts/icon-builder/src/build/collections.ts"
import {
  deployment,
  iconDeploymentMode,
} from "../scripts/icon-builder/src/build/deployment.ts"
import { prerenderPaths } from "./src/app/prerender.ts"

export default {
  appDirectory: "src",
  buildDirectory: process.env.ICONES_BUILD_DIRECTORY ?? "../dist",
  ssr: false,
  prerender: { paths: prerenderPaths, concurrency: 4 },
  routeDiscovery: { mode: "initial" },
  // Only prepare local artifacts; uploading is a separate, explicit command.
  async buildEnd({ reactRouterConfig }) {
    const split = iconDeploymentMode() === "split"
    if (split) {
      for (const [prefix, notice] of Object.entries(
        deployment.excludedCollections
      ))
        console.warn(`Skipping ${prefix}: ${notice}`)
      await buildCollections({
        outputDirectory: path.join(reactRouterConfig.buildDirectory, "icons"),
      })
    }
    await buildStatic(
      undefined,
      path.join(reactRouterConfig.buildDirectory, "client"),
      {
        copyCollections: !split,
        exclude: split ? Object.keys(deployment.excludedCollections) : [],
      }
    )
  },
} satisfies Config
