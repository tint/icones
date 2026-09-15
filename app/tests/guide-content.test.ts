import { expect, test } from "bun:test"
import { createRequire } from "node:module"
import path from "node:path"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import { JSDOM } from "jsdom"
import { runInNewContext } from "node:vm"
import { localizeExampleCode } from "../src/shared/code/code-example.ts"
import { translate } from "../src/shared/i18n/language.ts"
import { localeMessages } from "../src/shared/i18n/locale-messages.server.ts"
import { elementDataToIcon } from "@icones/core/svg-data"
import { createIconSymbolDocument } from "@icones/vite/tooling/symbol"
import { registerStatic } from "@icones/core/runtime"
import {
  createIconConfig,
  createIconController,
  defineIconElement,
  bindIcons,
  type IconScopeOptions,
  type IconScope,
  createIconStore,
  type IconStore,
  type IconStoreOptions,
  type IconApiOptions,
  type Data,
  type ElementData,
  renderIcon,
} from "@icones/vanilla"
import {
  getGuideArticle,
  guideFrameworks,
  guideHref,
  readGuidePath,
  guidePages,
  readGuideLocation,
} from "../src/features/guide/content.ts"

import {
  sharedGuidePages,
  frameworkGuidePages,
  isSharedGuidePage,
  guideRoutes,
  renderingDestination,
} from "../src/features/guide/routing.ts"

const sharedSections = () =>
  sharedGuidePages.flatMap(({ id }) => getGuideArticle(id).sections)

const guideVariants = guideFrameworks.flatMap((framework) =>
  (framework.id === "vanilla"
    ? (["standard", "web"] as const)
    : (["web"] as const)
  ).map((element) => ({ id: framework.id, element }))
)

