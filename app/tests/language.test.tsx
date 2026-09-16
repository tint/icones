import { expect, test } from "bun:test"
import { act, StrictMode } from "react"
import { JSDOM } from "jsdom"
import { MemoryRouter, useLocation } from "react-router"
import { IconConfig } from "@icones/react"
import App from "./support/app.tsx"
import { IconDetail } from "../src/features/catalog/components/icon-detail.tsx"
import { LanguageSelect } from "../src/shared/i18n/language-select.tsx"
import {
  LanguageProvider,
  translate,
  type Language,
} from "../src/shared/i18n/language.ts"
import { localeMessages } from "../src/shared/i18n/locale-messages.server.ts"
import {
  languageBasename,
  languageHref,
  localePage,
} from "../src/shared/i18n/locale-routing.ts"
import { messages } from "../src/shared/i18n/locales/zh-CN.ts"
import { localizeExampleCode } from "../src/shared/code/code-example.ts"
import {
  mcpClientConfig,
  mcpDocumentationUris,
  mcpTools,
  mcpTutorialSteps,
} from "../src/features/mcp/content.ts"
import {
  getGuideArticle,
  guideFrameworks,
  guidePages,
} from "../src/features/guide/content.ts"

test("rendering matrices remain complete and localized when the language changes", async () => {
  for (const topic of ["loading", "prop-support"]) {
    await withLanguage(
      { route: "/guide/" + topic },
      async ({ host, choose }) => {
        const rows = (id: string) => [
          ...host.querySelectorAll(
            `section[aria-labelledby="guide-${topic}-${id}"] tbody tr`
          ),
        ]
        for (const language of ["en-US", "zh-CN", "en-US"] as const) {
          await choose(language)
          expect(
            host.querySelector("#guide article header")!.textContent
          ).not.toContain("React")
          if (topic === "loading") {
            const cells = rows("api-types").map((row) =>
              [...row.querySelectorAll("td")].map((cell) => cell.textContent)
            )
            expect(cells).toHaveLength(6)
            expect(cells.map((row) => row.slice(0, 2))).toEqual([
              ["sprite", "fetch"],
              ["sprite", "symbol"],
              ["svg", "fetch"],
              ["svg", "symbol"],
              ["symbol", "fetch"],
              ["symbol", "symbol"],
            ])
            expect(cells[3]![2]).toBe(
              language === "zh-CN"
                ? "data：来自构建产物。"
                : "Data: from the bundle."
            )
            const code = host.querySelector(
              'section[aria-labelledby="guide-loading-api-types"] pre code'
            )!.textContent
            expect(code).toContain('api: { type: "fetch", baseUrl: "/icons" }')
            expect(code).toContain('api: { type: "symbol", baseUrl: "/icons" }')
          } else {
            expect(rows("props")).toHaveLength(10)
            const stroke = rows("props").find(
              (row) => row.querySelector("td")?.textContent === "strokeWidth"
            )!
            expect(stroke.textContent).toContain("--icones-stroke-width")
            expect(stroke.textContent).toContain(
              language === "zh-CN"
                ? "有条件，并非不支持"
                : "Conditional, not disabled"
            )
            const css = rows("props").find(
              (row) =>
                row.querySelector("td")?.textContent ===
                (language === "zh-CN" ? "CSS 路径选择器" : "CSS path selectors")
            )!
            expect(css.querySelectorAll("td")[2]!.textContent).toStartWith(
              language === "zh-CN" ? "不生效。" : "No."
            )
          }
        }
      }
    )
  }
})

test("package count follows the eight visible cards in both languages without Icons or Core", async () => {
  await withLanguage(
    { route: "/solutions/packages" },
    async ({ host, choose }) => {
      expect(host.querySelector("main")?.textContent).toContain("8 packages")
      expect(host.querySelector("main")?.textContent).not.toContain("Core")
      expect(
        host.querySelector('button[aria-label="View Icons package"]')
      ).toBeNull()
      await choose("zh-CN")
      expect(host.querySelector("main")?.textContent).toContain("8 个包")
      expect(host.querySelector("main")?.textContent).not.toContain("Core")
      const cards = host.querySelectorAll(
        'button[aria-controls="package-example"]'
      )
      expect(cards).toHaveLength(8)
      expect(
        [...cards].some((card) =>
          /@icones\/(icons|core)\b/.test(card.textContent ?? "")
        )
      ).toBe(false)
      expect(host.querySelector("#package-example")?.textContent).toContain(
        "@icones/react"
      )
    }
  )
})

