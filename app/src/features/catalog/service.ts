import {
  queryIconCatalog,
  type CatalogPage,
  type CatalogQuery,
} from "./protocol.ts"
import { loadCatalogSelection } from "./loader.ts"
import { normalizeCatalogVariant } from "./styles.ts"
import { queryStaticCatalog } from "./static-catalog.ts"

// Development keeps live manifest updates; production needs only static files.
const queryGalleryCatalog = import.meta.env?.PROD
  ? queryStaticCatalog
  : queryIconCatalog

export async function loadGallerySelection(
  base: string,
  query: CatalogQuery,
  signal: AbortSignal,
  fetcher = queryGalleryCatalog
): Promise<CatalogPage> {
  return loadFlagSelection(
    base,
    query.set && query.variant
      ? { ...query, variant: normalizeCatalogVariant(query.set, query.variant) }
      : query,
    signal,
    fetcher
  )
}

// A browsing policy, not a change to the collection inventory or asset URLs.
function flagQuery(query: CatalogQuery): CatalogQuery {
  return {
    set: "flag",
    category: "flags",
    q: query.q,
    suffix: query.suffix,
    excludeSuffix: query.excludeSuffix,
  }
}

function visibleSetCounts(page: CatalogPage, flagCount: number) {
  return page.sets.map((set) =>
    set.id === "flag" ? { ...set, count: flagCount } : set
  )
}

/** Load only drawable flags; use tiny summary requests for cross-variant counts. */
async function loadFlagSelection(
  base: string,
  query: CatalogQuery,
  signal: AbortSignal,
  fetcher = queryGalleryCatalog
): Promise<CatalogPage> {
  const isFlag = query.set === "flag"
  const page = await loadCatalogSelection(
    base,
    isFlag ? { ...query, category: "flags" } : query,
    signal,
    fetcher
  )
  if (!isFlag && !page.sets.some((set) => set.id === "flag")) return page
  if (isFlag && page.variants?.length) {
    const variants = await Promise.all(
      page.variants.map(async ({ id }) => {
        const count =
          query.variant === id
            ? page.total
            : (
                await fetcher(
                  base,
                  { ...flagQuery(query), variant: id, limit: 1 },
                  { signal }
                )
              ).total
        return { id, count }
      })
    )
    signal.throwIfAborted()
    return {
      ...page,
      categories: page.categories.filter((category) => category.id === "flags"),
      variants,
      sets: visibleSetCounts(
        page,
        variants.reduce((sum, variant) => sum + variant.count, 0)
      ),
    }
  }
  const flags = await fetcher(
    base,
    { ...flagQuery(query), limit: 1 },
    { signal }
  )
  signal.throwIfAborted()
  return {
    ...page,
    categories: isFlag
      ? page.categories.filter((category) => category.id === "flags")
      : page.categories,
    sets: visibleSetCounts(page, flags.total),
  }
}

/** Keep the homepage's summary consistent with what the gallery actually shows. */
export async function loadGallerySummary(
  base: string,
  signal: AbortSignal,
  fetcher = queryGalleryCatalog
) {
  let page = await fetcher(base, { limit: 1 }, { signal })
  const original = page.sets.find((set) => set.id === "flag")
  if (original) {
    const flags = await fetcher(
      base,
      { ...flagQuery({}), limit: 1 },
      { signal }
    )
    page = {
      ...page,
      sets: visibleSetCounts(page, flags.total),
      total: page.total - original.count + flags.total,
    }
  }
  signal.throwIfAborted()
  return page
}
