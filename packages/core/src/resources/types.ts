export type IconSource = {
  url: string
  revision?: string
  importedAt?: string
  distributionNotice?: string
  [key: string]: unknown
}
export type IconManifest = {
  version: 1
  prefix: string
  /** Style → category → flat filenames, relative to data/ and symbols/. */
  variants: Record<string, Record<string, { json: string[]; svg: string[] }>>
  /** Canonical style → upstream display name; never changes icon slugs or sorting. */
  variantAliases?: Partial<Record<"outline" | "solid", string>>
  /** Upstream provenance, keyed by the original source prefix. */
  sources?: Record<string, IconSource>
  /** Optional legacy namespace rules; no per-icon path/alias table. */
  aliases?: Record<string, { suffix: string }>
}
export type ManifestEntry = {
  prefix: string
  slug: string
  variant: string
  variantAlias?: string
  category: string
}

/** Shared resource metadata, independent of HTTP envelopes and gallery routes. */
export type CatalogIcon = {
  name: string
  prefix: string
  category: string
  variant?: string
  /** Upstream style name for display only; queries use variant. */
  variantAlias?: string
}
export type CatalogFacet = { id: string; count: number; alias?: string }
export type CatalogQuery = {
  set?: string
  category?: string
  variant?: string
  q?: string
  offset?: number
  limit?: number
  /** Optional exact-name suffix filters, not renderer variants. */
  suffix?: string
  excludeSuffix?: string
}
export type CatalogResult = {
  icons: CatalogIcon[]
  sets: CatalogFacet[]
  categories: CatalogFacet[]
  variants?: CatalogFacet[]
  total: number
  offset: number
  nextOffset: number | null
}
