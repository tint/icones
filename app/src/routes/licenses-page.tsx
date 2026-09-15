import { Icon } from "@icones/react"
import { useState } from "react"
import { PageIntro } from "../shared/ui/page-intro.tsx"
import { LicenseNoticeDialog } from "../features/licenses/components/license-notice-dialog.tsx"
import { useLanguage } from "../shared/i18n/language.ts"
import { getCollectionSources } from "../features/licenses/sources.ts"
import { publicSets, categoryLabel } from "../features/catalog/types.ts"
import { collectionBaseUrl } from "../shared/icons/config.ts"
import { ContentSection } from "../shared/ui/content-section.tsx"
import { licenseFiles } from "../features/licenses/sections.ts"

const sets = publicSets.toSorted()
const linkClass =
  "inline-flex w-fit items-center gap-1 rounded text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"

export default function LicensesPage() {
  const { t } = useLanguage()
  const [notice, setNotice] = useState<{
    source: ReturnType<typeof getCollectionSources>[number]
    trigger: HTMLButtonElement
  }>()
  return (
    <>
      <PageIntro
        eyebrow="Collections · Attribution"
        title="Licenses"
        description="Original licenses and provenance for every bundled icon collection."
      >
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {t("{count} collections", { count: sets.length })}
        </span>
      </PageIntro>
      <section
        className="mx-auto max-w-7xl px-6 py-12"
        aria-labelledby="collection-licenses"
      >
        <h2
          id="collection-licenses"
          className="text-2xl font-semibold tracking-tight"
        >
          {t("Each collection keeps its own license.")}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
          {t(
            "These notices are bundled with the imported artwork, not a single license for all of Icones. Read the original text and any distribution notice for the collection you use. License text is shown unchanged."
          )}
        </p>
        <nav
          aria-label={t("Collection licenses")}
          className="mt-6 flex flex-wrap gap-2"
        >
          {sets.map((set) => (
            <a
              key={set}
              href={"#license-" + set}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:hover:bg-slate-900"
            >
              {categoryLabel(set)}
            </a>
          ))}
        </nav>
        <div className="mt-8 columns-1 gap-6 lg:columns-2">
          {sets.map((set) => (
            <article
              key={set}
              id={"license-" + set}
              className="mb-6 min-w-0 scroll-mt-6 break-inside-avoid rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
            >
              <header className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">{categoryLabel(set)}</h3>
                <Icon
                  name="tabler:license"
                  size={24}
                  className="shrink-0 text-slate-400"
                />
              </header>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <a
                  className={linkClass}
                  href={`${collectionBaseUrl(set)}/license.txt`}
                  target="_blank"
                  rel="noreferrer"
                >
                  license.txt <Icon name="tabler:arrow-up-right" size={15} />
                </a>
                <a
                  className={linkClass}
                  href={`${collectionBaseUrl(set)}/manifest.json`}
                  target="_blank"
                  rel="noreferrer"
                >
                  manifest.json <Icon name="tabler:arrow-up-right" size={15} />
                </a>
              </div>
              {getCollectionSources(set).map((source) => (
                <section
                  key={source.id}
                  data-source={source.id}
                  aria-label={source.id}
                  className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">{source.id}</h4>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                      {source.licenseName}
                    </span>
                  </div>
                  <a
                    className={linkClass + " mt-4"}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Original collection ↗")}
                  </a>
                  <p className="mt-3 text-xs leading-6 break-words text-slate-500 dark:text-slate-400">
                    {t("Imported ")}
                    {source.importedAt} ·{" "}
                    <span title={source.revision}>
                      {t("Revision ")}
                      {source.revision.slice(0, 12)}
                    </span>
                  </p>
                  {source.notice && (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      {source.notice}
                    </p>
                  )}
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={(event) =>
                      setNotice({ source, trigger: event.currentTarget })
                    }
                    className="mt-4 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <Icon
                      name="tabler:file-description"
                      size={18}
                      aria-hidden="true"
                    />
                    {t("Read license notice")}
                  </button>
                </section>
              ))}
            </article>
          ))}
        </div>
      </section>
      <ContentSection content={licenseFiles} />
      {notice && (
        <LicenseNoticeDialog
          source={notice.source}
          trigger={notice.trigger}
          onClose={() => setNotice(undefined)}
        />
      )}
    </>
  )
}
