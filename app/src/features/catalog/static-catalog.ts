import type { CatalogIcon, queryIconCatalog } from "./protocol.ts"
import { createGalleryCatalogIndex as createCatalogIndex } from "./query.ts"

const indexes = new Map<string, ReturnType<typeof createCatalogIndex>>()

/** One static metadata download per base; all subsequent filters and pages are local. */
export const queryStaticCatalog: typeof queryIconCatalog = async (
  base,
  query = {},
  options = {}
) => {
  const url = `${base.replace(/\/+$/, "")}/catalog.json`
  options.signal?.throwIfAborted()
  let index = indexes.get(url)
  if (!index) {
    const response = await (options.fetch ?? fetch)(url, {
      signal: options.signal,
    })
    if (!response.ok)
      throw new Error(`Unable to load static catalog (${response.status}).`)
    const records: CatalogIcon[] = await response.json()
    index = createCatalogIndex(records)
    indexes.set(url, index)
  }
  options.signal?.throwIfAborted()
  return index(query)
}