test("homepage live previews translate their controls and feedback in static Chinese pages", async () => {
  await withLanguage(
    { route: "/", language: "zh-CN" },
    async ({ host, click }) => {
      const showcase = host.querySelector("#ui-examples")!
      expect(showcase.querySelector("h2")?.textContent).toBe(
        "把图标放进真实界面。"
      )
      expect(showcase.querySelectorAll("article")).toHaveLength(4)
      expect(showcase.querySelector('[role="tab"]')?.textContent).toBe("首页")
      expect(
        showcase.querySelector('a[href="/zh-CN/icons?set=tabler"]')
      ).not.toBeNull()
      await click('[aria-label="点赞此示例"]')
      expect(
        showcase
          .querySelector('[aria-label="点赞此示例"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true")
      await click('#ui-examples [role="tab"]:nth-child(2)')
      expect(
        showcase.querySelector('[role="tabpanel"]')?.textContent
      ).toContain("好想法，接着聊。")
      await click('[aria-label="此笔记的操作"] button:first-child')
      expect(showcase.textContent).toContain("笔记已置顶。")
      await click('[role="switch"][aria-label="邮件摘要"]')
      expect(showcase.textContent).toContain("已开启 3 项通知设置")
    }
  )
})

test("dashboard labels and controls follow the document language without changing the global theme", async () => {
  await withLanguage(
    { route: "/", language: "zh-CN" },
    async ({ host, click }) => {
      const front = host.querySelector('[data-dashboard-interactive="true"]')!
      expect(host.querySelector(".dashboard-caption h3")?.textContent).toBe(
        "同一套图标，贯穿整个界面。"
      )
      expect(front.querySelector("h4")?.textContent).toBe("概览")
      expect(host.querySelector('[aria-label="仪表盘图标集"]')).not.toBeNull()
      expect(
        [...host.querySelectorAll(".dashboard-set-picker button")].map(
          (button) => button.textContent
        )
      ).toEqual([
        "Tabler",
        "Lucide",
        "Phosphor",
        "Bootstrap",
        "Ant Design",
        "Hugeicons",
      ])
      await click(".dashboard-set-picker button:nth-child(3)")
      expect(front.getAttribute("data-dashboard-icon-set")).toBe("phosphor")
      expect(
        front.querySelector('svg[data-icon="phosphor:squares-four"]')
      ).not.toBeNull()
      expect(front.querySelector('[aria-label="仪表盘栏目"]')).not.toBeNull()
      expect(
        front.querySelector('a[aria-label="使用指南"]')?.getAttribute("href")
      ).toBe("/zh-CN/guide")
      await click('.dashboard-nav button[aria-label="客户"]')
      expect(front.querySelector("dt")?.textContent).toBe("活跃客户")
      await click(
        '[data-dashboard-interactive="true"] .dashboard-period button:first-child'
      )
      expect(front.querySelector("dd")?.textContent).toBe("223")
      expect(
        front.querySelector(".dashboard-chart-svg")?.getAttribute("aria-label")
      ).toContain("最近 7 天")
      expect(front.querySelector(".dashboard-activity")?.textContent).toContain(
        "已收到付款"
      )
    }
  )
})

test("public pages do not ask consumers to build the website or install workspace packages", async () => {
  for (const route of [
    "/",
    "/guide/react/overview",
    "/guide/react/getting-started",
    "/solutions/packages",
    "/solutions/llms",
    "/solutions/mcp",
  ]) {
    await withLanguage({ route }, async ({ host, choose }) => {
      for (const language of ["en-US", "zh-CN"] as const) {
        if (language === "zh-CN") await choose(language)
        expect(host.querySelector("main")?.textContent).not.toMatch(
          /@workspace:\*|\.\.\/packages\/icons|packages\/icons\/|bun run build:packages|this workspace|this monorepo|本工作区|本仓库|开发环境 · 本地|开发构建/iu
        )
      }
    })
  }
})

test("MCP setup translates prose without changing client configuration or tool names", async () => {
  await withLanguage(
    { route: "/solutions/mcp" },
    async ({ host, choose, requests }) => {
      expect(host.querySelector("#mcp-connect")?.textContent).toBe(
        "Connect a local MCP client."
      )
      for (const language of ["en-US", "zh-CN"] as const) {
        if (language === "zh-CN") await choose(language)
        for (const step of mcpTutorialSteps) {
          const section = host.querySelector(
            `section[aria-labelledby="mcp-step-${step.id}"]`
          )!
          expect(section.querySelector("h3")?.textContent).toBe(
            language === "zh-CN" ? messages[step.title] : step.title
          )
          expect(messages[step.title]).toBeTruthy()
          for (const paragraph of step.paragraphs) {
            expect(messages[paragraph]).toBeTruthy()
            expect(section.textContent).toContain(
              language === "zh-CN" ? messages[paragraph]! : paragraph
            )
          }
          expect(
            [...section.querySelectorAll("pre code")].map(
              (node) => node.textContent
            )
          ).toEqual(step.examples.map(({ code }) => code))
        }
        const code = [...host.querySelectorAll("pre code")].find((block) =>
          block.textContent?.includes('"mcpServers"')
        )
        expect(JSON.parse(code?.textContent ?? "")).toEqual(
          JSON.parse(mcpClientConfig)
        )
        for (const tool of mcpTools) {
          const card = [...host.querySelectorAll("main article")].find(
            (item) => item.querySelector("h3")?.textContent === tool.name
          )
          expect(card?.querySelector("p")?.textContent).toBe(
            language === "zh-CN" ? messages[tool.description] : tool.description
          )
          expect(messages[tool.description]).toBeTruthy()
        }
        expect(
          [
            ...host.querySelectorAll(
              'section[aria-labelledby="mcp-documentation"] li code'
            ),
          ].map((node) => node.textContent)
        ).toEqual(mcpDocumentationUris)
        expect(host.querySelector('a[href^="icones://"]')).toBeNull()
        expect(host.querySelector("main")?.textContent).not.toContain(
          "MCP is not implemented"
        )
      }
      expect(host.querySelector("#mcp-connect")?.textContent).toBe(
        "连接本地 MCP 客户端。"
      )
      expect(host.querySelector("main")?.textContent).toContain(
        "本地 stdio · 只读"
      )
      expect(host.querySelector("#mcp-documentation")?.textContent).toBe(
        "离线可读的文档。"
      )
      expect(requests).toHaveLength(0)
    }
  )
})

test("Guide code comments and copied text follow the document language", async () => {
  for (const topic of ["getting-started", "icon-config"] as const) {
    await withLanguage(
      { route: "/guide/react/" + topic },
      async ({ host, choose, click, copies }) => {
        for (const language of ["en-US", "zh-CN", "en-US"] as const) {
          await choose(language)
          const example = getGuideArticle(topic, "react", false).sections.find(
            (section) =>
              section.examples?.some(
                (candidate) =>
                  candidate.filename ===
                  (topic === "getting-started"
                    ? "vite.config.ts"
                    : "icon-store.ts")
              )
          )!
          const section = host.querySelector(
            `section[aria-labelledby="guide-${topic}-${example.id}"]`
          )!
          const code = section.querySelector("pre code")!.textContent!
          expect(code).toBe(
            localizeExampleCode(example.examples![0]!, (message) =>
              translate(localeMessages[language], message)
            )
          )
          expect(code).toContain(
            topic === "getting-started"
              ? 'import { icones } from "@icones/vite"'
              : 'import { createIconStore, type Data } from "@icones/react"'
          )
          expect(code).toContain(
            language === "zh-CN"
              ? topic === "getting-started"
                ? "保留现有的框架插件"
                : "每次 SSR 请求"
              : topic === "getting-started"
                ? "Keep your existing framework plugin"
                : "once per SSR request"
          )
          await click(
            `section[aria-labelledby="guide-${topic}-${example.id}"] button[aria-label="${language === "zh-CN" ? "复制代码" : "Copy code"}"]`
          )
          expect(copies.at(-1)).toBe(code)
        }
      }
    )
  }
})

test("authored accessible labels translate without changing icon identifiers", async () => {
  for (const route of ["/guide/vue/accessibility", "/solutions/packages"]) {
    await withLanguage(
      { route, language: "zh-CN" },
      async ({ host, choose }) => {
        const code = () =>
          [...host.querySelectorAll("pre code")]
            .map((node) => node.textContent)
            .join("\n")
        expect(code()).toContain(
          route.includes("guide") ? 'aria-label="已完成"' : 'aria-label="收藏"'
        )
        expect(code()).toContain(
          route.includes("guide") ? 'name="tabler:check"' : 'name="tabler:star"'
        )
        await choose("en-US")
        expect(code()).toContain(
          route.includes("guide")
            ? 'aria-label="Completed"'
            : 'aria-label="Favorite"'
        )
      }
    )
  }
})

test("getting started localizes installation guidance without a separate installation page", async () => {
  await withLanguage(
    { route: "/guide/astro/getting-started" },
    async ({ host, choose }) => {
      const code = host.querySelector('[role="tabpanel"]')?.textContent
      await choose("zh-CN")
      expect(host.querySelector("#guide-title")?.textContent).toBe("快速开始")
      expect(host.querySelector('[role="tabpanel"]')?.textContent).toBe(code)
      const section = host.querySelector(
        'section[aria-labelledby="guide-getting-started-add-the-adapter"]'
      )!
      expect(section.querySelector("p")?.textContent).toMatch(
        /[\\u4e00-\\u9fff]/
      )
      expect(
        host.querySelector('#guide-navigation a[href$="/installation"]')
      ).toBeNull()
      expect(
        host.querySelector('#guide-navigation a[href$="/what-is-icones"]')
      ).toBeNull()
      expect(
        host.querySelector('a[href="/zh-CN/guide/loading"]')
      ).not.toBeNull()
    }
  )
})

test("back-to-top uses the document language and restores visibility on mount", async () => {
  await withLanguage(
    { route: "/licenses" },
    async ({ host, dom, choose, remount }) => {
      await act(async () => {
        Object.defineProperty(dom.window, "scrollY", {
          configurable: true,
          value: 800,
        })
        dom.window.dispatchEvent(new dom.window.Event("scroll"))
      })
      expect(
        host.querySelector('button[aria-label="Back to top"]')
      ).not.toBeNull()
      await choose("zh-CN")
      expect(
        host
          .querySelector('button[aria-label="回到顶部"]')
          ?.getAttribute("title")
      ).toBe("回到顶部")
      await remount()
      expect(host.querySelector('button[aria-label="回到顶部"]')).not.toBeNull()
    }
  )
})

test("LLMs page translates descriptions while keeping document filenames and URLs unchanged", async () => {
  await withLanguage(
    { route: "/solutions/llms" },
    async ({ host, choose, requests }) => {
      expect(host.querySelector("h1")?.textContent).toBe("LLMs")
      expect(host.querySelector("main")?.textContent).toContain(
        "Documentation index"
      )
      await choose("zh-CN")
      expect(host.querySelector("main")?.textContent).toContain("文档索引")
      expect(host.querySelector("main")?.textContent).toContain("完整指南")
      expect(host.querySelector("main")?.textContent).toContain(
        "并非 MCP 连接或图标数据库"
      )
      for (const filename of ["llms.txt", "llms-full.txt"]) {
        const link = host.querySelector(`main a[href="/${filename}"]`)!
        expect(link.textContent).toBe("打开 " + filename)
      }
      expect(document.title).toBe("LLMs – Icones")
      expect(requests).toHaveLength(0)
    }
  )
})

test("Licenses translates its dialog but preserves original legal text and notices", async () => {
  await withLanguage(
    { route: "/licenses" },
    async ({ host, choose, click }) => {
      expect(host.querySelector("main pre")).toBeNull()
      await click("#license-bootstrap button")
      const original = host.querySelector("dialog pre")?.textContent
      expect(original).toBeTruthy()
      expect(host.querySelector("dialog h2")?.textContent).toBe(
        "bootstrap · License notice"
      )
      expect(document.body.style.overflow).toBe("hidden")
      await click('button[aria-label="Close license notice"]')
      expect(host.querySelector("dialog")).toBeNull()
      expect(document.body.style.overflow).toBe("")
      await choose("zh-CN")
      expect(host.querySelector("h1")?.textContent).toBe("许可证")
      expect(
        host.querySelector('nav a[aria-current="page"]')?.textContent
      ).toBe("许可证")
      await click("#license-bootstrap button")
      expect(host.querySelector("dialog pre")?.textContent).toBe(original)
      expect(host.querySelector("dialog h2")?.textContent).toBe(
        "bootstrap · 许可声明"
      )
      expect(host.querySelector("dialog")?.textContent).toContain(
        "Permission is hereby granted"
      )
      await click('button[aria-label="关闭许可声明"]')
      expect(host.querySelector("dialog")).toBeNull()
      expect(document.body.style.overflow).toBe("")
      expect(document.activeElement).toBe(
        host.querySelector("#license-bootstrap button")
      )
      expect(host.querySelector("main")?.textContent).toContain("阅读许可声明")
      expect(host.querySelector("#license-bootstrap")?.textContent).toContain(
        "MIT License"
      )
    }
  )
})

test("LLMs sections survive static language navigation and document reload", async () => {
  const route = "/solutions/llms#llms-vanilla-standard"
  await withLanguage({ route }, async ({ host, choose, remount, dom }) => {
    for (const language of ["zh-CN", "en-US"] as const) {
      await choose(language)
      expect(
        dom.window.location.pathname +
          dom.window.location.search +
          dom.window.location.hash
      ).toBe(languageHref(language, route))
      await remount()
      const chinese = language === "zh-CN"
      expect(host.querySelectorAll("#llms-documents > section")).toHaveLength(7)
      expect(host.querySelectorAll("#llms-documents article")).toHaveLength(18)
      expect(host.querySelector('main input[type="radio"]')).toBeNull()
      expect(host.querySelector("#llms-all h2")?.textContent).toBe(
        chinese ? "全部框架" : "All frameworks"
      )
      expect(host.querySelector("#llms-vanilla-standard h3")?.textContent).toBe(
        chinese ? "Vanilla · 标准元素" : "Vanilla · Standard elements"
      )
      for (const filename of ["llms.txt", "llms-full.txt"]) {
        const link = host.querySelector(
          `main a[href="/llms/vanilla/standard/${filename}"]`
        )!
        expect(link.textContent).toBe((chinese ? "打开 " : "Open ") + filename)
      }
      expect(
        host.querySelector(
          `main a[href="${languageHref(language, "/guide/vanilla/standard/overview")}"]`
        )
      ).not.toBeNull()
    }
  })
})

const iconData = [
  [
    "path",
    {
      d: "M3 12h18",
      stroke: "currentColor",
      strokeWidth: "2",
      fill: "none",
      key: "1",
    },
  ],
]

function Location() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname + location.search + location.hash}
    </output>
  )
}

