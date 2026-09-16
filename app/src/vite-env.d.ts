/// <reference types="@icones/vite/client" />

interface ImportMetaEnv {
  /** Shared artwork root, with <set>/data and <set>/symbols underneath. */
  readonly VITE_ICON_DATA_BASE_URL?: string
  /** Per-collection HTTP(S) root template, e.g. https://{set}.icones.go-slim.dev. */
  readonly VITE_ICON_COLLECTION_URL?: string
  /** Metadata root containing catalog.json; defaults to same-origin /icons. */
  readonly VITE_ICON_CATALOG_BASE_URL?: string
  /** Internal build policy, injected by Vite from icon-builder's deployment config. */
  readonly VITE_ICON_EXCLUDED_COLLECTIONS?: string
}
