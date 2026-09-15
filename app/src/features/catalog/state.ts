import { useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "../../shared/routing/router.tsx"
import { flagVariants, publicSets } from "./types.ts"
import { normalizeCatalogVariant } from "./styles.ts"

export type Filters = {
  set: string
  category: string
  query: string
  variant: string
}
export function readFilters(search = window.location.search): Filters {
  const params = new URLSearchParams(search)
  const requestedSet = params.get("set") ?? "tabler"
  const legacyCircle = requestedSet === "circle-flags"
  const set = legacyCircle
    ? "flag"
    : requestedSet === "hugeicons"
      ? "huge"
      : requestedSet
  const category = params.get("category") ?? ""
  const variant = legacyCircle
    ? "circle"
    : (params.get("variant") ??
      (set === "flag"
        ? (flagVariants.find((variant) => variant === category) ?? "1x1")
        : params.get("style") === "solid"
          ? "solid"
          : "outline"))
  return {
    set: (publicSets as readonly string[]).includes(set) ? set : "tabler",
    // Flag has only one visible category. Ignore old/hidden category deep links;
    // legacy ratio categories still select the matching variant below.
    category: set === "flag" ? "" : category,
    variant: normalizeCatalogVariant(set, variant),
    query: params.get("q") ?? "",
  }
}
export function useCatalogFilters() {
  const location = useLocation()
  const navigate = useNavigate()
  const filters = useMemo(() => readFilters(location.search), [location.search])
  const update = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch }
      const params = new URLSearchParams()
      params.set("set", next.set)
      if (next.category) params.set("category", next.category)
      if (next.query) params.set("q", next.query)
      if (next.variant !== "outline") params.set("variant", next.variant)
      void navigate(
        {
          pathname: location.pathname,
          search: `?${params}`,
          hash: location.hash,
        },
        { replace: patch.query !== undefined, preventScrollReset: true }
      )
    },
    [filters, navigate, location.pathname, location.hash]
  )
  return { ...filters, update }
}
