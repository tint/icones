import { useEffect, useState } from "react"
import { type CatalogPage, type CatalogQuery } from "./protocol.ts"
import { catalogBaseUrl } from "../../shared/icons/config.ts"

import { loadGallerySelection } from "./service.ts"

export function useCatalog(query: CatalogQuery, revision = 0) {
  const key = JSON.stringify({ query, revision })
  const [result, setResult] = useState<{
    key: string
    page?: CatalogPage
    error?: string
  }>()
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void loadGallerySelection(
        catalogBaseUrl,
        (JSON.parse(key) as { query: CatalogQuery }).query,
        controller.signal
      )
        .then((page) => {
          if (!controller.signal.aborted) setResult({ key, page })
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setResult({
              key,
              error: error instanceof Error ? error.message : String(error),
            })
            controller.abort()
          }
        })
    }, 120)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key])
  return {
    page: result?.key === key ? result.page : undefined,
    error: result?.key === key ? result.error : undefined,
    loading: result?.key !== key,
    sets: result?.page?.sets ?? [],
    categories: result?.page?.categories ?? [],
    variants:
      result &&
      (JSON.parse(result.key) as { query: CatalogQuery }).query.set ===
        query.set
        ? (result.page?.variants ?? [])
        : [],
  }
}
