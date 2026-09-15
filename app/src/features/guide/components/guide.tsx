import { useLanguage } from "../../../shared/i18n/language.ts"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Icon } from "@icones/react"
import {
  Link,
  useLocation,
  useNavigate,
} from "../../../shared/routing/router.tsx"
import { CodeBlock } from "../../../shared/code/code-block.tsx"
import { InstallCodeBlock } from "../../../shared/code/install-code-block.tsx"
import { Select } from "../../../shared/ui/select.tsx"
import { FrameworkIcon } from "../../../shared/integrations/framework-icon.tsx"
import { cn } from "../../../shared/lib/cn.ts"
import { paths } from "../../../shared/routing/paths.ts"
import { vanillaGuideTracks } from "../vanilla.ts"
import type { VanillaElementMode } from "../../../shared/integrations/vanilla-example.ts"
import {
  getGuideArticle,
  guideFrameworks,
  guideGroups,
  guideHref,
  type GuideFramework,
  type GuidePageId,
  type GuideSection,
} from "../content.ts"
import {
  isSharedGuidePage,
  sharedGuidePages,
  frameworkGuidePages,
  type GuideLocation,
} from "../routing.ts"
import { Button } from "../../../shared/ui/button.tsx"
import { GuideTocIndicator } from "./toc-indicator.tsx"
import { observeGuideSections } from "../observe-sections.ts"

// Keep literal names here so the Vite plugin bundles the sidebar icons.
const navigationIcons = {
  "Rendering fundamentals": <Icon name="tabler:layers-intersect" size={16} />,
  Framework: <Icon name="tabler:components" size={16} />,
  Basics: <Icon name="tabler:stack-2" size={16} />,
  Advanced: <Icon name="tabler:adjustments" size={16} />,
  overview: <Icon name="tabler:layout-dashboard" size={16} />,
  "getting-started": <Icon name="tabler:rocket" size={16} />,
  color: <Icon name="tabler:palette" size={16} />,
  sizing: <Icon name="tabler:arrows-maximize" size={16} />,
  "stroke-width": <Icon name="tabler:line" size={16} />,
  fill: <Icon name="tabler:bucket" size={16} />,
  "icon-config": <Icon name="tabler:settings" size={16} />,
  rendering: <Icon name="tabler:layers-intersect" size={16} />,
  loading: <Icon name="tabler:cloud-download" size={16} />,
  "prop-support": <Icon name="tabler:adjustments" size={16} />,
  collections: <Icon name="tabler:shape" size={16} />,
  typescript: <Icon name="brand:typescript" size={16} />,
  accessibility: <Icon name="tabler:accessible" size={16} />,
  alternative: <Icon name="tabler:replace" size={16} />,
  "global-styling": <Icon name="tabler:brush" size={16} />,
  standard: <Icon name="tabler:code" size={16} />,
  web: <Icon name="tabler:puzzle" size={16} />,
} satisfies Record<
  (typeof guideGroups)[number]["title"] | GuidePageId | VanillaElementMode,
  ReactNode
>

function NavigationIcon({ item }: { item: keyof typeof navigationIcons }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-4 shrink-0 items-center justify-center"
    >
      {navigationIcons[item]}
    </span>
  )
}