test("every authored Guide code comment and accessible label has an explicit translation", () => {
  const t = (message: string) => translate(localeMessages["zh-CN"], message)
  for (const framework of guideVariants) {
    for (const page of guidePages) {
      const article = getGuideArticle(
        page.id,
        framework.id,
        false,
        framework.element
      )
      for (const section of article.sections)
        for (const example of section.examples ?? []) {
          const fragments = example.codeMessages ?? []
          for (const line of example.code.split("\n")) {
            if (line.trimStart().startsWith("//"))
              expect(fragments).toContain(line.trim())
          }
          if (example.code.includes('"Completed"'))
            expect(fragments).toContain('"Completed"')
          for (const fragment of fragments) {
            expect(example.code).toContain(fragment)
            expect(t(fragment)).not.toBe(fragment)
          }
          expect(
            localizeExampleCode(example, (message) => translate({}, message))
          ).toBe(example.code)
          const localized = localizeExampleCode(example, t)
          // No technical code changes: removing only the annotated prose leaves identical bytes.
          const strip = (code: string, translated: boolean) =>
            fragments.reduce(
              (value, fragment) =>
                value.replaceAll(translated ? t(fragment) : fragment, ""),
              code
            )
          expect(strip(localized, true)).toBe(strip(example.code, false))
          expect(example.code).not.toMatch(/\biconify\(/)
        }
    }
  }
})

test("unannotated examples, protocol payloads and icon data are never translated", () => {
  const code =
    'const name = "Completed";\n// Keep your existing framework plugin here.\nconst url = "https://icons.example.com/icons"'
  expect(
    localizeExampleCode({ code }, (message) =>
      translate(localeMessages["zh-CN"], message)
    )
  ).toBe(code)
})

test("Vue store instructions use Vue bindings in both languages", () => {
  const example = getGuideArticle("icon-config", "vue", false).sections.find(
    (section) => section.id === "stores-and-ssr"
  )!.examples![0]!
  const chinese = localizeExampleCode(example, (message) =>
    translate(localeMessages["zh-CN"], message)
  )
  for (const code of [example.code, chinese]) {
    expect(code).toContain('<IconConfig :store="store">')
    expect(code).not.toContain("<IconConfig store={store}>")
  }
})

test("overview documents one property per row in every adapter", () => {
  for (const framework of guideVariants) {
    const rows = getGuideArticle(
      "overview",
      framework.id,
      undefined,
      framework.element
    ).sections.find((section) => section.id === "shared-api")!.table!.rows
    expect(rows.every((row) => !row[0]!.includes(" / "))).toBe(true)
    if (framework.id !== "vanilla") {
      expect(rows.map((row) => row[0])).toEqual([
        "name",
        "data",
        "altName",
        "altData",
        "showAlt",
        "size",
        "color",
        "strokeWidth",
        "rotate",
      ])
    }
  }
})

test("alternative guides explain paired sources, priority and conflict errors", () => {
  for (const framework of guideVariants) {
    const article = getGuideArticle(
      "alternative",
      framework.id,
      undefined,
      framework.element
    )
    const section = article.sections.find(
      (section) => section.id === "inline-data"
    )!
    expect(section.paragraphs.join(" ")).toContain("console.error")
    expect(section.paragraphs.join(" ")).toContain(
      "altData takes priority over altName"
    )
    expect(section.examples![0]!.code).toContain(
      framework.id === "vue" ? ':alt-data="alternative"' : "altData"
    )
    expect(section.examples![0]!.code).not.toContain("altName=")
  }
})

test("color explains SVG paint behavior and compares real Outline, Filled and Solid artwork", () => {
  for (const framework of guideVariants) {
    const section = getGuideArticle(
      "color",
      framework.id,
      undefined,
      framework.element
    ).sections.find((section) => section.id === "color-by-style")!
    expect(section.preview).toBe("color-styles")
    expect(section.table!.rows.map((row) => row[0])).toEqual([
      "Outline",
      "Filled",
      "Solid",
    ])
    expect(JSON.stringify(section)).toContain("currentColor")
    expect(JSON.stringify(section)).toContain("tabler:star-filled")
    expect(JSON.stringify(section)).toContain("bootstrap:star-fill")
    expect(section.note).toContain("bootstrap:star")
    expect(section.note).toContain("phosphor:star uses a currentColor stroke")
    expect(section.paragraphs.join(" ")).toContain(
      "does not turn an outline drawing"
    )
  }
})

test("rendering guide covers collection support, source priority and both Vite modes", () => {
  for (const framework of guideVariants) {
    const article = getGuideArticle(
      "rendering",
      framework.id,
      false,
      framework.element
    )
    const sections = Object.fromEntries(
      sharedSections().map((section) => [section.id, section])
    )
    expect(article.sections.slice(0, 3).map((section) => section.id)).toEqual([
      "rendering-paths",
      "data-formats",
      "source-resolution",
    ])
    expect(sections.artwork!.table!.rows.map((row) => row[0])).toEqual([
      "Tabler",
      "Lucide",
      "Huge",
      "Phosphor",
      "Bootstrap",
      "Ant Design",
      "Brand",
      "Flag",
    ])
    expect(sections["vite-modes"]!.table!.rows.map((row) => row[0])).toEqual([
      'mode: "svg"',
      'mode: "symbol"',
      'api: { type: "fetch" }',
      'api: { type: "symbol" }',
    ])
    expect(
      sections["api-types"]!.table!.rows.map((row) => row.slice(0, 2))
    ).toEqual([
      ["svg", "fetch"],
      ["svg", "symbol"],
      ["symbol", "fetch"],
      ["symbol", "symbol"],
    ])
    for (const { id } of sharedGuidePages) {
      expect(getGuideArticle(id, framework.id, false, framework.element)).toBe(
        getGuideArticle(id)
      )
      expect(JSON.stringify(getGuideArticle(id))).not.toMatch(
        /@icones\/(react|vue|svelte|solidjs|astro|vanilla)|<Icon\b/
      )
    }
    expect(sections["api-types"]!.note).toContain(
      "not when the browser successfully loads"
    )
    expect(sections.props!.table!.headings).toEqual([
      "Props",
      "Data · inline SVG",
      "Symbol · external use",
    ])
    const propRows = Object.fromEntries(
      sections.props!.table!.rows.map(([prop, ...cells]) => [prop, cells])
    )
    expect(propRows.strokeWidth![1]).toContain("--icones-stroke-width")
    expect(propRows.fill![1]).toContain('fill="none"')
    expect(propRows["CSS path selectors"]![1]).toStartWith("No.")
    const config = sections["vite-modes"]!.examples![0]!
    expect(config.filename).toBe("vite.config.ts")
    expect(config.code).toContain('mode: "svg"')
    expect(config.code).toContain("emitData: false")
    expect(config.code).toContain("fallbackToApi: false")
    expect(config.code).not.toContain('mode: "inline"')
    const resolution = JSON.stringify(sections["source-resolution"])
    for (const text of [
      "altName even when showAlt starts as false",
      "dynamic value happens to match",
      "explicit per-icon loader bypasses",
      "does not stop Vite from collecting",
    ])
      expect(resolution).toContain(text)
    expect(sections.props!.note).toContain(
      "Anonymous data and altData use default"
    )
    expect(JSON.stringify(sections.props)).toContain("later CSS resizing")
    expect(JSON.stringify(sections["api-types"])).toContain(
      "Direct data / altData and data resolved from sources always render inline"
    )
  }
})

test("shared chapter examples run without a framework and legacy anchors choose the right page", async () => {
  const evaluate = (
    code: string,
    dependencies: Record<string, unknown> = {}
  ) => {
    const exports: Record<string, any> = {}
    runInNewContext(
      ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        exports,
        require: (name: string) => dependencies[name],
      }
    )
    return exports
  }
  const formats = getGuideArticle("rendering").sections.find(
    (section) => section.id === "data-formats"
  )!
  const tuple = evaluate(formats.examples![0]!.code).arrowData as ElementData
  const object = evaluate(formats.examples![1]!.code).arrowData as Data
  const selection = getGuideArticle("rendering").sections.find(
    (section) => section.id === "source-resolution"
  )!
  const options = evaluate(selection.examples![0]!.code, {
    "./icon-data.js": { arrowData: tuple },
  }).iconOptions
  const controller = createIconController(
    options,
    createIconConfig({ api: false })
  )
  try {
    const state = await controller.load()
    expect(state.data).toBe(tuple)
    expect(state.href).toBeUndefined()
    expect(renderIcon(state, options).body).toContain("M20 12H4")
    expect(
      renderIcon({ status: "loaded", data: object }, { data: object }).body
    ).toContain("M20 12H4")
  } finally {
    controller.destroy()
  }
  const endpoints = getGuideArticle("loading").sections.find(
    (section) => section.id === "api-endpoints"
  )!
  const fetch = evaluate(endpoints.examples![0]!.code).config.api
  const symbol = evaluate(endpoints.examples![1]!.code).config.api
  expect(fetch.url("tabler:star")).toBe("/icon-data/tabler%3Astar.json")
  expect(symbol.url("tabler:star")).toBe("/icon-symbols/tabler%3Astar.svg#icon")
  expect(createIconStore({ api: symbol }).getState("tabler:star").viewBox).toBe(
    "0 0 24 24"
  )
  for (const [section, page] of [
    ["vite-modes", "loading"],
    ["api-types", "loading"],
    ["props", "prop-support"],
    ["source-weight", "prop-support"],
    ["limits", "prop-support"],
    ["artwork", "collections"],
    ["source-resolution", "rendering"],
  ] as const) {
    expect(renderingDestination("#guide-rendering-" + section)).toEqual({
      page,
      hash: "#guide-" + page + "-" + section,
    })
  }
})

