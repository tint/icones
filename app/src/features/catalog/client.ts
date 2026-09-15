import type { CatalogPage, CatalogQuery } from "./protocol.ts"

/** Query an HTTP catalog service; static sites can use createCatalogIndex instead. */
export async function queryIconCatalog(
  baseUrl: string,
  query: CatalogQuery = {},
  options: {
    signal?: AbortSignal
    fetch?: typeof globalThis.fetch
    requestInit?: RequestInit
  } = {}
): Promise<CatalogPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  const response = await (options.fetch ?? globalThis.fetch)(
    `${baseUrl.replace(/\/+$/, "")}/catalog?${params}`,
    {
      ...options.requestInit,
      signal: options.signal ?? options.requestInit?.signal,
    }
  )
  if (!response.ok) throw new Error(`Icon catalog returned ${response.status}.`)
  const page = (await response.json()) as CatalogPage
  if (
    page?.version !== 1 ||
    !Array.isArray(page.icons) ||
    page.icons.length > 100 ||
    page.icons.some(
      (icon) =>
        !icon ||
        typeof icon.name !== "string" ||
        typeof icon.category !== "string" ||
        typeof icon.prefix !== "string" ||
        (icon.variant !== undefined && typeof icon.variant !== "string") ||
        (icon.variantAlias !== undefined &&
          typeof icon.variantAlias !== "string")
    ) ||
    !Array.isArray(page.sets) ||
    !Array.isArray(page.categories) ||
    (page.variants !== undefined && !Array.isArray(page.variants)) ||
    [...page.sets, ...page.categories, ...(page.variants ?? [])].some(
      (facet) =>
        !facet ||
        typeof facet.id !== "string" ||
        (facet.alias !== undefined && typeof facet.alias !== "string") ||
        !Number.isSafeInteger(facet.count) ||
        facet.count < 0
    ) ||
    !Number.isSafeInteger(page.total) ||
    page.total < 0 ||
    !Number.isSafeInteger(page.offset) ||
    page.offset < 0 ||
    (page.nextOffset !== null &&
      (!Number.isSafeInteger(page.nextOffset) ||
        page.nextOffset <= page.offset))
  ) {
    throw new TypeError("Invalid icon catalog response.")
  }
  return page
}
