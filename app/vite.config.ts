import { fileURLToPath } from "node:url"
import path from "node:path"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"
import { icones } from "@icones/vite"
import { iconService } from "./plugins/icon-service.ts"
import { llmsDocuments } from "./plugins/llms.ts"
import { localizedAssets } from "./plugins/localized-assets.ts"
import {
  deployment,
  iconDeploymentMode,
} from "../scripts/icon-builder/src/build/deployment.ts"

const dataDir = fileURLToPath(new URL("../packages/icons", import.meta.url))
export default defineConfig(({ command, mode, isPreview }) => {
  const split = command === "build" && iconDeploymentMode() === "split"
  const collectStaticIcons =
    command === "build" || (command === "serve" && !isPreview)
  const env = loadEnv(
    mode,
    fileURLToPath(new URL(".", import.meta.url)),
    "VITE_"
  )
  return {
    define: {
      // Explicit external roots/templates override the production collection domains.
      "import.meta.env.VITE_ICON_COLLECTION_URL": JSON.stringify(
        env.VITE_ICON_COLLECTION_URL ??
          (split && !env.VITE_ICON_DATA_BASE_URL
            ? `https://{set}.${deployment.domain}`
            : "")
      ),
      "import.meta.env.VITE_ICON_EXCLUDED_COLLECTIONS": JSON.stringify(
        JSON.stringify(split ? Object.keys(deployment.excludedCollections) : [])
      ),
    },
    // React Router owns build output paths; preview only consumes its client directory.
    build: isPreview
      ? {
          outDir: path.resolve(
            fileURLToPath(new URL(".", import.meta.url)),
            process.env.ICONES_BUILD_DIRECTORY ?? "../dist",
            "client"
          ),
        }
      : { emptyOutDir: true },
    // The temporary server bundle lives outside app/, so include app-only dependencies.
    ssr: {
      noExternal: ["@react-router/node", "isbot", "clsx", "tailwind-merge"],
    },
    plugins: [
      tailwindcss(),
      llmsDocuments(),
      localizedAssets(),
      iconService(dataDir),
      // Collect in dev and every build; preview only serves emitted files.
      collectStaticIcons &&
        icones({
          mode: "sprite",
          spriteGroupBy: "set",
          spriteMaxBytes: 256 * 1024,
          assetsDir: "assets/icons",
          dataDir,
          emitData: false,
          fallbackToApi: false,
        }),
      (!isPreview || process.env.IS_RR_BUILD_REQUEST === "yes") &&
        reactRouter(),
    ],
  }
})
