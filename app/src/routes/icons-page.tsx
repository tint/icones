import { useLanguage } from "../shared/i18n/language.ts"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Icon, IconConfig } from "@icones/react"
import { Select } from "../shared/ui/select.tsx"
import { Chevron } from "../shared/ui/chevron.tsx"
import { Button } from "../shared/ui/button.tsx"
import { IconDetail } from "../features/catalog/components/icon-detail.tsx"
import { VirtualCategoryGrid } from "../features/catalog/components/virtual-category-grid.tsx"
import { useCatalog } from "../features/catalog/use-catalog.ts"
import { useCatalogFilters } from "../features/catalog/state.ts"
import {
  publicSets,
  categoryLabel,
  catalogVariantLabel,
  groupIcons,
  mergeCatalogSets,
  type CatalogIcon,
} from "../features/catalog/types.ts"
import { previewIconApi } from "../shared/icons/config.ts"

const selectClass =
  "flex h-10 max-w-full items-center gap-2 rounded-full bg-slate-100/80 px-3 text-sm whitespace-nowrap dark:bg-slate-800"

export default function IconsPage() {
  const { t, language } = useLanguage()

  const { set, category, query, variant, update } = useCatalogFilters()
  const [revision, setRevision] = useState(0)
  const [selectedIcon, setSelectedIcon] = useState<CatalogIcon>()
  const initialAnchorRestored = useRef(false)
  const catalogRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    const section = catalogRef.current
    if (!toolbar || !section) return
    const measure = () => {
      const height = toolbar.offsetHeight
      if (height > 0)
        section.style.setProperty("--catalog-toolbar-height", height + "px")
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [])
  const hasFlagVariants = set === "flag"
  const catalog = useCatalog(
    {
      set,
      category,
      variant,
      q: query,
    },
    revision
  )
  const groups = useMemo(
    () => groupIcons(catalog.page?.icons ?? []),
    [catalog.page]
  )
  useEffect(() => {
    if (initialAnchorRestored.current || !catalog.page) return
    initialAnchorRestored.current = true
    if (window.location.hash === "#catalog")
      document
        .getElementById("catalog")
        ?.scrollIntoView({ behavior: "instant", block: "start" })
  }, [catalog.page])
  useEffect(() => {
    const element = document.getElementById("catalog")
    if (element && element.getBoundingClientRect().top < 0)
      element.scrollIntoView({ behavior: "instant", block: "start" })
  }, [set, category, query, variant])
  const sets = mergeCatalogSets(catalog.sets)
  const setOptions: { value: string; label: string }[] = publicSets.map(
    (id) => ({
      value: id,
      label: `${categoryLabel(id)} (${(sets.find((facet) => facet.id === id)?.count ?? 0).toLocaleString(language)})`,
    })
  )
  const categoryOptions = [
    { value: "", label: t("All categories") },
    ...catalog.categories.map(({ id, count }) => ({
      value: id,
      label: `${t(categoryLabel(id))} (${count.toLocaleString(language)})`,
    })),
    ...(category && !catalog.categories.some((item) => item.id === category)
      ? [{ value: category, label: t(categoryLabel(category)) }]
      : []),
  ]
  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Icons")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t(
            "Find an icon by name or keyword, choose a style, then open it to preview and export SVG, code or original JSON."
          )}
        </p>
      </div>
      <section
        ref={catalogRef}
        id="catalog"
        aria-label={t("Icon catalog")}
        className="min-h-svh"
      >
        <div
          ref={toolbarRef}
          className="catalog-toolbar sticky top-0 z-20 border-y border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
        >
          <div className="mx-auto flex min-h-18 w-full max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
            <Select
              aria-label={t("Icon set")}
              value={set}
              options={setOptions}
              className={selectClass}
              onValueChange={(value) =>
                value &&
                update({
                  set: value,
                  category: "",
                  variant: value === "flag" ? "1x1" : "outline",
                })
              }
              renderValue={(option) => (
                <>
                  {option?.label}
                  <Chevron direction="down" className="size-4" />
                </>
              )}
            />
            {!hasFlagVariants && (
              <Select
                aria-label={t("Icon category")}
                align="end"
                value={category}
                options={categoryOptions}
                className={selectClass}
                onValueChange={(value) => update({ category: value ?? "" })}
                renderValue={(option) => (
                  <>
                    <span className="max-w-44 truncate">{option?.label}</span>
                    <Chevron direction="down" className="size-4" />
                  </>
                )}
              />
            )}
            <label className="order-last flex h-10 min-w-0 flex-1 basis-full items-center gap-2 sm:order-none sm:basis-40">
              <span className="sr-only">{t("Search icons")}</span>
              <Icon
                name="Search01"
                size={20}
                className="shrink-0 text-slate-400"
              />
              <input
                aria-label={t("Search icons")}
                type="search"
                value={query}
                onChange={(event) => update({ query: event.target.value })}
                placeholder={t("Search by name, slug, or keyword…")}
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              {query && (
                <Button
                  aria-label={t("Clear search")}
                  onClick={() => update({ query: "" })}
                >
                  <Icon name="tabler:x" size={16} />
                </Button>
              )}
            </label>
            <Button
              aria-label={t("Refresh catalog")}
              onClick={() => setRevision((value) => value + 1)}
            >
              <Icon name="tabler:refresh" size={20} />
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-6 py-9">
          <div className="mb-9 flex flex-wrap items-center gap-5">
            {hasFlagVariants ? (
              <div
                className="flex gap-1"
                role="group"
                aria-label={t("Flag variant")}
              >
                {catalog.variants.map(({ id: value }) => (
                  <Button
                    lang="en-US"
                    className="rounded-full aria-pressed:bg-slate-100 dark:aria-pressed:bg-slate-800"
                    key={value}
                    aria-pressed={variant === value}
                    onClick={() => update({ variant: value, category: "" })}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            ) : catalog.variants.length > 1 ? (
              <div
                className="flex gap-1"
                role="group"
                aria-label={t("Icon style")}
              >
                {catalog.variants.map(({ id: value, alias }) => (
                  <Button
                    lang="en-US"
                    className="rounded-full aria-pressed:bg-slate-100 dark:aria-pressed:bg-slate-800"
                    key={value}
                    aria-pressed={variant === value}
                    onClick={() => update({ variant: value, category: "" })}
                  >
                    {catalogVariantLabel(value, alias)}
                  </Button>
                ))}
              </div>
            ) : null}
            <span
              className="ml-auto text-sm text-slate-500 dark:text-slate-400"
              role="status"
            >
              {catalog.loading
                ? t("Loading catalog…")
                : t("{count} icons", {
                    count: (catalog.page?.total ?? 0).toLocaleString(language),
                  })}
            </span>
          </div>
          {catalog.error && (
            <p role="alert" className="py-12 text-center">
              {t("Unable to load the icon catalog. Please retry.")}
              <Button onClick={() => setRevision((value) => value + 1)}>
                {t("Retry")}
              </Button>
            </p>
          )}
          {catalog.loading && (
            <div
              className="h-72 animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-900"
              aria-label={t("Loading icons")}
            />
          )}
          {!catalog.loading && !catalog.error && !groups.length && (
            <div className="py-20 text-center">
              <h2 className="text-xl font-semibold">
                {t("No matching icons")}
              </h2>
              <p className="mt-3 text-slate-500">
                {t(
                  "Try a shorter keyword, another style or a different collection. Search uses the original icon names and keywords."
                )}
              </p>
            </div>
          )}
          <IconConfig api={previewIconApi} strokeWidth={1.5}>
            <VirtualCategoryGrid
              categories={groups}
              color="var(--catalog-icon-color)"
              onSelect={setSelectedIcon}
            />
          </IconConfig>
        </div>
      </section>
      {selectedIcon && (
        <IconDetail
          icon={selectedIcon}
          key={selectedIcon.name}
          onClose={() => setSelectedIcon(undefined)}
        />
      )}
    </>
  )
}