async function withLanguage(
  options: {
    language?: Language
    saved?: string
    languages?: readonly string[]
    blocked?: boolean
    route?: string
    detail?: boolean
  },
  run: (context: {
    host: HTMLElement
    dom: JSDOM
    copies: string[]
    requests: string[]
    choose: (language: Language) => Promise<void>
    click: (selector: string) => Promise<void>
    remount: () => Promise<void>
  }) => Promise<void>
) {
  const initialLanguage = options.language ?? "en-US"
  let route = options.route ?? "/"
  const dom = new JSDOM(
    `<!doctype html><html lang="${initialLanguage}"><head><meta name="description"></head><body><div id="root"></div></body></html>`,
    {
      url: "https://icons.test" + languageHref(initialLanguage, route),
      pretendToBeVisual: true,
    }
  )
  Object.defineProperty(dom.window.navigator, "languages", {
    value: options.languages ?? ["en-US"],
  })
  if (options.saved !== undefined)
    dom.window.localStorage.setItem("icones-language", options.saved)
  if (options.blocked)
    Object.defineProperty(dom.window, "localStorage", {
      get() {
        throw new Error("Blocked")
      },
    })
  dom.window.scrollTo = () => {}
  dom.window.matchMedia = (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof dom.window.matchMedia
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  dom.window.HTMLDialogElement.prototype.close = function () {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new dom.window.Event("close"))
  }
  const copies: string[] = [],
    requests: string[] = []
  Object.defineProperty(dom.window.navigator, "clipboard", {
    value: {
      writeText: async (value: string) => {
        copies.push(value)
      },
    },
  })
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    fetch: async (input: RequestInfo | URL) => {
      requests.push(String(input))
      if (String(input).includes("/data/")) return Response.json(iconData)
      const set = new URL(String(input), "https://icons.test").searchParams.get(
        "set"
      )
      return Response.json({
        version: 1,
        variants: (set === "flag"
          ? ["circle", "1x1", "4x3"]
          : ["outline", "solid"]
        )
          .sort()
          .map((id) => ({
            id,
            count: 0,
            ...(set === "flag"
              ? {}
              : {
                  alias:
                    id === "solid"
                      ? set === "bootstrap" || set === "phosphor"
                        ? "fill"
                        : "filled"
                      : set === "antd"
                        ? "outlined"
                        : set === "phosphor"
                          ? "regular"
                          : "outline",
                }),
          })),
        icons: [],
        total: 0,
        sets: [{ id: "tabler", count: 1 }],
        categories: [],
        offset: 0,
        limit: 100,
        nextOffset: null,
      })
    },
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  const { createRoot } = await import("react-dom/client")
  const host = dom.window.document.getElementById("root")!
  const root = createRoot(host)

  let revision = 0
  const remount = async () => {
    const language = localePage(dom.window.location.pathname).language!
    await act(async () =>
      root.render(
        <StrictMode>
          <LanguageProvider
            key={revision++}
            value={{ language, messages: localeMessages[language] }}
          >
            <MemoryRouter
              basename={languageBasename(language)}
              initialEntries={[languageHref(language, route)]}
            >
              {options.detail ? (
                <IconConfig api={false}>
                  <LanguageSelect />
                  <IconDetail
                    icon={{
                      name: "tabler:star",
                      prefix: "tabler",
                      category: "system",
                      slug: "star",
                    }}
                    onClose={() => {}}
                  />
                </IconConfig>
              ) : (
                <App />
              )}
              <Location />
            </MemoryRouter>
          </LanguageProvider>
        </StrictMode>
      )
    )
    await flush()
  }
  const click = async (selector: string) => {
    const target = host.querySelector<HTMLElement>(selector)
    if (!target) throw new Error("Missing target: " + selector)
    await act(async () => target.click())
    await flush()
  }
  try {
    await remount()
    await run({
      host,
      dom,
      copies,
      requests,
      click,
      remount,
      choose: async (language) => {
        const trigger = host.querySelector<HTMLButtonElement>(
          '[aria-label^="Language:"], [aria-label^="语言："]'
        )!
        await act(async () => trigger.click())
        const list = dom.window.document.getElementById(
          trigger.getAttribute("aria-controls")!
        )!
        const option = [
          ...list.querySelectorAll<HTMLAnchorElement>('[role="option"]'),
        ].find(
          (item) =>
            item.textContent === (language === "en-US" ? "English" : "简体中文")
        )!
        const href = option.href
        // JSDOM cannot navigate. Verify the real link, then simulate a new document.
        option.addEventListener("click", (event) => event.preventDefault(), {
          once: true,
        })
        const previousLanguage = document.documentElement.lang
        await act(async () => option.click())
        await flush()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
        expect(document.documentElement.lang).toBe(previousLanguage)
        expect(localePage(new URL(href).pathname).language).toBe(language)
        if (language === "en-US")
          expect(new URL(href).pathname).not.toStartWith("/en-US")
        dom.reconfigure({ url: href })
        route =
          localePage(dom.window.location.pathname).route +
          dom.window.location.search +
          dom.window.location.hash
        document.documentElement.lang = language
        await remount()
        expect(document.documentElement.lang).toBe(language)
      },
    })
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

test("language picker uses circle flags and updates the trigger flag with the selected language", async () => {
  await withLanguage({ saved: "en" }, async ({ host, click, choose }) => {
    const trigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Language: English"]'
    )!
    expect(
      trigger
        .querySelector('[data-icon="flag:us-circle"]')
        ?.getAttribute("aria-hidden")
    ).toBe("true")
    expect(trigger.textContent).toBe("")
    expect(trigger.querySelectorAll("svg")).toHaveLength(1)
    await click('[aria-label="Language: English"]')
    const list = document.getElementById(
      trigger.getAttribute("aria-controls")!
    )!
    const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(options.map((option) => option.textContent)).toEqual([
      "English",
      "简体中文",
    ])
    for (const [index, icon] of [
      "flag:us-circle",
      "flag:cn-circle",
    ].entries()) {
      expect(
        options[index]
          ?.querySelector(`[data-icon="${icon}"]`)
          ?.getAttribute("aria-hidden")
      ).toBe("true")
    }
    expect(options[0]?.getAttribute("aria-selected")).toBe("true")
    expect(options[0]?.querySelector("[lang]")?.getAttribute("lang")).toBe(
      "en-US"
    )
    await click('[aria-label="Language: English"]')
    await choose("zh-CN")
    const translated = host.querySelector<HTMLButtonElement>(
      '[aria-label="语言：简体中文"]'
    )!
    expect(translated.textContent).toBe("")
    expect(translated.querySelectorAll("svg")).toHaveLength(1)
    expect(
      translated.querySelector('[data-icon="flag:cn-circle"]')
    ).not.toBeNull()
    expect(translated.querySelector('[data-icon="flag:us-circle"]')).toBeNull()
    await choose("en-US")
    expect(
      host.querySelector(
        '[aria-label="Language: English"] [data-icon="flag:us-circle"]'
      )
    ).not.toBeNull()
    expect(localStorageValue()).toBe("en")
  })
})

test("URL language determines prose and metadata, independent of browser preferences", async () => {
  await withLanguage(
    { language: "zh-CN", languages: ["en-US"], saved: "en-US" },
    async ({ host }) => {
      expect(document.documentElement.lang).toBe("zh-CN")
      expect(host.querySelector("h1")?.textContent).toContain("精美 SVG 图标")
      expect(
        host.querySelector('nav a[href="/zh-CN/icons"]')?.textContent
      ).toBe("图标")
      expect(host.querySelector('[aria-label="主题：跟随系统"]')).not.toBeNull()
      expect(document.title).toBe("精美 SVG 图标 – Icones")
      expect(
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content")
      ).toContain("为你的下一个项目")
    }
  )
  await withLanguage(
    { languages: ["zh-CN"], saved: "en" },
    async ({ host }) => {
      expect(document.documentElement.lang).toBe("en-US")
      expect(host.querySelector("h1")?.textContent).toContain(
        "Beautiful SVG icons"
      )
    }
  )
  await withLanguage({ languages: ["fr-FR"], saved: "invalid" }, async () => {
    expect(document.documentElement.lang).toBe("en-US")
  })
})

test.each([
  { saved: "en-US", languages: ["zh-CN"] },
  { saved: "en", languages: ["zh-CN"] },
  { languages: ["en-GB", "zh-CN"] },
  { languages: ["en-US", "zh-CN"] },
])(
  "English URLs ignore saved preferences and browser locales: %j",
  async (options) => {
    await withLanguage(options, async ({ host }) => {
      expect(document.documentElement.lang).toBe("en-US")
      expect(
        host.querySelector(
          '[aria-label="Language: English"] [data-icon="flag:us-circle"]'
        )
      ).not.toBeNull()
    })
  }
)

test("new language documents preserve the Guide URL and localize authored code, not transient UI state", async () => {
  const route = "/guide/vanilla/standard/icon-config"
  await withLanguage(
    { route },
    async ({ host, click, choose, copies, remount }) => {
      const code = [...host.querySelectorAll("article pre code")].map(
        (node) => node.textContent
      )
      const article = host.querySelector("article")!
      await choose("zh-CN")
      expect(host.querySelector("article p")?.textContent).toContain(
        "普通 i 元素"
      )
      expect(
        host.querySelector('[aria-label="指南导航"]')?.textContent
      ).toContain("标准元素")
      expect(host.querySelector("article section details")).toBeNull()
      expect(host.querySelector("article")).not.toBe(article)
      expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
        route
      )
      expect(
        [...host.querySelectorAll("article pre code")].map(
          (node) => node.textContent
        )
      ).toEqual(
        getGuideArticle("icon-config", "vanilla", false, "standard")
          .sections.flatMap((section) => section.examples ?? [])
          .map((example) =>
            localizeExampleCode(example, (text) =>
              translate(localeMessages["zh-CN"], text)
            )
          )
      )
      await click('article button[aria-label="复制代码"]')
      expect(copies.at(-1)).toBe(
        localizeExampleCode(
          getGuideArticle("icon-config", "vanilla", false, "standard")
            .sections[0]!.examples![0]!,
          (text) => translate(localeMessages["zh-CN"], text)
        )
      )
      expect(copies.at(-1)).toContain('aria-label="文章操作"')
      expect(copies.at(-1)).not.toBe(code[0])
      expect(localStorageValue()).toBeNull()
      await click(
        'nav[aria-label="主导航"] a[href="/zh-CN/solutions/packages"]'
      )
      expect(host.querySelector("h1")?.textContent).toBe(
        "统一的图标系统，适配你的技术栈。"
      )
      await remount()
      expect(document.documentElement.lang).toBe("zh-CN")
      await choose("en-US")
      expect(host.querySelector("article p")?.textContent).toContain(
        "Configure ordinary i elements"
      )
    }
  )
})

