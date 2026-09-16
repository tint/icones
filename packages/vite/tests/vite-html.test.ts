import { expect, test } from "bun:test"
import { readFile, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { runInNewContext } from "node:vm"
import { JSDOM } from "jsdom"
import { build, createServer } from "vite"
import { icones } from "../../vite/src/index.ts"
import { collectHtmlNames } from "../../vite/src/collect-html.ts"

const root = new URL("../../vanilla/playground", import.meta.url).pathname
const dataDir = new URL("../../icons", import.meta.url).pathname

test("collects dedicated and standard HTML elements, including alternatives and template contents", () => {
  const html = [
    '<icones-icon name="tabler:star" alt-name="tabler:heart" defer="intersect"></icones-icon>',
    "<ICONES-ICON NAME='tabler&#58;star'></ICONES-ICON>",
    '<i icon-name="tabler:star" icon-alt-name="tabler:heart" icon-defer="intersect"></i>',
    "<I ICON-NAME='tabler&#58;star'></I>",
    '<template><i icon-name="tabler:check" icon-defer="domready"></i></template>',
    '<!-- <i icon-name="fake:i-comment"></i> -->',
    `<script>const s = '<i icon-name="fake:i-script"></i>'</script>`,
    '<textarea><i icon-name="fake:i-textarea"></i></textarea>',
    '<i icon-name="" icon-alt-name="fake:i-empty"></i>',
    '<template><icones-icon name="tabler:check" defer="domready"></icones-icon></template>',
    '<!-- <icones-icon name="fake:comment"></icones-icon> -->',
    `<script>const s = '<icones-icon name="fake:script"></icones-icon>'</script>`,
    '<style>/* <icones-icon name="fake:style"></icones-icon> */</style>',
    '<textarea><icones-icon name="fake:textarea"></icones-icon></textarea>',
    '<svg><icones-icon name="fake:svg"></icones-icon></svg>',
    '<icones-icon alt-name="fake:no-primary"></icones-icon>',
    '<icones-icon name=" " alt-name="fake:blank-primary"></icones-icon>',
    '<icones-icon name="bad name" alt-name="bad/name"></icones-icon>',
  ].join("\n")
  expect(collectHtmlNames(html)).toEqual([
    "tabler:check",
    "tabler:heart",
    "tabler:star",
  ])
})

test("non-icon tags, other custom elements and old input aliases are never collected", () => {
  expect(
    collectHtmlNames(
      [
        '<span icon="fake:star" icon-alt-name="fake:heart"></span>',
        '<my-button icon="fake:button"></my-button>',
        '<i icon="fake:check"></i>',
        '<span name="fake:name" alt-name="fake:alt"></span>',
        '<b data-icon="fake:legacy"></b>',
        '<svg data-icon="fake:metadata"></svg>',
        '<template><span icon="fake:template"></span></template>',
        '<icones-icon icon="fake:short" icon-name="fake:alias" data-icon="fake:old"></icones-icon>',
        '<icones-icon name="app:star" icon-alt-name="fake:alternate" data-icon-alt-name="fake:old-alt"></icones-icon>',
      ].join("\n")
    )
  ).toEqual(["app:star"])
})

test("HTML collection honors explicit custom prefixes without implicit default fallback", () => {
  const html = [
    '<i ui-name="tabler:star" ui-alt-name="tabler:heart"></i>',
    '<template><i ui-name="tabler:check"></i></template>',
    '<i icon-name="other:default"></i>',
    '<i name="fake:native" icon="fake:bare" data-icon="fake:legacy"></i>',
    '<span ui-name="fake:span"></span>',
    '<!-- <i ui-name="fake:comment"></i> -->',
    '<icones-icon name="web:star"></icones-icon>',
  ].join("\n")
  expect(collectHtmlNames(html, ["ui-"])).toEqual([
    "tabler:check",
    "tabler:heart",
    "tabler:star",
    "web:star",
  ])
  expect(collectHtmlNames(html)).toEqual(["other:default", "web:star"])
  expect(collectHtmlNames(html, ["ui-", "icon-", "ui-"])).toContain(
    "other:default"
  )
  expect(collectHtmlNames(html, [])).toEqual(["web:star"])
})

for (const prefix of ["", "UI-", "ui", "ui--", "ui] , span[", "ui:"])
  test(
    "Vite rejects an invalid standard prefix before extraction: " + prefix,
    () => {
      expect(() => icones({ attrPrefixes: [prefix] })).toThrow("attrPrefixes")
    }
  )

for (const mode of ["svg", "symbol", "sprite"] as const)
  for (const entry of [
    "web-element",
    "standard-element",
    "both",
    "custom-prefix",
  ] as const) {
    test(
      entry + " builds independently and renders offline in " + mode + " mode",
      async () => {
        const entries =
          entry === "both" ? ["web-element", "standard-element"] : [entry]
        const custom = entry === "custom-prefix"
        const markup = (html: string) =>
          custom
            ? html
                .replace(
                  /<icones-icon[\s\S]*?<\/icones-icon>/,
                  '<icones-icon id="icons"></icones-icon>'
                )
                .replaceAll("icon-", "ui-")
            : html
        const result = await build({
          root,
          configFile: false,
          logLevel: "silent",
          base: "/nested/",
          plugins: [
            {
              name: "test-entry-selection",
              enforce: "pre",
              transformIndexHtml: { order: "pre", handler: markup },
              load(id) {
                if (!id.endsWith("/playground/src/index.ts")) return
                if (custom)
                  return 'import { bindIcons } from "@icones/vanilla"; bindIcons({ attrPrefix: "ui-" })'
                return entries
                  .map((name) => 'import "@icones/vanilla/' + name + '"')
                  .join("\n")
              },
            },
            icones({
              dataDir,
              mode,
              emitData: "used",
              fallbackToApi: false,
              attrPrefixes: custom ? ["ui-"] : undefined,
            }),
          ],
          build: { write: false, minify: false },
        })
        const outputs = (Array.isArray(result) ? result : [result]).flatMap(
          (output) => {
            if (!("output" in output))
              throw new Error("Expected a build, not a watcher")
            return output.output
          }
        )
        expect(
          outputs.filter(
            (output) =>
              output.type === "asset" && output.fileName.endsWith(".json")
          )
        ).toHaveLength(2)
        expect(
          outputs.filter(
            (output) =>
              output.type === "asset" && output.fileName.endsWith(".svg")
          )
        ).toHaveLength(mode === "symbol" ? 2 : mode === "sprite" ? 1 : 0)
        const dom = new JSDOM(
          markup(await readFile(root + "/index.html", "utf8")),
          {
            url: "https://icons.test/nested/",
          }
        )
        const document = dom.window.document
        try {
          let requests = 0
          const fetch = () => {
            requests++
            throw new Error("No network should be needed")
          }
          const chunks = outputs.filter((output) => output.type === "chunk")
          expect(chunks).toHaveLength(1)
          const web = document.querySelector<HTMLElement>("#icons")!
          const standard =
            document.querySelector<HTMLElement>("#standard-icons")!
          web.setAttribute("defer", "domready")
          standard.setAttribute(custom ? "ui-defer" : "icon-defer", "domready")
          let readyState = "loading"
          Object.defineProperty(document, "readyState", {
            get: () => readyState,
          })
          runInNewContext(chunks[0]!.code, {
            window: dom.window,
            document,
            MutationObserver: dom.window.MutationObserver,
            fetch,
            AbortController,
            setTimeout,
            clearTimeout,
            queueMicrotask,
          })
          expect(document.querySelector("svg")).toBeNull()
          expect(requests).toBe(0)
          expect(!!dom.window.customElements.get("icones-icon")).toBe(
            entry === "web-element" || entry === "both"
          )
          readyState = "interactive"
          document.dispatchEvent(new dom.window.Event("DOMContentLoaded"))
          await new Promise((resolve) => setTimeout(resolve, 0))
          for (const [host, active, prefix] of [
            [web, entry === "web-element" || entry === "both", ""],
            [standard, entry !== "web-element", custom ? "ui-" : "icon-"],
          ] as const) {
            expect(host.shadowRoot).toBeNull()
            if (!active) {
              expect(host.querySelector("svg")).toBeNull()
              continue
            }
            const svg = host.querySelector("svg")!
            expect(svg.parentElement).toBe(host)
            expect(svg.getAttribute("data-icon")).toBe("tabler:star")
            expect(svg.getAttribute("data-state")).toBe("loaded")
            expect(svg.getAttribute("width")).toBe("28")
            if (mode === "symbol")
              expect(
                svg.querySelector("use")!.getAttribute("href")
              ).toStartWith("/nested/icons/tabler/symbols/")
            else if (mode === "sprite")
              expect(
                svg.querySelector("use")!.getAttribute("href")
              ).toStartWith("/nested/icons/sprite.svg#")
            else expect(svg.querySelector("path")).not.toBeNull()
            host.setAttribute(prefix + "show-alt", "true")
            await new Promise((resolve) => setTimeout(resolve, 0))
            expect(host.querySelectorAll("svg")).toHaveLength(1)
            expect(svg.getAttribute("data-icon")).toBe("tabler:heart")
          }
          expect(requests).toBe(0)
        } finally {
          document.body.replaceChildren()
          dom.window.close()
        }
      },
      30_000
    )
  }

for (const [tag, attribute, recognized] of [
  ["icones-icon", "name", true],
  ["icones-icon", "icon-name", false],
  ["i", "icon-name", true],
  ["i", "ui-name", true],
  ["span", "ui-name", false],
  ["i", "icon", false],
  ["i", "data-icon", false],
  ["span", "icon-name", false],
  ["my-button", "icon", false],
] as const)
  test("dev HTML extraction: " + tag + "/" + attribute, async () => {
    const cacheDir = await mkdtemp(tmpdir() + "/icones-html-test-")
    const server = await createServer({
      root,
      configFile: false,
      logLevel: "silent",
      cacheDir,
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true, include: [] },
      plugins: [
        icones({
          dataDir,
          mode: "symbol",
          emitData: false,
          attrPrefixes: attribute.startsWith("ui-") ? ["ui-"] : undefined,
          fallbackToApi: false,
        }),
      ],
    })
    try {
      const html = await server.transformIndexHtml(
        "/index.html",
        "<html><head></head><body><" +
          tag +
          " " +
          attribute.toUpperCase() +
          '="tabler:star"></' +
          tag +
          "></body></html>"
      )
      const proxy = html.match(/src="([^"]*html-proxy[^"]+)"/)?.[1]
      if (!recognized) {
        expect(proxy).toBeUndefined()
        expect(html).not.toContain("virtual:icones")
        return
      }
      expect(proxy).toBeDefined()
      const entry = await server.transformRequest(proxy!)
      const imports = [
        ...entry!.code.matchAll(
          /import\s+["']([^"']*virtual:icones\/icon\/[^"']+)["']/g
        ),
      ].map((match) => match[1]!)
      expect(imports).toHaveLength(1)
      const module = await server.transformRequest(
        imports[0]!.replace("/@id/__x00__", "\0")
      )
      expect(module?.code).toContain("registerStatic")
      expect(module?.code).toContain("tabler:star")
    } finally {
      await server.close()
      await rm(cacheDir, { recursive: true, force: true })
    }
  })
