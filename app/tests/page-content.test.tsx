import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router"
import { JSDOM } from "jsdom"
import { ContentSection } from "../src/shared/ui/content-section.tsx"
import type { ContentSectionData } from "../src/shared/content/types.ts"
import { homeResources, homeWorkflow } from "../src/features/home/sections.ts"
import { packageRoles } from "../src/features/packages/sections.ts"
import { llmsUsage } from "../src/features/llms/sections.ts"
import { mcpAvailability } from "../src/features/mcp/sections.ts"
import { licenseFiles } from "../src/features/licenses/sections.ts"
import { LanguageProvider, translate } from "../src/shared/i18n/language.ts"
import { messages } from "../src/shared/i18n/locales/zh-CN.ts"
import { pageMetadata } from "../src/shared/routing/paths.ts"
import {
  getGuideArticle,
  guideFrameworks,
  guidePages,
  readGuidePath,
} from "../src/features/guide/content.ts"

const sections: ContentSectionData[] = [
  homeWorkflow,
  homeResources,
  packageRoles,
  llmsUsage,
  mcpAvailability,
  licenseFiles,
]

test("editorial sections have unique anchors, complete translations and valid destinations", () => {
  expect(new Set(sections.map((section) => section.id)).size).toBe(
    sections.length
  )
  for (const section of sections) {
    const prose = [section.title, section.description]
    expect(section.items.length).toBeGreaterThan(0)
    for (const item of section.items) {
      prose.push(item.title, item.description)
      if (!item.link) continue
      prose.push(item.link.label)
      const url = new URL(item.link.href, "https://icons.test")
      const guide = readGuidePath(url.pathname)
      expect(Object.hasOwn(pageMetadata, url.pathname) || !!guide).toBe(true)
      if (guide) {
        expect(guidePages.some((page) => page.id === guide.page)).toBe(true)
        expect(url.search).toBe("")
      }
    }
    for (const message of prose) {
      expect(messages[message], `Missing Chinese: ${message}`).toBeTruthy()
      expect(translate(messages, message)).not.toBe(message)
    }
  }
})

for (const language of ["en-US", "zh-CN"] as const) {
  test(`editorial sections render accessible headings and localized links in ${language}`, () => {
    const basename = language === "zh-CN" ? "/zh-CN" : ""
    const dictionary = language === "zh-CN" ? messages : {}
    for (const section of sections) {
      const dom = new JSDOM(
        renderToStaticMarkup(
          <MemoryRouter
            basename={basename || "/"}
            initialEntries={[basename + "/"]}
          >
            <LanguageProvider value={{ language, messages: dictionary }}>
              <ContentSection content={section} />
            </LanguageProvider>
          </MemoryRouter>
        )
      )
      try {
        const document = dom.window.document
        expect(
          document.querySelector("section")?.getAttribute("aria-labelledby")
        ).toBe(section.id + "-title")
        expect(
          document.getElementById(section.id + "-title")?.textContent
        ).toBe(translate(dictionary, section.title))
        expect(document.querySelectorAll("h3")).toHaveLength(
          section.items.length
        )
        for (const link of document.querySelectorAll("a")) {
          expect(link.getAttribute("href")).toStartWith(basename + "/")
          expect(link.textContent).toBeTruthy()
        }
      } finally {
        dom.window.close()
      }
    }
  })
}

test("all framework guides target the reader's application rather than the website repository", () => {
  const maintainerOnly =
    /@workspace:\*|\.\.\/packages\/icons|packages\/icons\/|bun run build:packages|this workspace|this monorepo|this repository/iu
  for (const { id } of guideFrameworks) {
    for (const mode of id === "vanilla"
      ? (["standard", "web"] as const)
      : (["web"] as const)) {
      for (const { id: page } of guidePages) {
        for (const development of [true, false]) {
          const article = getGuideArticle(page, id, development, mode)
          const text = JSON.stringify(article)
          expect(text).not.toMatch(maintainerOnly)
          expect(
            JSON.stringify(
              article.sections.map(({ examples }) =>
                examples?.map(({ code }) => code)
              )
            )
          ).toBe(
            JSON.stringify(
              getGuideArticle(page, id, !development, mode).sections.map(
                ({ examples }) => examples?.map(({ code }) => code)
              )
            )
          )
        }
      }
    }
  }
})

test("Guide distinguishes data loading, application paths and actual appearance capabilities", () => {
  expect(JSON.stringify(getGuideArticle("getting-started", "react"))).toContain(
    "icons/tabler/data/star.json"
  )
  expect(JSON.stringify(getGuideArticle("stroke-width", "react"))).toContain(
    "Phosphor Fill uses filled shapes that keep their geometry"
  )
  expect(JSON.stringify(getGuideArticle("icon-config", "react"))).toContain(
    "defaultSize, sizeValues, strokeWidth and absoluteStrokeWidth accept shared values or maps keyed by set"
  )
  expect(JSON.stringify(getGuideArticle("icon-config", "react"))).toContain(
    "To route sets independently, pass a per-set map to api"
  )
})