function localStorageValue() {
  return window.localStorage.getItem("icones-language")
}

test("storage changes in other tabs cannot change the language of an existing URL", async () => {
  await withLanguage(
    { language: "zh-CN", languages: ["en"] },
    async ({ dom, host }) => {
      expect(document.documentElement.lang).toBe("zh-CN")
      dom.window.localStorage.setItem("icones-language", "en")
      await act(async () =>
        dom.window.dispatchEvent(
          new dom.window.StorageEvent("storage", {
            key: "icones-language",
            newValue: "en",
          })
        )
      )
      expect(host.querySelector('[aria-label="语言：简体中文"]')).not.toBeNull()
      expect(document.documentElement.lang).toBe("zh-CN")
      expect(localStorageValue()).toBe("en")
      dom.window.localStorage.clear()
      await act(async () =>
        dom.window.dispatchEvent(
          new dom.window.StorageEvent("storage", { key: null })
        )
      )
      expect(document.documentElement.lang).toBe("zh-CN")
      expect(localStorageValue()).toBeNull()
    }
  )
})

test("blocked storage does not affect locale document navigation or reload", async () => {
  await withLanguage({ blocked: true }, async ({ choose, remount, host }) => {
    await choose("zh-CN")
    await remount()
    expect(host.querySelector("h1")?.textContent).toContain("精美 SVG 图标")
    await choose("en-US")
  })
})

