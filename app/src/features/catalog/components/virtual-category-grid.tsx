import { useLanguage } from "../../../shared/i18n/language.ts"
import React from "react"
import type { CatalogCategory, CatalogIcon } from "../types.ts"

import { Icon } from "@icones/react"

const fallbackCardHeight = 116
const fallbackGridGap = 16
const fallbackHeadingGap = 12
const fallbackHeadingHeight = 48
const fallbackMinimumCardWidth = 104
const fallbackSectionGap = 48
const viewportOverscan = 320

export type VirtualIconCategory = {
  category: CatalogCategory
  icons: readonly CatalogIcon[]
}

export function VirtualCategoryGrid({
  categories,
  color,
  onSelect,
}: {
  categories: readonly VirtualIconCategory[]
  color: string
  onSelect: (icon: CatalogIcon) => void
}) {
  const { t, language } = useLanguage()
  const gridRef = React.useRef<HTMLDivElement>(null)
  const layout = useVirtualCategoryLayout(gridRef, categories)
  const measurements = React.useMemo<VirtualCategoryMeasurements>(
    () => ({
      cardHeight: layout.cardHeight,
      columnCount: layout.columnCount,
      gap: layout.gap,
      headingGap: layout.headingGap,
      headingHeight: layout.headingHeight,
      sectionGap: layout.sectionGap,
    }),
    [
      layout.cardHeight,
      layout.columnCount,
      layout.gap,
      layout.headingGap,
      layout.headingHeight,
      layout.sectionGap,
    ]
  )
  const { sections, totalHeight } = React.useMemo(
    () => createVirtualSections(categories, measurements),
    [categories, measurements]
  )
  const visibleSections = React.useMemo(() => {
    const start = layout.viewportStart - viewportOverscan
    const end = layout.viewportEnd + viewportOverscan

    return sections
      .filter(
        (section) => section.top + section.height >= start && section.top <= end
      )
      .map((section) => ({
        ...section,
        rows: section.rows.filter(
          (row) =>
            section.top + row.top + row.height >= start &&
            section.top + row.top <= end
        ),
      }))
  }, [sections, layout.viewportEnd, layout.viewportStart])
  const style = {
    "--virtual-grid-columns": layout.columnCount,
    height: totalHeight,
  } as React.CSSProperties

  return (
    <div ref={gridRef} className="virtual-category-grid" style={style}>
      {visibleSections.map((section) => (
        <section
          className="virtual-category-section"
          key={section.category.id}
          aria-labelledby={`category-${section.category.id}`}
          style={{ top: section.top, height: section.height }}
        >
          <div
            className="virtual-category-heading"
            id={`category-${section.category.id}`}
          >
            <h3>
              {section.category.category
                .split(" · ")
                .map((label) => t(label))
                .join(" · ")}
            </h3>
            <span>{section.iconCount.toLocaleString(language)}</span>
          </div>
          {section.rows.map((row) => (
            <div
              className="virtual-icon-row"
              key={row.key}
              style={{ transform: `translateY(${row.top}px)` }}
            >
              {row.icons.map((icon) => (
                <IconCard
                  color={color}
                  icon={icon}
                  key={icon.name}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function IconCard({
  color,
  icon,
  onSelect,
}: {
  color: string
  icon: CatalogIcon
  onSelect: (icon: CatalogIcon) => void
}) {
  const { t } = useLanguage()
  return (
    <button
      type="button"
      className="icon-card"
      aria-label={t("View {name} details", { name: icon.name })}
      onClick={() => onSelect(icon)}
    >
      <span className="icon-preview" style={{ color }}>
        <Icon
          name={icon.name}
          color={color}
          size={30}
          style={
            icon.prefix === "phosphor"
              ? ({
                  "--icones-stroke-width": "initial",
                } as React.CSSProperties)
              : undefined
          }
        />
      </span>
      <span className="icon-meta">
        <span className="icon-name">{icon.name}</span>
        <span className="icon-slug">{icon.slug}</span>
      </span>
    </button>
  )
}

type VirtualCategoryLayout = {
  cardHeight: number
  columnCount: number
  gap: number
  headingGap: number
  headingHeight: number
  sectionGap: number
  viewportEnd: number
  viewportStart: number
}

type VirtualCategoryMeasurements = Omit<
  VirtualCategoryLayout,
  "viewportEnd" | "viewportStart"
>

type VirtualSection = {
  category: CatalogCategory
  height: number
  iconCount: number
  top: number
  rows: IconRowItem[]
}

type IconRowItem = {
  height: number
  icons: readonly CatalogIcon[]
  key: string
  top: number
}

const initialLayout: VirtualCategoryLayout = {
  cardHeight: fallbackCardHeight,
  columnCount: 1,
  gap: fallbackGridGap,
  headingGap: fallbackHeadingGap,
  headingHeight: fallbackHeadingHeight,
  sectionGap: fallbackSectionGap,
  viewportEnd: 0,
  viewportStart: 0,
}

function createVirtualSections(
  categories: readonly VirtualIconCategory[],
  layout: VirtualCategoryMeasurements
) {
  const sections: VirtualSection[] = []
  let top = 0

  for (const { category, icons } of categories) {
    const rows: IconRowItem[] = []
    let rowTop = layout.headingHeight + layout.headingGap

    const rowCount = Math.ceil(icons.length / layout.columnCount)

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const start = rowIndex * layout.columnCount
      rows.push({
        height: layout.cardHeight,
        icons: icons.slice(start, start + layout.columnCount),
        key: `icons:${category.id}:${rowIndex}`,
        top: rowTop,
      })
      rowTop += layout.cardHeight

      if (rowIndex < rowCount - 1) {
        rowTop += layout.gap
      }
    }

    sections.push({
      category,
      iconCount: icons.length,
      top,
      height: rowTop,
      rows,
    })
    top += rowTop + layout.sectionGap
  }

  return {
    sections,
    totalHeight: Math.max(0, top - layout.sectionGap),
  }
}

function useVirtualCategoryLayout(
  gridRef: React.RefObject<HTMLDivElement | null>,
  categories: readonly VirtualIconCategory[]
) {
  const [layout, setLayout] = React.useState(initialLayout)

  React.useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const gridElement: HTMLDivElement = grid
    let animationFrame = 0
    let measurementsDirty = true
    let gridTop = 0
    let measurements: VirtualCategoryMeasurements = initialLayout

    function updateLayout() {
      animationFrame = 0
      if (measurementsDirty) {
        measurementsDirty = false
        const styles = window.getComputedStyle(gridElement)
        const gap = readPixelValue(styles.columnGap, fallbackGridGap)
        const minimumCardWidth = readPixelValue(
          styles.getPropertyValue("--icon-card-min-width"),
          fallbackMinimumCardWidth
        )
        gridTop = gridElement.getBoundingClientRect().top + window.scrollY
        measurements = {
          cardHeight: readPixelValue(
            styles.getPropertyValue("--icon-card-height"),
            fallbackCardHeight
          ),
          columnCount: Math.max(
            1,
            Math.floor(
              (gridElement.clientWidth + gap) / (minimumCardWidth + gap)
            )
          ),
          gap,
          headingGap: readPixelValue(
            styles.getPropertyValue("--category-heading-gap"),
            fallbackHeadingGap
          ),
          headingHeight: readPixelValue(
            styles.getPropertyValue("--category-heading-height"),
            fallbackHeadingHeight
          ),
          sectionGap: readPixelValue(
            styles.getPropertyValue("--category-section-gap"),
            fallbackSectionGap
          ),
        }
      }
      const nextLayout: VirtualCategoryLayout = {
        ...measurements,
        viewportEnd: window.scrollY + window.innerHeight - gridTop,
        viewportStart: window.scrollY - gridTop,
      }

      setLayout((current) =>
        layoutsEqual(current, nextLayout) ? current : nextLayout
      )
    }

    function scheduleLayoutUpdate() {
      if (!animationFrame)
        animationFrame = window.requestAnimationFrame(updateLayout)
    }
    function scheduleMeasurement() {
      measurementsDirty = true
      scheduleLayoutUpdate()
    }

    const resizeObserver = new ResizeObserver(scheduleMeasurement)
    resizeObserver.observe(gridElement)
    const catalog = gridElement.closest("#catalog")
    if (catalog) resizeObserver.observe(catalog)
    window.addEventListener("resize", scheduleMeasurement)
    window.addEventListener("scroll", scheduleLayoutUpdate, { passive: true })
    updateLayout()

    return () => {
      resizeObserver.disconnect()
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", scheduleMeasurement)
      window.removeEventListener("scroll", scheduleLayoutUpdate)
    }
  }, [categories, gridRef])

  return layout
}

function layoutsEqual(
  current: VirtualCategoryLayout,
  next: VirtualCategoryLayout
) {
  return (Object.keys(current) as Array<keyof VirtualCategoryLayout>).every(
    (key) => current[key] === next[key]
  )
}

function readPixelValue(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
