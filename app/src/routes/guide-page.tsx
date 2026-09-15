import { Guide } from "../features/guide/components/guide.tsx"
import { useEffect } from "react"
import { useLocation, useNavigate } from "../shared/routing/router.tsx"
import type { MetaFunction } from "react-router"
import { getGuideArticle } from "../features/guide/content.ts"
import { localePage } from "../shared/i18n/locale-routing.ts"
import { translate, type Locale } from "../shared/i18n/language.ts"
import {
  guideHref,
  readGuideLocation,
  readGuidePath,
  renderingDestination,
} from "../features/guide/routing.ts"
import NotFoundPage from "./not-found-page.tsx"

export const meta: MetaFunction = ({ location, matches }) => {
  const locale = matches.find((match) => match.id === "root")?.loaderData as
    | Locale
    | undefined
  const route = localePage(location.pathname).route
  const guide =
    readGuidePath(route) ??
    (route === "/guide" ? readGuideLocation(location.search) : undefined)
  const article =
    guide &&
    getGuideArticle(guide.page, guide.framework, undefined, guide.element)
  return [
    {
      title:
        translate(
          locale?.messages ?? {},
          article ? article.title : "Page not found"
        ) + " – Icones",
    },
    {
      name: "description",
      content: translate(
        locale?.messages ?? {},
        article ? article.description : "Find your way back to Icones."
      ),
    },
  ]
}

export default function GuidePage() {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const route = pathname.replace(/\/index\.html$/, "").replace(/\/$/, "")
  let location =
    route === "/guide" ? readGuideLocation(search) : readGuidePath(pathname)
  const destination =
    location?.page === "rendering" ? renderingDestination(hash) : undefined
  if (destination) location = { page: destination.page }
  const targetHash = destination?.hash ?? hash
  const params = new URLSearchParams(search)
  if (route === "/guide") {
    for (const key of ["page", "framework", "element"]) params.delete(key)
  }
  const href =
    location && guideHref(location.page, location.framework, location.element)
  const query = params.size ? "?" + params.toString() : ""
  useEffect(() => {
    if (href && (pathname !== href || hash !== targetHash))
      void navigate(href + query + targetHash, { replace: true })
  }, [href, pathname, query, hash, targetHash, navigate])
  if (!location) return <NotFoundPage />
  return <Guide location={location} />
}