test("language menu supports keyboard selection and Escape", async () => {
  await withLanguage({}, async ({ host, dom }) => {
    const trigger = host.querySelector<HTMLButtonElement>(
      '[aria-label="Language: English"]'
    )!
    const key = async (target: Element, value: string) => {
      await act(async () =>
        target.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", { key: value, bubbles: true })
        )
      )
    }
    trigger.focus()
    await key(trigger, "ArrowDown")
    const menu = document.getElementById(
      trigger.getAttribute("aria-controls")!
    )!
    await key(menu, "End")
    let destination: string | undefined
    menu.addEventListener(
      "click",
      (event) => {
        event.preventDefault()
        destination =
          (event.target as Element).closest("a")?.getAttribute("href") ??
          undefined
      },
      { once: true }
    )
    await key(menu, "Enter")
    expect(destination).toBe("/zh-CN/")
    expect(document.documentElement.lang).toBe("en-US")
    expect(document.activeElement).toBe(trigger)
    await key(trigger, "ArrowDown")
    await key(menu, "Escape")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })
})

test("a fresh language document restores catalog filters from the URL", async () => {
  const route = "/icons?set=tabler&category=animals&q=cat&style=solid"
  await withLanguage({ route }, async ({ host, choose, requests }) => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 170))
    })
    const count = requests.length
    await choose("zh-CN")
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 170))
    })
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      route
    )
    expect(
      host.querySelector<HTMLInputElement>('[aria-label="搜索图标"]')?.value
    ).toBe("cat")
    expect(document.title).toBe("Tabler 图标 – Icones")
    expect(requests.length).toBeGreaterThan(count)
  })
})