test("documented mode/API combinations match compiled and runtime controller resolution", async () => {
  const combinations = getGuideArticle("loading").sections.find(
    (section) => section.id === "api-types"
  )!.table!.rows
  const data = {
    width: 24,
    height: 24,
    body: '<path fill="none" stroke="currentColor" stroke-width="2" d="M4 12h16"/>',
  }
  for (const [mode, type, compiledResult, runtimeResult] of combinations) {
    const name = `guide-rendering:compiled-${mode}-${type}`
    const remote = `guide-rendering:runtime-${mode}-${type}`
    const requests: string[] = []
    registerStatic(
      name,
      mode === "svg"
        ? { data }
        : { href: `/assets/${mode}-${type}.svg#icon`, viewBox: "0 0 24 24" }
    )
    const scope = createIconConfig({
      api:
        type === "symbol"
          ? { type, baseUrl: "/icons" }
          : {
              type: "fetch",
              baseUrl: "/icons",
              fetch: (async (url) => {
                requests.push(String(url))
                return new Response(JSON.stringify(data))
              }) as typeof fetch,
            },
    })
    for (const [selected, documented] of [
      [name, compiledResult],
      [remote, runtimeResult],
    ]) {
      const options = {
        name: selected!,
        size: 48,
        color: "purple",
        strokeWidth: 2,
        absoluteStrokeWidth: true,
        rotate: 1,
        hFlip: true,
        "aria-label": "Preview",
      }
      const controller = createIconController(options, scope)
      try {
        const state = await controller.load()
        const rendered = renderIcon(state, options, scope.appearance)
        expect(Boolean(state.data)).toBe(documented!.startsWith("Data:"))
        expect(Boolean(state.href)).toBe(documented!.startsWith("Symbol:"))
        expect(rendered.body.includes("<use ")).toBe(Boolean(state.href))
        expect(rendered.body).toContain("transform=")
        expect(rendered.attributes.width).toBe(48)
        expect(rendered.attributes.height).toBe(48)
        expect(rendered.attributes.color).toBe("purple")
        expect(rendered.attributes["aria-label"]).toBe("Preview")
        expect(rendered.style["--icones-stroke-width"]).toBe(1)
        if (selected === name) expect(requests).toHaveLength(0)
      } finally {
        controller.destroy()
      }
    }
    expect(requests).toEqual(
      type === "fetch"
        ? [`/icons/guide-rendering.json?icons=runtime-${mode}-${type}`]
        : []
    )
  }
})

test("direct and local data stay inline with symbol or disabled APIs, and altData can replace a symbol", async () => {
  const data = {
    width: 24,
    height: 24,
    body: '<circle cx="12" cy="12" r="8" fill="currentColor"/>',
  }
  const name = "guide-rendering:primary-symbol"
  registerStatic(name, {
    href: "/assets/primary.svg#icon",
    viewBox: "0 0 24 24",
  })
  for (const api of [
    false,
    { type: "symbol" as const, baseUrl: "/icons" },
  ] as const) {
    const scope = createIconConfig({
      api,
      sources: { "guide-rendering:local": data },
    })
    const controller = createIconController({ name, altData: data }, scope)
    try {
      expect((await controller.load()).href).toBe("/assets/primary.svg#icon")
      controller.update({ name, altData: data, showAlt: true })
      expect((await controller.load()).data).toBe(data)
      expect(controller.getState().href).toBeUndefined()
      controller.update({ data })
      expect((await controller.load()).data).toBe(data)
      controller.update({ name: "guide-rendering:local" })
      expect((await controller.load()).data).toBe(data)
      expect(scope.store.snapshot()).toEqual({ "guide-rendering:local": data })
    } finally {
      controller.destroy()
    }
  }
})

test("rendering prose, tables and contextual links have Chinese translations", () => {
  const dictionary = localeMessages["zh-CN"]
  const check = (text: string) =>
    expect(translate(dictionary, text)).toMatch(/[\u3400-\u9fff]/u)
  for (const framework of guideVariants) {
    const article = getGuideArticle(
      "rendering",
      framework.id,
      false,
      framework.element
    )
    for (const { id } of sharedGuidePages) {
      check(getGuideArticle(id).title)
      check(getGuideArticle(id).description)
    }
    for (const section of sharedSections()) {
      check(section.title)
      section.paragraphs.forEach(check)
      section.bullets?.forEach(check)
      if (section.note) check(section.note)
      if (section.checkpoint) check(section.checkpoint)
      section.links?.forEach((link) => check(link.label))
      for (const heading of section.table?.headings ?? [])
        if (!heading.startsWith("mode:")) check(heading)
      for (const row of section.table?.rows ?? [])
        row.forEach((cell, index) => {
          // API identifiers, numbers and collection names remain untranslated.
          if (
            index === 0 &&
            ["artwork", "props", "source-weight", "vite-modes"].includes(
              section.id
            )
          )
            return
          if (section.id === "api-types" && index < 2) return
          if (/^\d+(\.\d+)?$/.test(cell) || cell === "data / altData") return
          check(cell)
        })
    }
    for (const page of [
      "overview",
      "getting-started",
      "color",
      "stroke-width",
      "fill",
    ] as const) {
      const sections = getGuideArticle(
        page,
        framework.id,
        false,
        framework.element
      ).sections
      const links = sections
        .flatMap((section) => section.links ?? [])
        .filter((link) => isSharedGuidePage(link.page))
      expect(links.length).toBeGreaterThan(0)
      links.forEach((link) => check(link.label))
    }
  }
})

