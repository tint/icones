import { useLanguage } from "../shared/i18n/language.ts"
import { useEffect, useRef, type ReactNode } from "react"
import { IconConfig } from "@icones/react"
import { useLocation } from "../shared/routing/router.tsx"
import { Header } from "./components/header.tsx"
import { Footer } from "./components/footer.tsx"
import { BackToTop } from "./components/back-to-top.tsx"
import { previewIconApi, previewIconSources } from "../shared/icons/config.ts"
import { paths, pageMetadata } from "../shared/routing/paths.ts"
import { categoryLabel } from "../features/catalog/types.ts"
import { readFilters } from "../features/catalog/state.ts"
import { languages, languageHref } from "../shared/i18n/locale-routing.ts"
import { readGuidePath } from "../features/guide/routing.ts"

// Run after the lazy page is mounted so direct #catalog links can find it.
function PageNavigation() {
  const { pathname, hash } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => {
    const guideArticleChange =
      readGuidePath(pathname) &&
      (readGuidePath(previousPath.current) ||
        previousPath.current === paths.guide)
    if (previousPath.current !== pathname && !guideArticleChange) {
      window.scrollTo({ top: 0, behavior: "instant" })
      document.getElementById("main-content")?.focus({ preventScroll: true })
    }
    previousPath.current = pathname
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [pathname, hash])
  return null
}

export function AppShell({
  children,
  manageMetadata = true,
}: {
  children: ReactNode
  manageMetadata?: boolean
}) {
  const { t } = useLanguage()

  const { pathname, search } = useLocation()
  useEffect(() => {
    if (!manageMetadata) return
    const metadata = pageMetadata[pathname.replace(/\/$/, "") || "/"]
    // Guide owns its article metadata after the lazy route loads.
    if (pathname !== paths.guide && !readGuidePath(pathname)) {
      document.title =
        pathname === paths.icons
          ? t("{set} Icons", { set: categoryLabel(readFilters(search).set) }) +
            " – Icones"
          : t(metadata?.title ?? "Page not found") + " – Icones"
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute(
          "content",
          t(metadata?.description ?? "Find your way back to Icones.")
        )
    }
    for (const language of languages) {
      document
        .querySelector<HTMLLinkElement>(
          `link[rel="alternate"][hreflang="${language}"]`
        )
        ?.setAttribute(
          "href",
          languageHref(language, pathname + search, import.meta.env.BASE_URL)
        )
    }
  }, [pathname, search, t, manageMetadata])
  return (
    <IconConfig
      sources={previewIconSources}
      api={previewIconApi}
      defaultSize="md"
      strokeWidth={1.5}
    >
      <div className="relative flex min-h-svh flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-white p-3 text-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
        >
          {t("Skip to content")}
        </a>
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 outline-none"
        >
          <PageNavigation />
          {children}
        </main>
        <Footer />
        <BackToTop />
      </div>
    </IconConfig>
  )
}
