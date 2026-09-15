import type { CatalogIcon, CatalogResult, CatalogQuery } from "./types.ts"

export type {
  CatalogIcon,
  CatalogFacet,
  CatalogQuery,
  CatalogResult,
} from "./types.ts"

/** Policies belong to the caller; omitted pagination returns all matching records. */
export type CatalogOptions = {
  defaultLimit?: number
  maxLimit?: number
  variantOrder?: readonly string[]
  /** Set-specific presentation order; unknown sets use variantOrder/alphabetical order. */
  variantOrderBySet?: Readonly<Record<string, readonly string[]>>
  includeEmptyVariants?: boolean
}

function normalizeOptions(options: CatalogOptions): CatalogOptions {
  for (const key of ["defaultLimit", "maxLimit"] as const) {
    const value = options[key]
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
      throw new RangeError(`Invalid catalog ${key}: ${value}`)
  }
  return {
    ...options,
    variantOrder: [...(options.variantOrder ?? [])],
    variantOrderBySet: Object.fromEntries(
      Object.entries(options.variantOrderBySet ?? {}).map(([set, order]) => [
        set,
        [...order],
      ])
    ),
  }
}

/** Shared filtering and pagination for static browsers, servers and build tools. */
export function selectCatalog(
  records: readonly CatalogIcon[],
  query: CatalogQuery = {},
  options: CatalogOptions = {}
): CatalogResult {
  // Apply filtering/ordering pipeline first, then slice to requested page.
  const policy = normalizeOptions(options)
  return page(select(records, query, false, policy), query, policy)
}

function termsFor(query: CatalogQuery) {
  // Normalize fulltext search query into lowercase tokens once per call.
  return (query.q ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean)
}

function select(
  records: readonly CatalogIcon[],
  query: CatalogQuery,
  sorted = false,
  options: CatalogOptions = {}
) {
  const terms = termsFor(query)
  const found = records.filter(
    (record) =>
      terms.every((term) =>
        `${record.name} ${record.category}`.includes(term)
      ) &&
      (!query.suffix || record.name.endsWith(query.suffix)) &&
      (!query.excludeSuffix || !record.name.endsWith(query.excludeSuffix))
  )
  const selectedSet = found.filter(
    (record) => !query.set || record.prefix === query.set
  )
  const selectedVariant = selectedSet.filter(
    (record) => !query.variant || record.variant === query.variant
  )
  const selected = selectedVariant.filter(
    (record) => !query.category || record.category === query.category
  )
  if (!sorted) selected.sort((a, b) => a.name.localeCompare(b.name))
  const variantRecords = options.includeEmptyVariants
    ? records.filter((record) => !query.set || record.prefix === query.set)
    : selectedSet
  return {
    selected,
    sets: facets(found, "prefix"),
    categories: facets(selectedVariant, "category"),
    // Whether empty variants remain visible is a caller-owned browsing policy.
    variants: facets(
      variantRecords,
      "variant",
      query.set &&
        options.variantOrderBySet &&
        Object.hasOwn(options.variantOrderBySet, query.set)
        ? options.variantOrderBySet[query.set]
        : options.variantOrder
    ).map(({ id }) => {
      // An all-set facet can combine different upstream names; don't pick one.
      const aliases = new Set(
        variantRecords
          .filter((record) => record.variant === id)
          .map((record) => record.variantAlias ?? id)
      )
      const alias =
        aliases.size === 1 ? aliases.values().next().value : undefined
      return {
        id,
        count: selectedSet.filter((record) => record.variant === id).length,
        ...(alias && alias !== id ? { alias } : {}),
      }
    }),
  }
}

type Selection = ReturnType<typeof select>

function page(
  selection: Selection,
  query: CatalogQuery,
  options: CatalogOptions
): CatalogResult {
  // Pagination bounds are explicit caller policy; no website limit is built in.
  const { selected, sets, categories, variants } = selection
  const limit = Math.min(
    options.maxLimit ?? Infinity,
    Math.max(1, query.limit ?? options.defaultLimit ?? selected.length)
  )
  const offset = Math.max(0, query.offset ?? 0)
  return {
    icons: selected
      .slice(offset, offset + limit)
      .map(({ name, prefix, category, variant, variantAlias }) => ({
        name,
        prefix,
        category,
        ...(variant ? { variant } : {}),
        ...(variantAlias ? { variantAlias } : {}),
      })),
    sets: sets.map(({ id, count }) => ({ id, count })),
    categories: categories.map(({ id, count }) => ({ id, count })),
    ...(variants.length
      ? { variants: variants.map((facet) => ({ ...facet })) }
      : {}),
    total: selected.length,
    offset,
    nextOffset: offset + limit < selected.length ? offset + limit : null,
  }
}

/** Immutable metadata snapshot with a bounded LRU of filters, shared by pages. */
export function createCatalogIndex(
  records: readonly CatalogIcon[],
  maxQueries = 32,
  options: CatalogOptions = {}
) {
  if (!Number.isSafeInteger(maxQueries) || maxQueries < 0)
    throw new RangeError(`Invalid catalog query cache capacity: ${maxQueries}`)
  const policy = normalizeOptions(options)
  const sorted = records
    .map(({ name, prefix, category, variant, variantAlias }) => ({
      name,
      prefix,
      category,
      ...(variant ? { variant } : {}),
      ...(variantAlias ? { variantAlias } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const queries = new Map<string, Selection>()
  return (query: CatalogQuery = {}): CatalogResult => {
    // Cache key normalizes only query semantics, not raw whitespace/casing.
    const key = JSON.stringify([
      termsFor(query),
      query.set || "",
      query.category || "",
      query.variant || "",
      query.suffix || "",
      query.excludeSuffix || "",
    ])
    let selection = queries.get(key)
    if (selection) queries.delete(key)
    else selection = select(sorted, query, true, policy)
    if (maxQueries > 0) {
      queries.set(key, selection)
      if (queries.size > maxQueries)
        queries.delete(queries.keys().next().value!)
    }
    return page(selection, query, policy)
  }
}

function facets(
  records: readonly CatalogIcon[],
  key: "prefix" | "category" | "variant",
  order: readonly string[] = []
) {
  const counts = new Map<string, number>()
  for (const record of records) {
    const id = record[key]
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts]
    .sort(([a], [b]) => {
      return (
        (key === "variant"
          ? (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) -
            (order.indexOf(b) < 0 ? 99 : order.indexOf(b))
          : 0) || a.localeCompare(b)
      )
    })
    .map(([id, count]) => ({ id, count }))
}
