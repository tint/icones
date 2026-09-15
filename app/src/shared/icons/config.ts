import { parseElementData, type IconApi } from "@icones/react"
import search01JSON from "../../../../packages/icons/huge/data/search-01.json"
import { createIconUrls } from "./urls.ts"

// A bare application name can still be backed by one imported JSON file.
const search01 = parseElementData(search01JSON)
export const previewIconSources = { Search01: search01, "search-01": search01 }
// Legacy/custom shared artwork root. Split deployments supply a per-set template.
export const dataBaseUrl = (
  import.meta.env.VITE_ICON_DATA_BASE_URL ??
  `${import.meta.env.BASE_URL ?? "/"}icons`
).replace(/\/+$/, "")
export const { catalogBaseUrl, collectionBaseUrl, dataUrl, symbolUrl } =
  createIconUrls({
    dataBaseUrl,
    catalogBaseUrl:
      import.meta.env.VITE_ICON_CATALOG_BASE_URL ??
      `${import.meta.env.BASE_URL ?? "/"}icons`,
    collectionUrl: import.meta.env.VITE_ICON_COLLECTION_URL,
  })
export const previewIconApi = {
  type: "fetch",
  baseUrl: dataBaseUrl,
  url: (_name, parsed) => {
    if (!parsed) throw new Error("Expected a set:name icon identifier.")
    return dataUrl(parsed.prefix, parsed.name)
  },
} satisfies IconApi
