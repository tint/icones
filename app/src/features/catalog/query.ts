import {
  createCatalogIndex,
  type CatalogIcon,
  type CatalogQuery,
  type CatalogOptions,
} from "@icones/core/catalog"
import type { CatalogPage } from "./protocol.ts"

/** Website pagination policy; actual facet IDs use the default alphabetical order. */
export const galleryCatalogOptions: CatalogOptions = {
  defaultLimit: 60,
  maxLimit: 100,
  includeEmptyVariants: true,
}

export function createGalleryCatalogIndex(records: readonly CatalogIcon[]) {
  const index = createCatalogIndex(records, 32, galleryCatalogOptions)
  return (query: CatalogQuery = {}): CatalogPage => ({
    version: 1,
    ...index(query),
  })
}