for (const [set, outline, filled] of [
  ["tabler", "Outline", "Filled"],
  ["brand", "Outline", "Filled"],
  ["bootstrap", "Outline", "Fill"],
  ["antd", "Outlined", "Filled"],
  ["phosphor", "Regular", "Fill"],
]) {
  test(`catalog style names stay English in both languages: ${set}`, async () => {
    await withLanguage(
      { route: `/icons?set=${set}`, language: "zh-CN" },
      async ({ host, choose, click }) => {
        const labels = () =>
          [
            ...host.querySelectorAll(
              '[aria-label="图标风格"] button, [aria-label="Icon style"] button'
            ),
          ].map((button) => button.textContent)
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 170))
        })
        expect(host.querySelector("h1")?.textContent).toBe("图标")
        expect(labels()).toEqual([outline, filled])
        await click('[aria-label="图标风格"] button:nth-child(2)')
        expect(
          host.querySelector('[aria-label="图标风格"] [aria-pressed=true]')
            ?.textContent
        ).toBe(filled)
        expect(
          host.querySelector('[data-testid="location"]')?.textContent
        ).toContain("variant=solid")
        await choose("en-US")
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 170))
        })
        expect(labels()).toEqual([outline, filled])
        expect(
          host.querySelector('[aria-label="Icon style"] [aria-pressed=true]')
            ?.textContent
        ).toBe(filled)
      }
    )
  })
}