test("Phosphor guide only describes the two gallery styles and their actual paint", async () => {
  const article = getGuideArticle("collections")
  const phosphor = article.sections
    .find((section) => section.id === "artwork")!
    .table!.rows.find((row) => row[0] === "Phosphor")!
  expect(phosphor.join(" ")).toContain("Regular and Fill")
  const weights = getGuideArticle("prop-support").sections.find(
    (section) => section.id === "source-weight"
  )!
  expect(weights.table).toBeUndefined()
  expect(weights.examples![0]!.code).toContain('"name": "phosphor:star"')
  for (const page of ["collections", "prop-support", "stroke-width"] as const) {
    const text = JSON.stringify(getGuideArticle(page, "react"))
    expect(text).not.toMatch(/star-(thin|light|bold)|thin\/light|Duotone/)
  }
  const regular = JSON.parse(
    await readFile(
      new URL("../../packages/icons/phosphor/data/star.json", import.meta.url),
      "utf8"
    )
  ) as ElementData
  const fill = JSON.parse(
    await readFile(
      new URL(
        "../../packages/icons/phosphor/data/star-fill.json",
        import.meta.url
      ),
      "utf8"
    )
  ) as ElementData
  expect(elementDataToIcon(regular).width).toBe(256)
  expect(elementDataToIcon(regular).body).toContain('stroke-width="16"')
  const defaults = renderIcon(
    { status: "loaded", data: regular },
    { name: "phosphor:star", size: 24 }
  )
  expect((Number(defaults.attributes["stroke-width"]) * 24) / 256).toBe(1.5)
  const custom = renderIcon(
    { status: "loaded", data: regular },
    { name: "phosphor:star", size: 24, strokeWidth: 2 }
  )
  expect((Number(custom.attributes["stroke-width"]) * 24) / 256).toBe(2)
  expect(defaults.body).toContain("var(--icones-stroke-width,")
  expect(elementDataToIcon(fill).body).toContain('fill="currentColor"')
  expect(elementDataToIcon(fill).body).not.toContain('stroke="currentColor"')
})

test("removed introduction topics are absent from routes and guide entry defaults to overview", () => {
  expect(
    guidePages.some(({ id }) => ["what-is-icones", "installation"].includes(id))
  ).toBe(false)
  for (const framework of guideVariants) {
    for (const removed of ["what-is-icones", "installation"]) {
      const track = framework.id === "vanilla" ? framework.element + "/" : ""
      expect(
        readGuidePath("/guide/" + framework.id + "/" + track + removed)
      ).toBeUndefined()
      expect(
        readGuideLocation("?page=" + removed + "&framework=" + framework.id)
          .page
      ).toBe("overview")
    }
  }
})

test("documented custom tuple limits match current fill and opacity behavior", () => {
  const data: ElementData = [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["rect", { width: 20, height: 20, opacity: 0.5 }],
  ]
  const inline = renderIcon({ status: "loaded", data }, { data, fill: "red" })
  const symbol = createIconSymbolDocument(data)
  expect(inline.body).toContain('fill="red"')
  expect(symbol).toContain('fill="none"')
  expect(symbol).not.toContain('fill="red"')
  expect(inline.body.indexOf("<rect")).toBeLessThan(
    inline.body.indexOf("<circle")
  )
  expect(symbol.indexOf("<circle")).toBeLessThan(symbol.indexOf("<rect"))
  const limits = getGuideArticle("prop-support").sections.find(
    (section) => section.id === "limits"
  )!
  for (const title of [
    "Custom tuples without fill",
    "Separate top-level tuples with opacity",
  ])
    expect(limits.table!.rows.map((row) => row[0])).toContain(title)
})

test("guide URLs round-trip every topic and framework, with safe defaults", () => {
  expect(readGuideLocation("?page=missing&framework=missing")).toEqual({
    page: "overview",
    framework: "react",
    element: "web",
  })
  expect(guideHref("overview", "react")).toBe("/guide/react/overview")
  for (const page of guidePages) {
    for (const framework of guideVariants) {
      expect(
        readGuidePath(
          new URL(
            guideHref(page.id, framework.id, framework.element),
            "https://icons.test"
          ).pathname
        )
      ).toEqual(
        isSharedGuidePage(page.id)
          ? { page: page.id }
          : {
              page: page.id,
              framework: framework.id,
              element: framework.element,
            }
      )
    }
  }
})

test("independent guide routes validate full paths and support directory-index hosts", () => {
  for (const suffix of ["", "/", "/index.html"]) {
    expect(readGuidePath("/guide/svelte/stroke-width" + suffix)).toEqual({
      page: "stroke-width",
      framework: "svelte",
      element: "web",
    })
    expect(readGuidePath("/guide/vanilla/standard/color" + suffix)).toEqual({
      page: "color",
      framework: "vanilla",
      element: "standard",
    })
  }
  for (const path of [
    "/guide",
    "/guide/color",
    "/guide/unknown/color",
    "/guide/react/missing",
    "/guide/react/web/color",
    "/guide/vanilla/color",
    "/guide/vanilla/missing/color",
    "/guide/svelte/color/extra",
    "/guide//react/color",
    "/other/react/color",
  ])
    expect(readGuidePath(path), path).toBeUndefined()
})

