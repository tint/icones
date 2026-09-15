import type { CatalogResult } from "@icones/core/catalog"

export type {
  CatalogIcon,
  CatalogFacet,
  CatalogQuery,
} from "@icones/core/catalog"
/** Website HTTP/static-query envelope, not a component or filesystem model. */
export type CatalogPage = CatalogResult & { version: 1 }
export { queryIconCatalog } from "./client.ts"
