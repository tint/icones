import {
  queryIconCatalog,
  type CatalogPage,
  type CatalogQuery,
} from "./protocol.ts"
// Only the selected set's lightweight metadata is loaded; SVGs mount on demand.
// Pagination is a bounded network implementation detail, never a browsing control.
export async function loadCatalogSelection(
  base: string,
  query: CatalogQuery,
  signal: AbortSignal,
  fetcher = queryIconCatalog
) {
  const first = await fetcher(
    base,
    { ...query, offset: 0, limit: 100 },
    { signal }
  )
  const pages = new Map<number, CatalogPage>([[0, first]])
  const offsets = Array.from(
    { length: Math.max(0, Math.ceil(first.total / 100) - 1) },
    (_, index) => (index + 1) * 100
  )
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(4, offsets.length) }, async () => {
      while (cursor < offsets.length) {
        signal.throwIfAborted()
        const offset = offsets[cursor++]
        const page = await fetcher(
          base,
          { ...query, offset, limit: 100 },
          { signal }
        )
        if (page.total !== first.total || page.offset !== offset)
          throw new Error("Catalog changed while loading. Please retry.")
        pages.set(offset, page)
      }
    })
  )
  signal.throwIfAborted()
  const icons = [...pages]
    .sort(([a], [b]) => a - b)
    .flatMap(([, page]) => page.icons)
  if (
    icons.length !== first.total ||
    new Set(icons.map((icon) => icon.name)).size !== icons.length
  )
    throw new Error("Incomplete icon catalog. Please retry.")
  return { ...first, icons, nextOffset: null }
}