test("every guide topic has unique sections and only IconConfig teaches configuration wrappers", () => {
  expect(guidePages).toHaveLength(15)
  expect(frameworkGuidePages).toHaveLength(11)
  expect(guideRoutes).toHaveLength(81)
  expect(guideFrameworks).toHaveLength(6)
  for (const page of guidePages) {
    for (const framework of guideVariants) {
      const article = getGuideArticle(
        page.id,
        framework.id,
        undefined,
        framework.element
      )
      expect(article.title).not.toBe("")
      expect(article.description).not.toBe("")
      expect(article.sections.length).toBeGreaterThanOrEqual(3)
      expect(new Set(article.sections.map((section) => section.id)).size).toBe(
        article.sections.length
      )
      for (const section of article.sections) {
        expect(section.paragraphs.length).toBeGreaterThan(0)
        for (const example of section.examples ?? []) {
          if (page.id !== "icon-config")
            expect(example.code).not.toContain("IconConfig")
          expect(example.code).not.toContain("export function")
        }
      }
    }
  }
  const astro = getGuideArticle("getting-started", "astro")
  expect(astro.sections[1]!.examples![0]!.filename).toBe("astro.config.mjs")
  expect(astro.sections[1]!.examples![0]!.code).toContain("astro/config")
})

test("Vanilla paths round-trip safely and never mix HTML implementations", () => {
  expect(readGuideLocation("?framework=vanilla&element=invalid").element).toBe(
    "web"
  )
  expect(readGuideLocation("?framework=react&element=standard").element).toBe(
    "web"
  )
  expect(guideHref("color", "react", "standard")).toBe("/guide/react/color")
  for (const element of ["standard", "web"] as const) {
    for (const page of guidePages) {
      const article = getGuideArticle(page.id, "vanilla", undefined, element)
      const content = JSON.stringify(article)
      if (element === "standard") {
        expect(content).not.toContain("icones-icon")
        expect(content).not.toContain("web-element")
        expect(content).not.toContain("defineIconElement")
        expect(content).not.toContain("toolbarIcon.scope")
      } else {
        expect(content).not.toContain("standard-element")
        expect(content).not.toContain("bindIcons")
        expect(content).not.toContain("icon-name")
        expect(content).not.toContain("attrPrefix")
      }
    }
    const overview = getGuideArticle("overview", "vanilla", undefined, element)
    const section = overview.sections.find(
      (item) => item.id === "deferred-rendering"
    )!
    const dom = new JSDOM(section.examples![0]!.code)
    try {
      const selector = element === "standard" ? "i" : "icones-icon"
      const attribute = element === "standard" ? "icon-defer" : "defer"
      expect(
        [...dom.window.document.querySelectorAll(selector)].map((host) =>
          host.getAttribute(attribute)
        )
      ).toEqual(["intersect", "domready"])
      expect(dom.window.document.querySelectorAll("script")).toHaveLength(1)
    } finally {
      dom.window.close()
    }
  }
})

test("IconConfig documents real framework APIs, inheritance, loading and SSR boundaries", () => {
  for (const framework of guideVariants) {
    const article = getGuideArticle(
      "icon-config",
      framework.id,
      undefined,
      framework.element
    )
    expect(article.title).toBe("IconConfig")
    expect(article.sections.map((section) => section.id)).toEqual([
      "shared-defaults",
      "individual-overrides",
      "nested-configuration",
      "local-sources",
      "runtime-api",
      "stores-and-ssr",
      "configuration-troubleshooting",
      "configuration-reference",
    ])
    const code = article.sections
      .flatMap((section) => section.examples ?? [])
      .map((example) => example.code)
      .join("\n")
    expect(code).toContain(`@icones/${framework.id}`)
    expect(code).toContain("defaultSize")
    expect(code).toContain("sizeValues")
    expect(code).toContain('defaultSize: { tabler: "lg", default: "md" }')
    expect(code).toContain("sources:")
    expect(code).toContain("api: false")
    expect(code).toContain("createIconStore")
    if (framework.id === "astro" || framework.id === "vanilla") {
      expect(code).toContain("createIconConfig(")
      expect(code).not.toContain("<IconConfig")
      expect(code).toContain("scope")
    } else {
      expect(code).toContain("<IconConfig")
      expect(code).not.toContain("createIconConfig(")
    }
    expect(
      article.sections
        .find((section) => section.id === "stores-and-ssr")!
        .paragraphs.join(" ")
    ).toContain("separate store for each SSR request")
  }
})

