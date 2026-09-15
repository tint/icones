import { Link } from "../routing/router.tsx"
import { useLanguage } from "../i18n/language.ts"
import type { ContentSectionData } from "../content/types.ts"

export function ContentSection({ content }: { content: ContentSectionData }) {
  const { t } = useLanguage()
  return (
    <section
      id={content.id}
      aria-labelledby={content.id + "-title"}
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 py-12 sm:py-16"
    >
      <h2
        id={content.id + "-title"}
        className="text-2xl font-semibold tracking-tight"
      >
        {t(content.title)}
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
        {t(content.description)}
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {content.items.map((item) => (
          <article
            key={item.title}
            className="flex min-w-0 flex-col border-t border-slate-200 pt-6 dark:border-slate-800"
          >
            <h3 className="text-base font-semibold">{t(item.title)}</h3>
            <p className="mt-3 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-400">
              {t(item.description)}
            </p>
            {item.link && (
              <Link
                to={item.link.href}
                className="mt-5 w-fit rounded text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                {t(item.link.label)}
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
