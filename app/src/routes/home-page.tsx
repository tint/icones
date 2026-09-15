import { useEffect, useState } from "react"
import { loadGallerySummary } from "../features/catalog/service.ts"
import { Hero } from "../features/home/components/hero.tsx"
import { mergeCatalogSets } from "../features/catalog/types.ts"
import { catalogBaseUrl } from "../shared/icons/config.ts"
import { ContentSection } from "../shared/ui/content-section.tsx"
import { FrameworkIcon } from "../shared/integrations/framework-icon.tsx"
import { guideFrameworks } from "../shared/integrations/frameworks.ts"
import { guideHref } from "../features/guide/routing.ts"
import { Link } from "../shared/routing/router.tsx"
import { useLanguage } from "../shared/i18n/language.ts"
import { homeResources, homeWorkflow } from "../features/home/sections.ts"
import { UIShowcase } from "../features/home/components/ui-showcase.tsx"

export default function HomePage() {
  const { t } = useLanguage()
  const [counts, setCounts] = useState({ icons: 0, sets: 0 })
  useEffect(() => {
    const controller = new AbortController()
    // Only request summary facets here; the icon browser loads on /icons.
    void loadGallerySummary(catalogBaseUrl, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        const sets = mergeCatalogSets(page.sets)
        setCounts({
          icons: sets.reduce((sum, item) => sum + item.count, 0),
          sets: sets.length,
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return (
    <>
      <Hero iconCount={counts.icons} setCount={counts.sets} />
      <UIShowcase />
      <ContentSection content={homeWorkflow} />
      <section
        aria-labelledby="framework-guides"
        className="border-y border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30"
      >
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2
            id="framework-guides"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("Start with your framework.")}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
            {t(
              "Follow a first-icon tutorial for your stack. Each guide covers installation, connecting artwork and checking the rendered result."
            )}
          </p>
          <nav
            aria-label={t("Framework tutorials")}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            {guideFrameworks.map((framework) => (
              <Link
                key={framework.id}
                to={guideHref("getting-started", framework.id)}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 font-medium hover:border-primary focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-950"
              >
                <FrameworkIcon framework={framework.id} size={24} />
                {framework.name}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <ContentSection content={homeResources} />
    </>
  )
}
