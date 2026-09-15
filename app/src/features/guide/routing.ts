import {
  guideFrameworks,
  type GuideFramework,
} from "../../shared/integrations/frameworks.ts"
import type { VanillaElementMode } from "../../shared/integrations/vanilla-example.ts"

export const sharedGuidePages = [
  { id: "rendering", title: "Rendering methods" },
  { id: "loading", title: "Vite and API loading" },
  { id: "prop-support", title: "Prop support" },
  { id: "collections", title: "Collection differences" },
] as const
export type SharedGuidePageId = (typeof sharedGuidePages)[number]["id"]
export function isSharedGuidePage(page: string): page is SharedGuidePageId {
  return sharedGuidePages.some((item) => item.id === page)
}

export const frameworkGuideGroups = [
  {
    title: "Framework",
    items: [
      { id: "overview", title: "Overview" },
      { id: "getting-started", title: "Getting started" },
    ],
  },
  {
    title: "Basics",
    items: [
      { id: "color", title: "Color" },
      { id: "sizing", title: "Sizing" },
      { id: "stroke-width", title: "Stroke Width" },
      { id: "fill", title: "Fill" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { id: "icon-config", title: "IconConfig" },
      { id: "typescript", title: "TypeScript" },
      { id: "accessibility", title: "Accessibility" },
      { id: "alternative", title: "Alternative" },
      { id: "global-styling", title: "Global Styling" },
    ],
  },
] as const
export const frameworkGuidePages = frameworkGuideGroups.flatMap((group) => [
  ...group.items,
])
export type FrameworkGuidePageId = (typeof frameworkGuidePages)[number]["id"]
export const guideGroups = [
  { title: "Rendering fundamentals", items: sharedGuidePages },
  ...frameworkGuideGroups,
] as const
export const guidePages = guideGroups.flatMap((group) => [...group.items])
export type GuidePageId = (typeof guidePages)[number]["id"]

export type GuideLocation =
  | {
      page: SharedGuidePageId
      framework?: undefined
      element?: undefined
    }
  | {
      page: FrameworkGuidePageId
      framework: GuideFramework
      element: VanillaElementMode
    }

/** Read old query-string bookmarks only; new navigation always uses guideHref. */
export function readGuideLocation(search: string): GuideLocation {
  const params = new URLSearchParams(search)
  const page =
    guidePages.find((item) => item.id === params.get("page"))?.id ?? "overview"
  const framework =
    guideFrameworks.find((item) => item.id === params.get("framework"))?.id ??
    "react"
  const element: VanillaElementMode =
    framework === "vanilla" && params.get("element") === "standard"
      ? "standard"
      : "web"
  return isSharedGuidePage(page) ? { page } : { page, framework, element }
}

export function guideHref(
  page: GuidePageId,
  framework: GuideFramework = "react",
  element: VanillaElementMode = "web"
) {
  if (isSharedGuidePage(page)) return `/guide/${page}`
  const track = framework === "vanilla" ? element + "/" : ""
  return `/guide/${framework}/${track}${page}`
}

/** Unknown topics, frameworks and element modes are real missing pages. */
export function readGuidePath(pathname: string): GuideLocation | undefined {
  const route = pathname.replace(/\/index\.html$/, "").replace(/\/$/, "")
  const parts = route.split("/")
  if (parts[0] !== "" || parts[1] !== "guide") return
  if (parts.length === 3 && isSharedGuidePage(parts[2]!))
    return { page: parts[2] }
  const framework = guideFrameworks.find(({ id }) => id === parts[2])?.id
  if (!framework) return
  const vanilla = framework === "vanilla"
  if (parts.length !== (vanilla ? 5 : 4)) return
  const element = vanilla ? parts[3] : "web"
  if (element !== "web" && element !== "standard") return
  const topic = parts[vanilla ? 4 : 3]
  // Old framework-specific rendering URLs remain readable until canonical navigation.
  if (topic === "rendering") return { page: "rendering" }
  const page = frameworkGuidePages.find(({ id }) => id === topic)?.id
  if (!page) return
  return { page, framework, element }
}

export const guideRoutes = [
  ...sharedGuidePages.map(({ id }) => guideHref(id)),
  ...guideFrameworks.flatMap(({ id }) =>
    (id === "vanilla"
      ? (["standard", "web"] as const)
      : (["web"] as const)
    ).flatMap((element) =>
      frameworkGuidePages.map(({ id: page }) => guideHref(page, id, element))
    )
  ),
]

/** Preserve section bookmarks when splitting the old single rendering article. */
export function renderingDestination(hash: string) {
  const section = hash.replace(/^#guide-rendering-/, "")
  const page: SharedGuidePageId = ["vite-modes", "api-types"].includes(section)
    ? "loading"
    : ["props", "source-weight", "limits"].includes(section)
      ? "prop-support"
      : section === "artwork"
        ? "collections"
        : "rendering"
  return {
    page,
    hash: hash.startsWith("#guide-rendering-")
      ? `#guide-${page}-${section}`
      : hash,
  }
}