export function Guide({ location }: { location: GuideLocation }) {
  const { t } = useLanguage()

  const { hash, key: locationKey } = useLocation()
  const navigate = useNavigate()
  const { page, framework = "react", element = "web" } = location
  const shared = isSharedGuidePage(page)
  const pagination = shared ? sharedGuidePages : frameworkGuidePages
  const article = getGuideArticle(page, framework, undefined, element)
  const adapter = guideFrameworks.find((item) => item.id === framework)!
  const pageIndex = pagination.findIndex((item) => item.id === page)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const track = vanillaGuideTracks.find((item) => item.id === element)!
  const articleKey = shared ? page : page + "/" + framework + "/" + element
  const previousArticle = useRef(articleKey)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const href = guideHref(page, framework, element)
  const sectionIds = article.sections.map(
    (section) => "guide-" + page + "-" + section.id
  )
  const sectionKey = sectionIds.join(",")
  const [visibleSections, setVisibleSections] = useState({
    key: articleKey,
    ids: [] as string[],
  })
  const visibleIds =
    visibleSections.key === articleKey ? visibleSections.ids : []

  useEffect(() => {
    document.title = t(article.title) + " – Icones"
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t(article.description))
  }, [article.title, article.description, t])

  useEffect(() => {
    if (previousArticle.current !== articleKey) {
      if (!hash) window.scrollTo({ top: 0, behavior: "instant" })
      headingRef.current?.focus({ preventScroll: true })
    }
    previousArticle.current = articleKey
    if (hash) {
      const heading = document.getElementById(hash.slice(1))
      const disclosure = heading?.closest("details")
      if (disclosure) disclosure.open = true
      heading?.scrollIntoView({ behavior: "instant", block: "start" })
    }
  }, [articleKey, hash, locationKey])

  useEffect(() => {
    const sections = sectionKey.split(",").flatMap((id) => {
      const element = document.getElementById(id)?.closest("section")
      return element ? [{ id, element }] : []
    })
    return observeGuideSections(
      sections,
      document.querySelector("header"),
      (ids) => setVisibleSections({ key: articleKey, ids })
    )
  }, [articleKey, sectionKey])

  function contents(label: string) {
    const firstVisible = sectionIds.findIndex((id) => visibleIds.includes(id))
    const lastVisible = sectionIds.findLastIndex((id) =>
      visibleIds.includes(id)
    )
    return (
      <nav
        aria-label={t(label)}
        className="relative grid grid-cols-[1px_minmax(0,1fr)]"
        style={{ gridTemplateRows: `repeat(${sectionIds.length}, auto)` }}
      >
        <div
          aria-hidden="true"
          data-toc-track=""
          className="pointer-events-none col-start-1 row-span-full bg-slate-200 dark:bg-slate-800"
        />
        {firstVisible !== -1 && (
          <GuideTocIndicator
            key={articleKey}
            first={firstVisible}
            last={lastVisible}
            count={sectionIds.length}
          />
        )}
        <ul className="col-start-2 row-span-full grid grid-rows-subgrid">
          {article.sections.map((section, index) => (
            <li key={section.id} className="pb-1 last:pb-0">
              <Link
                to={href + "#" + sectionIds[index]}
                data-visible={visibleIds.includes(sectionIds[index]!)}
                // Visually mark every visible section; keep one current location for assistive tech.
                aria-current={
                  visibleIds[0] === sectionIds[index] ? "location" : undefined
                }
                className="block py-1.5 pl-4 text-xs leading-5 text-slate-500 transition-colors duration-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-primary data-[visible=true]:font-medium data-[visible=true]:text-primary motion-reduce:transition-none dark:text-slate-400 dark:hover:text-white"
              >
                {t(section.title)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <div
      id="guide"
      className="mx-auto grid w-full max-w-7xl items-start gap-x-10 px-5 md:grid-cols-[12rem_minmax(0,1fr)] md:px-6 xl:grid-cols-[12rem_minmax(0,1fr)_11rem] xl:gap-x-12"
    >
      <aside
        aria-label={t("Guide sidebar")}
        className="min-w-0 border-b border-slate-200 py-4 md:sticky md:top-[calc(var(--header-height)+1.5rem)] md:max-h-[calc(100svh-var(--header-height)-3rem)] md:overflow-y-auto md:overscroll-contain md:border-0 md:py-8 md:pr-1 dark:border-slate-800"
      >
        <button
          type="button"
          aria-expanded={navigationOpen}
          aria-controls="guide-navigation"
          onClick={() => setNavigationOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary md:hidden"
        >
          <span>
            {t("Documentation")}{" "}
            <span className="ml-2 font-normal text-slate-500">
              / {t(article.title)}
            </span>
          </span>
          <Icon
            name="tabler:chevron-down"
            size={16}
            className={cn(
              "shrink-0 transition-transform",
              navigationOpen && "rotate-180"
            )}
          />
        </button>
        <nav
          id="guide-navigation"
          aria-label={t("Guide navigation")}
          className={cn("pt-5 md:block md:pt-0", !navigationOpen && "hidden")}
        >
          {guideGroups.map((section) => (
            <div
              key={section.title}
              className={cn(
                "mb-5 last:mb-0",
                section.title === "Rendering fundamentals" &&
                  "border-b border-slate-200 pb-5 dark:border-slate-800"
              )}
            >
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-950 dark:text-slate-100">
                <NavigationIcon item={section.title} />
                <span>{t(section.title)}</span>
              </h2>
              {section.title === "Framework" && (
                <div id="guide-framework" className="mb-3">
                  <Select<GuideFramework>
                    aria-label={t("Framework")}
                    value={shared ? undefined : framework}
                    options={guideFrameworks.map(({ id, name }) => ({
                      value: id,
                      label: (
                        <span className="flex min-w-0 items-center gap-2">
                          <FrameworkIcon framework={id} />
                          <span>{name}</span>
                        </span>
                      ),
                    }))}
                    onValueChange={(value) => {
                      if (value)
                        navigate(
                          guideHref(shared ? "overview" : page, value, element)
                        )
                    }}
                    className="flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium transition outline-none hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-slate-700 dark:bg-slate-950"
                    panelClassName="p-1 [&_ul]:space-y-1"
                    renderValue={(option) => (
                      <>
                        {option?.label ?? t("Choose a framework")}
                        <Icon
                          name="tabler:chevron-down"
                          size={15}
                          className="shrink-0 text-slate-400"
                        />
                      </>
                    )}
                    renderOption={({
                      onClick,
                      option,
                      selected,
                      className,
                    }) => (
                      <Button
                        type="button"
                        tabIndex={-1}
                        role="option"
                        onClick={onClick}
                        className={cn("w-full rounded-lg px-2!", className)}
                        aria-selected={selected}
                      >
                        {option?.label}
                      </Button>
                    )}
                  />
                </div>
              )}
              {section.title === "Framework" &&
                !shared &&
                framework === "vanilla" && (
                  <div
                    role="group"
                    aria-label={t("Vanilla tutorial paths")}
                    className="mb-4 space-y-1 rounded-xl border border-slate-200 p-1 dark:border-slate-800"
                  >
                    {vanillaGuideTracks.map((item) => (
                      <Link
                        key={item.id}
                        to={guideHref(page, framework, item.id)}
                        aria-current={element === item.id ? true : undefined}
                        onClick={() => setNavigationOpen(false)}
                        className="block rounded-lg px-2 py-2 text-xs text-slate-500 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary aria-[current=true]:bg-primary/8 aria-[current=true]:text-primary dark:text-slate-400 dark:hover:bg-slate-900"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <NavigationIcon item={item.id} />
                          <span>{t(item.name)}</span>
                        </span>
                        <code className="mt-1 block text-[0.6875rem] opacity-75">
                          {item.tag}
                        </code>
                      </Link>
                    ))}
                  </div>
                )}
              {/* Center the 1px rule under the heading's px-3 + half size-4 icon, keeping links in place. */}
              <ul
                className={cn(
                  "space-y-0.5",
                  section.title !== "Framework" &&
                    "ml-[calc(0.5rem-0.5px)] border-l border-slate-200 pl-[calc(0.75rem+0.5px)] dark:border-slate-800"
                )}
              >
                {section.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={guideHref(item.id, framework, element)}
                      aria-current={page === item.id ? "page" : undefined}
                      onClick={() => setNavigationOpen(false)}
                      className={cn(
                        "flex items-center gap-2 py-1.5 text-[0.8125rem] leading-5 text-slate-500 transition",
                        "hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-400 dark:hover:text-white",
                        "aria-[current=page]:font-medium aria-[current=page]:text-primary",
                        "aria-[current=page]:hover:text-primary"
                      )}
                    >
                      <NavigationIcon item={item.id} />
                      <span>{t(item.title)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <article aria-labelledby="guide-title" className="min-w-0 py-9 md:py-12">
        <header className="mb-9">
          <div className="mb-5 flex items-center gap-2 text-xs text-slate-400">
            <span>{t("Guide")}</span>
            <span aria-hidden="true">/</span>
            <span>
              {shared
                ? t("Rendering fundamentals")
                : framework === "vanilla"
                  ? "Vanilla / " + t(track.name)
                  : adapter.name}
            </span>
          </div>
          <h1
            ref={headingRef}
            id="guide-title"
            tabIndex={-1}
            className="text-3xl font-semibold tracking-tight outline-none sm:text-4xl"
          >
            {t(article.title)}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-500 dark:text-slate-400">
            {t(article.description)}
          </p>
        </header>
        {article.tutorial && (
          <div className="mb-9 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
            <h2 className="text-sm font-semibold">{t("Before you start")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t(article.tutorial.before)}
            </p>
            {article.tutorial.prerequisite && (
              <Link
                to={guideHref(
                  article.tutorial.prerequisite.page,
                  framework,
                  element
                )}
                className="mt-2 inline-block rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t(article.tutorial.prerequisite.label)} →
              </Link>
            )}
            <nav
              aria-label={t("Tutorial steps")}
              className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800"
            >
              <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {t("Learning path")}
              </h2>
              <ol className="mt-2 space-y-1">
                {article.sections.map(
                  (section, index) =>
                    !section.optional && (
                      <li key={section.id}>
                        <Link
                          to={href + "#" + sectionIds[index]}
                          className="block rounded py-1 text-sm text-slate-700 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-200"
                        >
                          {t(section.title)}
                        </Link>
                      </li>
                    )
                )}
              </ol>
            </nav>
            <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
              <span className="font-medium">{t("By the end: ")}</span>
              {t(article.tutorial.outcome)}
            </p>
          </div>
        )}
        <details
          key={articleKey}
          className="mb-9 rounded-xl border border-slate-200 px-4 py-3 xl:hidden dark:border-slate-800"
        >
          <summary className="cursor-pointer text-sm font-medium">
            {t("On this page")}
          </summary>
          <div className="pt-3">{contents("Article contents")}</div>
        </details>
        <div className="space-y-10">
          {article.sections.map((section, index) => (
            <GuideArticleSection
              key={articleKey + "/" + section.id}
              section={section}
              id={sectionIds[index]!}
              framework={framework}
              element={element}
              articleKey={articleKey}
            />
          ))}
        </div>
        <nav
          aria-label={t("Article pagination")}
          className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          {[pagination[pageIndex - 1], pagination[pageIndex + 1]].map(
            (item, index) =>
              item ? (
                <Link
                  key={item.id}
                  to={guideHref(item.id, framework, element)}
                  className={cn(
                    "rounded-xl border border-slate-200 p-4 transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-800",
                    index === 1 && "col-start-2 text-right"
                  )}
                >
                  <span className="block text-xs text-slate-400">
                    {index === 0 ? t("← Previous") : t("Next →")}
                  </span>
                  <span className="mt-1 block text-sm font-medium">
                    {t(item.title)}
                  </span>
                </Link>
              ) : null
          )}
        </nav>
      </article>

      <aside
        aria-label={t("Table of contents")}
        className="sticky top-[calc(var(--header-height)+2rem)] hidden max-h-[calc(100svh-var(--header-height)-4rem)] min-w-0 overflow-y-auto overscroll-contain py-12 xl:block"
      >
        <h2 className="mb-4 text-xs font-semibold">{t("On this page")}</h2>
        {contents("On this page")}
        <div className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="text-xs leading-5 text-slate-400">
            {t("Find the right icon for your next idea.")}
          </p>
          <Link
            to={paths.icons}
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            {t("Browse icons ↗")}
          </Link>
          <Link
            to={paths.packages}
            className="mt-3 block text-xs text-slate-500 hover:text-primary"
          >
            {t("All packages ↗")}
          </Link>
        </div>
      </aside>
    </div>
  )
}

function GuideArticleSection({
  section,
  id,
  framework,
  element,
  articleKey,
}: {
  section: GuideSection
  id: string
  framework: GuideFramework
  element: VanillaElementMode
  articleKey: string
}) {
  const { t } = useLanguage()

  const content = (
    <>
      <div className="space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{t(paragraph)}</p>
        ))}
      </div>
      {section.preview && <GuidePreview type={section.preview} />}
      {section.bullets && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 marker:text-primary/60 dark:text-slate-400">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{t(bullet)}</li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t(section.title)}</caption>
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {section.table.headings.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-3 text-xs font-medium"
                  >
                    {t(heading)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {section.table.rows.map((row) => (
                <tr key={JSON.stringify(row)}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={cn(
                        "px-4 py-3 text-slate-500 dark:text-slate-400",
                        index === 0 && "font-mono text-xs"
                      )}
                    >
                      {t(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.examples?.map((example, index) =>
        example.install ? (
          <InstallCodeBlock
            key={articleKey + "/" + section.id + "/" + index}
            {...example.install}
            className="mt-5"
          />
        ) : (
          <CodeBlock
            key={articleKey + "/" + section.id + "/" + index}
            filename={example.filename}
            code={example.code}
            codeMessages={example.codeMessages}
            className="mt-5"
          />
        )
      )}
      {section.checkpoint && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <span className="mb-1 block text-xs font-semibold">
            {t("Check your result")}
          </span>
          {t(section.checkpoint)}
        </p>
      )}
      {section.note && (
        <p className="mt-5 rounded-r-lg border-l-2 border-primary/40 bg-primary/5 px-4 py-3 text-xs leading-6 text-slate-600 dark:text-slate-400">
          {t(section.note)}
        </p>
      )}
      {section.links?.map((link) => (
        <Link
          key={link.page + "/" + link.framework + "/" + link.element}
          to={guideHref(
            link.page,
            link.framework ?? framework,
            link.element ?? element
          )}
          className="mt-4 block w-fit rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t(link.label)} →
        </Link>
      ))}
    </>
  )
  return (
    <section aria-labelledby={id}>
      {section.optional ? (
        <details className="group rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            <Icon
              name="tabler:chevron-down"
              size={16}
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            />
            <h2
              id={id}
              className="min-w-0 flex-1 scroll-mt-6 text-base font-semibold tracking-tight"
            >
              {t(section.title)}
            </h2>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[0.625rem] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {t("Optional")}
            </span>
          </summary>
          <div className="mt-5">{content}</div>
        </details>
      ) : (
        <>
          <h2
            id={id}
            className="mb-4 scroll-mt-6 text-xl font-semibold tracking-tight"
          >
            {t(section.title)}
          </h2>
          {content}
        </>
      )}
    </section>
  )
}

function GuidePreview({
  type,
}: {
  type: NonNullable<GuideSection["preview"]>
}) {
  const { t } = useLanguage()

  return (
    <div
      aria-label={t("Icon preview")}
      className="mt-6 flex min-h-32 flex-wrap items-center justify-center gap-7 rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
    >
      {type === "color-styles" ? (
        <>
          <span className="grid justify-items-center gap-3">
            <Icon name="tabler:star" color="#7712f7" size={36} />
            <small lang="en-US">Outline</small>
            <code className="text-xs text-slate-500 dark:text-slate-400">
              tabler:star
            </code>
          </span>
          <span className="grid justify-items-center gap-3">
            <Icon name="tabler:star-filled" color="#7712f7" size={36} />
            <small lang="en-US">Filled</small>
            <code className="text-xs text-slate-500 dark:text-slate-400">
              tabler:star-filled
            </code>
          </span>
          <span className="grid justify-items-center gap-3">
            <Icon name="bootstrap:star-fill" color="#7712f7" size={36} />
            <small lang="en-US">Solid</small>
            <code className="text-xs text-slate-500 dark:text-slate-400">
              bootstrap:star-fill
            </code>
          </span>
        </>
      ) : type === "fill" ? (
        <>
          <span className="grid justify-items-center gap-3">
            <Icon name="tabler:star" size={36} strokeWidth={1.5} />
            <small className="text-xs text-slate-400">{t("Outline")}</small>
          </span>
          <span className="grid justify-items-center gap-3 text-primary">
            <Icon name="tabler:star-filled" size={36} />
            <small className="text-xs text-slate-400">{t("Filled")}</small>
          </span>
        </>
      ) : (
        (type === "color"
          ? ["#7712f7", "#2563eb", "#059669", "#e11d48"]
          : type === "sizing"
            ? [12, 16, 20, 24, 28]
            : [1, 1.5, 2, 2.5]
        ).map((value) => (
          <span key={value} className="grid justify-items-center gap-3">
            <span className="grid h-10 place-items-center">
              <Icon
                name="tabler:star"
                color={type === "color" ? String(value) : undefined}
                size={type === "sizing" ? Number(value) : 32}
                strokeWidth={type === "stroke-width" ? Number(value) : 1.5}
              />
            </span>
            <small className="font-mono text-[0.65rem] text-slate-400">
              {value}
              {type === "sizing" ? "px" : ""}
            </small>
          </span>
        ))
      )}
    </div>
  )
}