test("guide component examples compile in each framework", async () => {
  const require = createRequire(import.meta.url)
  const vue = require("vue/compiler-sfc")
  const svelte = createRequire(
    new URL("../../packages/svelte/package.json", import.meta.url)
  )("svelte/compiler")
  const astro = createRequire(require.resolve("astro/package.json"))(
    "@astrojs/compiler-rs"
  )
  const seen = new Set<string>()
  for (const framework of guideVariants) {
    for (const page of guidePages) {
      for (const section of getGuideArticle(
        page.id,
        framework.id,
        undefined,
        framework.element
      ).sections) {
        for (const example of section.examples ?? []) {
          if (seen.has(example.code)) continue
          seen.add(example.code)
          if (example.filename.endsWith(".vue")) {
            const component = vue.parse(example.code)
            expect(component.errors).toEqual([])
            const script = vue.compileScript(component.descriptor, {
              id: "guide",
            })
            expect(
              vue.compileTemplate({
                source: component.descriptor.template.content,
                filename: example.filename,
                id: "guide",
                compilerOptions: { bindingMetadata: script.bindings },
              }).errors
            ).toEqual([])
          } else if (example.filename.endsWith(".svelte")) {
            expect(
              svelte.compile(example.code, {
                filename: example.filename,
                generate: "server",
              }).js.code
            ).toContain("@icones/svelte")
          } else if (example.filename.endsWith(".astro")) {
            const result = await astro.transform(example.code, {
              filename: example.filename,
            })
            expect(
              result.diagnostics?.filter(
                (item: { severity: number }) => item.severity === 1
              ) ?? []
            ).toEqual([])
          } else if (example.filename.endsWith(".html")) {
            const dom = new JSDOM(example.code)
            try {
              expect(
                dom.window.document.querySelector(
                  "icones-icon, i[icon-name], i[ui-name], i#runtime-icon"
                )
              ).not.toBeNull()
              const script =
                dom.window.document.querySelector("script")!.textContent!
              expect(script).toContain(
                script.includes("bindIcons") ||
                  script.includes("defineIconElement")
                  ? "@icones/vanilla"
                  : dom.window.document.querySelector("i[icon-name]")
                    ? "@icones/vanilla/standard-element"
                    : "@icones/vanilla/web-element"
              )
              expect(
                ts.transpileModule(script, { reportDiagnostics: true })
                  .diagnostics
              ).toEqual([])
            } finally {
              dom.window.close()
            }
          } else if (/\.(?:tsx?|mjs)$/.test(example.filename)) {
            expect(
              ts
                .transpileModule(example.code, {
                  fileName: example.filename,
                  compilerOptions: {
                    jsx: ts.JsxEmit.Preserve,
                    target: ts.ScriptTarget.ESNext,
                  },
                  reportDiagnostics: true,
                })
                .diagnostics?.map((diagnostic) => diagnostic.messageText)
            ).toEqual([])
          }
        }
      }
    }
  }
})

test("Vanilla guide documents both defer modes without affecting other frameworks", () => {
  const section = getGuideArticle("overview", "vanilla").sections.find(
    (item) => item.id === "deferred-rendering"
  )!
  const dom = new JSDOM(section.examples![0]!.code)
  try {
    expect(
      [...dom.window.document.querySelectorAll("icones-icon")].map((host) =>
        host.getAttribute("defer")
      )
    ).toEqual(["intersect", "domready"])
    expect(
      dom.window.document.querySelector("[data-defer], [data-icon]")
    ).toBeNull()
    expect(dom.window.document.querySelectorAll("script")).toHaveLength(1)
    expect(section.paragraphs.join(" ")).toContain("DOMContentLoaded")
    expect(section.note).toContain("IntersectionObserver")
  } finally {
    dom.window.close()
  }
  for (const framework of guideFrameworks.filter(
    (item) => item.id !== "vanilla"
  ))
    expect(
      getGuideArticle("overview", framework.id).sections.some(
        (item) => item.id === "deferred-rendering"
      )
    ).toBe(false)
})

test("local source examples use tuple JSON instead of SVG body objects in every framework", () => {
  for (const framework of guideVariants) {
    const section = getGuideArticle(
      "icon-config",
      framework.id,
      undefined,
      framework.element
    ).sections.find((item) => item.id === "local-sources")!
    const code = section.examples![0]!.code
    expect(code).toContain('"app:check": [')
    expect(code).toContain('"path",')
    expect(code).toContain('strokeWidth: "2"')
    expect(code).toContain('strokeLinecap: "round"')
    expect(code).toContain('key: "0"')
    expect(code).not.toContain("body:")
    expect(code).not.toContain("<path")
    expect(code).not.toContain("width:")
    expect(code).not.toContain("height:")
    expect(section.note).toContain("parseElementData(logoJSON)")
  }
})