test("merged Flag variant names stay untranslated and preserve selection across languages", async () => {
  await withLanguage(
    { route: "/icons?set=flag", language: "zh-CN" },
    async ({ host, choose, click }) => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 170))
      })
      expect(
        [...host.querySelectorAll('[aria-label="旗帜样式"] button')].map(
          (button) => button.textContent
        )
      ).toEqual(["1x1", "4x3", "circle"])
      await click('[aria-label="旗帜样式"] button:last-child')
      await choose("en-US")
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 170))
      })
      expect(
        [...host.querySelectorAll('[aria-label="Flag variant"] button')].map(
          (button) => button.textContent
        )
      ).toEqual(["1x1", "4x3", "circle"])
      expect(
        host.querySelector('[aria-label="Flag variant"] [aria-pressed=true]')
          ?.textContent
      ).toBe("circle")
      expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
        "/icons?set=flag&variant=circle"
      )
    }
  )
})

test("icon detail generates the same original JSON and code in each language document", async () => {
  await withLanguage(
    { detail: true },
    async ({ host, choose, click, copies }) => {
      await click('[role="tab"][id$="-JSON"]')
      const code = host.querySelector('[role="tabpanel"] code')!.textContent
      await choose("zh-CN")
      await click('[role="tab"][id$="-JSON"]')
      expect(host.querySelector("dialog h3")?.textContent).toBe("使用此图标")
      expect(host.querySelector('[role="tabpanel"] code')!.textContent).toBe(
        code
      )
      await click('[aria-label="复制 JSON 代码"]')
      expect(JSON.parse(copies.at(-1)!)).toEqual(iconData)
      await click('[role="tab"][id$="-Vue"]')
      expect(
        host
          .querySelector('[aria-label="简洁示例"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true")
      const vue = host.querySelector("pre code")!.textContent
      await choose("en-US")
      await click('[role="tab"][id$="-Vue"]')
      expect(host.querySelector("pre code")!.textContent).toBe(vue)
    }
  )
})

test("Guide translation covers every framework and element path while preserving technical identifiers", () => {
  const missing = new Set<string>()
  function check(value: string | undefined) {
    if (!value || !/[a-zA-Z]/.test(value)) return
    if (Object.hasOwn(localeMessages["zh-CN"], value)) return
    if (/^[\w-]+(?: \/ [\w-]+)?$/.test(value)) return // API names and size presets
    missing.add(value)
  }
  for (const page of guidePages)
    for (const framework of guideFrameworks)
      for (const element of ["web", "standard"] as const)
        for (const development of [true, false]) {
          const article = getGuideArticle(
            page.id,
            framework.id,
            development,
            element
          )
          check(article.title)
          check(article.description)
          check(article.tutorial?.before)
          check(article.tutorial?.outcome)
          check(article.tutorial?.prerequisite?.label)
          for (const section of article.sections) {
            check(section.title)
            section.paragraphs.forEach(check)
            section.bullets?.forEach(check)
            check(section.note)
            check(section.checkpoint)
            section.links?.forEach((link) => check(link.label))
            section.table?.headings.forEach(check)
            section.table?.rows.flat().forEach(check)
          }
        }
  expect([...missing]).toEqual([])
  expect(
    translate(localeMessages["zh-CN"], "{count} icons", { count: 12 })
  ).toBe("12 个图标")
  for (const technical of [
    "tabler:star",
    "@icones/vanilla/web-element",
    "constructor",
    "__proto__",
  ])
    expect(translate(localeMessages["zh-CN"], technical)).toBe(technical)
})
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25))
  })
}