test("configuration and HTML initialization examples type-check against package exports", () => {
  for (const framework of guideVariants) {
    const files = new Map<string, string>()
    const examples = getGuideArticle(
      "icon-config",
      framework.id,
      undefined,
      framework.element
    ).sections.flatMap((section) => section.examples ?? [])
    if (framework.id === "vanilla") {
      examples.push(
        ...getGuideArticle(
          "typescript",
          framework.id,
          undefined,
          framework.element
        )
          .sections.slice(0, 2)
          .flatMap((section) => section.examples ?? [])
      )
    }
    for (const [index, example] of examples.entries()) {
      // Component compilers above check template syntax; check setup scripts here too.
      const script =
        example.code.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ??
        example.code.match(/^---\n([\s\S]*?)\n---/)?.[1] ??
        example.code
      const extension = example.filename.endsWith(".tsx") ? "tsx" : "ts"
      files.set(
        path.resolve(
          import.meta.dir,
          `guide-config-${framework.id}-${framework.element}-${index}.${extension}`
        ),
        script
      )
    }
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: framework.id === "solidjs" ? "solid-js" : "react",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      types: ["node", "astro/client"],
      allowImportingTsExtensions: true,
      // Check consumer declarations; Astro source components need its compiler.
      customConditions: [],
    }
    const host = ts.createCompilerHost(options)
    const originalGetSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (
      filename,
      languageVersion,
      onError,
      shouldCreateNewSourceFile
    ) => {
      const code = files.get(filename)
      return code === undefined
        ? originalGetSourceFile(
            filename,
            languageVersion,
            onError,
            shouldCreateNewSourceFile
          )
        : ts.createSourceFile(filename, code, languageVersion, true)
    }
    const program = ts.createProgram([...files.keys()], options, host)
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map(
          (diagnostic) =>
            `${framework.id}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
        )
    ).toEqual([])
  }
})

test("Getting started stays step-based while IconConfig leads with usage, customization and loading", () => {
  for (const framework of guideVariants) {
    const start = getGuideArticle(
      "getting-started",
      framework.id,
      undefined,
      framework.element
    )
    const config = getGuideArticle(
      "icon-config",
      framework.id,
      undefined,
      framework.element
    )
    expect(start.tutorial?.outcome).toContain("visible star")
    expect(config.tutorial).toBeUndefined()
    expect(config.sections.every((section) => !section.optional)).toBe(true)
    expect(config.sections.map((section) => section.title)).toEqual([
      "Basic usage",
      "Customize appearance",
      "Configuration inheritance",
      "Local icon data",
      "Load icons from an API",
      "Shared stores and SSR",
      "Troubleshooting configuration",
      "Option reference",
    ])
    for (const section of start.sections.filter((item) => !item.optional)) {
      expect(section.checkpoint).toBeTruthy()
      expect(section.examples?.length).toBeGreaterThan(0)
    }
    const first = config.sections[0]!.examples![0]!.code
    expect(first).toContain(
      framework.id === "vue"
        ? ':default-size="24"'
        : framework.id === "astro" || framework.id === "vanilla"
          ? "defaultSize: 24"
          : "defaultSize={24}"
    )
    if (framework.id !== "vanilla") expect(first).not.toContain("const config")
    expect(first).toContain('role="group" aria-label="Article actions"')
    expect(first.match(/<button type="button">/g)).toHaveLength(3)
    expect(first).toContain(
      framework.id === "vue"
        ? ':size="16"'
        : framework.id === "vanilla"
          ? 'size="16"'
          : "size={16}"
    )
    expect(config.sections[0]!.checkpoint).toContain(
      "only the first two change"
    )
    const customized = config.sections[1]!.examples![0]!.code
    expect(customized).toContain(
      "sizeValues: { tabler: { lg: 28 }, default: { xl: 32 } }"
    )
    expect(customized).toContain("strokeWidth: { tabler: 2, default: 1.5 }")
    expect(customized).toContain(
      "absoluteStrokeWidth: { tabler: true, default: false }"
    )
    const apiExamples = config.sections.find(
      (section) => section.id === "runtime-api"
    )!.examples!
    expect(apiExamples[1]!.code).toContain("satisfies IconApiConfig")
    expect(apiExamples[1]!.code).toContain(
      'flag: { type: "symbol", baseUrl: "/icons" }'
    )
    expect(customized).toContain(
      framework.id === "vue"
        ? ':size="32"'
        : framework.id === "vanilla"
          ? 'size="32"'
          : "size={32}"
    )
    for (const advanced of [
      "sizeValues",
      "strokeWidth",
      "sources",
      "satisfies",
      "api:",
      "createIconStore",
    ]) {
      expect(first).not.toContain(advanced)
    }
    if (framework.id === "vanilla") {
      expect(first).toContain(
        framework.element === "standard"
          ? '<i icon-name="tabler:star">'
          : '<icones-icon name="tabler:star">'
      )
      expect(first).not.toContain("document.createElement")
      expect(first).not.toContain("/web-element")
    }
  }
})

function evaluateConfigModule<T>(
  code: string,
  exportsFromAdapter: Record<string, unknown> = {}
): T {
  const exports = {}
  const compiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  runInNewContext(compiled, {
    exports,
    URL,
    require: (specifier: string) => {
      expect(specifier).toMatch(
        /^@icones\/(react|vue|svelte|solidjs|astro|vanilla)$/
      )
      return exportsFromAdapter
    },
  })
  return exports as T
}

test("IconConfig collection and custom URL examples load the documented data", async () => {
  for (const framework of guideVariants) {
    const sections = getGuideArticle(
      "icon-config",
      framework.id,
      undefined,
      framework.element
    ).sections
    const sourceExample = sections.find(
      (section) => section.id === "local-sources"
    )!.examples![1]!
    const { config } = evaluateConfigModule<{ config: IconScopeOptions }>(
      sourceExample.code
    )
    const local = createIconStore(config)
    expect(local.getState("app:check").status).toBe("loaded")
    expect(await local.load("app:missing")).toBeNull()
    expect(local.getState("app:missing").status).toBe("missing")

    const apiExample = sections.find((section) => section.id === "runtime-api")!
      .examples![2]!
    const remote = evaluateConfigModule<{ config: { api: IconApiOptions } }>(
      apiExample.code
    )
    const requests: string[] = []
    const store = createIconStore({
      api: {
        ...remote.config.api,
        fetch: (async (url: string | URL | Request) => {
          requests.push(String(url))
          return Response.json([["path", { d: "M2 12h20" }]])
        }) as typeof fetch,
      },
    })
    expect(await store.load("tabler:star")).not.toBeNull()
    expect(requests).toEqual([
      "https://icons.example.com/icon-data/tabler%3Astar.json",
    ])
    expect(store.getState("tabler:star").status).toBe("loaded")
  }
})

test("IconConfig SSR example isolates requests and restores loaded data without another fetch", async () => {
  for (const framework of guideVariants) {
    const example = getGuideArticle(
      "icon-config",
      framework.id,
      undefined,
      framework.element
    ).sections.find((section) => section.id === "stores-and-ssr")!.examples![0]!
    let requests = 0
    const apiFetch: typeof fetch = Object.assign(
      async () => {
        requests++
        return Response.json({
          prefix: "tabler",
          width: 24,
          height: 24,
          icons: { star: { body: '<path d="M2 12h20"/>' } },
        })
      },
      { preconnect() {} }
    )
    const exampleModule = evaluateConfigModule<{
      preparePageIcons: (names: readonly string[]) => Promise<{
        store: IconStore
        initialData: Record<string, Data>
      }>
      createAppIconStore: (initialData: Record<string, Data>) => IconStore
    }>(example.code, {
      createIconStore: (options: IconStoreOptions) => {
        expect(options.api).toEqual({
          type: "fetch",
          baseUrl: "https://icons.example.com/icons",
        })
        return createIconStore({
          ...options,
          api: { ...(options.api as IconApiOptions), fetch: apiFetch },
        })
      },
    })
    const page = await exampleModule.preparePageIcons([
      "tabler:star",
      "tabler:star",
      "tabler:missing",
    ])
    expect(requests).toBe(2)
    expect(page.store.getState("tabler:star").status).toBe("loaded")
    expect(page.store.getState("tabler:missing").status).toBe("missing")
    expect(Object.keys(page.initialData)).toEqual(["tabler:star"])
    const client = exampleModule.createAppIconStore(
      JSON.parse(JSON.stringify(page.initialData))
    )
    expect(client.getState("tabler:star").status).toBe("loaded")
    expect(await client.load("tabler:star")).toEqual(
      page.initialData["tabler:star"]
    )
    expect(requests).toBe(2)
    const otherPage = await exampleModule.preparePageIcons(["tabler:star"])
    expect(otherPage.store).not.toBe(page.store)
    expect(requests).toBe(3)
  }
})

test("the inheritance table matches actual set merging and scalar replacement", () => {
  const parent = createIconConfig({
    defaultSize: { tabler: 28, default: 20 },
    api: false,
  })
  const cases: [IconScopeOptions["defaultSize"], number[]][] = [
    [undefined, [28, 20]],
    [{ tabler: 16 }, [16, 20]],
    [{ default: 16 }, [28, 16]],
    [16, [16, 16]],
  ]
  const table = getGuideArticle("icon-config", "react").sections.find(
    (section) => section.id === "nested-configuration"
  )!.table!
  expect(table.rows).toHaveLength(cases.length)
  for (const [defaultSize, sizes] of cases) {
    const scope = createIconConfig({ defaultSize }, parent)
    expect(scope.store).toBe(parent.store)
    expect(
      ["tabler:star", "lucide:star"].map(
        (name) =>
          renderIcon({ status: "idle" }, { name }, scope.appearance).attributes
            .width
      )
    ).toEqual(sizes)
    expect(
      renderIcon(
        { status: "idle" },
        { name: "tabler:star", size: 32 },
        scope.appearance
      ).attributes.width
    ).toBe(32)
  }
})

test("Vanilla tutorial HTML renders the promised sizes, nested scopes and offline tuples", async () => {
  const data = [["path", { d: "M2 12h20", stroke: "currentColor" }]] as const
  await Promise.all(
    (
      [
        ["shared-defaults", ["24", "24", "16"]],
        ["individual-overrides", ["28", "20", "32"]],
        ["nested-configuration", ["24", "16"]],
        ["local-sources", ["20"]],
      ] as const
    )
      .flatMap(([id, widths]) =>
        (["standard", "web"] as const).map((element) => ({
          id,
          widths,
          element,
        }))
      )
      .flatMap((scenario) =>
        (scenario.id === "shared-defaults" ? [false, true] : [false]).map(
          (changeDefault) => ({ ...scenario, changeDefault })
        )
      )
      .map(async ({ id, widths, element, changeDefault }) => {
        const article = getGuideArticle(
          "icon-config",
          "vanilla",
          undefined,
          element
        )
        const example = article.sections.find((section) => section.id === id)!
          .examples![0]!
        const dom = new JSDOM(
          changeDefault
            ? example.code.replace("defaultSize: 24", "defaultSize: 20")
            : example.code
        )
        const document = dom.window.document
        const handles: NonNullable<ReturnType<typeof bindIcons>>[] = []
        try {
          const script = document
            .querySelector("script")!
            .textContent!.replace(/import[^\n]+from "@icones\/vanilla"/g, "")
          // Seed the same artwork the prerequisite Vite setup supplies, without a network.
          const createScope = (options: IconScopeOptions, parent?: IconScope) =>
            createIconConfig(
              parent || options.sources
                ? options
                : {
                    ...options,
                    api: false,
                    sources: {
                      "tabler:star": data,
                      "tabler:heart": data,
                      "lucide:star": data,
                    },
                  },
              parent
            )
          runInNewContext(script, {
            document,
            createIconConfig: createScope,
            defineIconElement: (
              options: Parameters<typeof defineIconElement>[0]
            ) =>
              defineIconElement({
                ...options,
                window: dom.window as unknown as Window & typeof globalThis,
              }),
            bindIcons: (options: Parameters<typeof bindIcons>[0]) => {
              const handle = bindIcons({
                root: document,
                ...options,
              })!
              handles.push(handle)
              return handle
            },
          })
          await Promise.all(
            [...document.querySelectorAll("icones-icon")].map((icon) =>
              icon.load()
            )
          )
          await Promise.all(handles.map((handle) => handle.load()))
          expect(
            [...document.querySelectorAll("svg")].map((svg) =>
              svg.getAttribute("width")
            )
          ).toEqual(changeDefault ? ["20", "20", "16"] : [...widths])
          for (const svg of document.querySelectorAll("svg")) {
            expect(svg.querySelector("path")).not.toBeNull()
            expect(svg.parentElement?.shadowRoot).toBeNull()
          }
          if (id === "local-sources")
            expect(document.querySelector("path")?.getAttribute("d")).toBe(
              "m5 12 4 4L19 6"
            )
        } finally {
          for (const handle of handles) handle.destroy()
          dom.window.close()
        }
      })
  )
})
