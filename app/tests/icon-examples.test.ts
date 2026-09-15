import { expect, test } from "bun:test"
import { createRequire } from "node:module"
import ts from "typescript"
import { JSDOM } from "jsdom"
import {
  createIconConfig,
  defineIconElement,
  bindIcons,
} from "../../packages/vanilla/src/index.ts"
import {
  createIconExample,
  iconCodeFormats,
  type IconExampleMode,
} from "../src/shared/integrations/icon-examples.ts"
import { getIconSource } from "../src/features/licenses/sources.ts"
import { parseElementData } from "@icones/core/elements"
import logoJSON from "../../packages/icons/brand/data/4chan.json"

const data = [
  [
    "svg",
    {
      viewBox: "0 0 256 128",
      key: "root",
      children: [
        [
          "path",
          {
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "16",
            d: "M0 0h256",
            key: "source-path",
          },
        ],
      ],
    },
  ],
] as const
const original = { size: 64, strokeWidth: 0, color: "#111827", rotation: 0 }
const customized = {
  size: 96,
  strokeWidth: 2.5,
  color: "#ff0000",
  rotation: 270,
}
const generate = (
  format: (typeof iconCodeFormats)[number],
  options = original,
  mode: IconExampleMode = "full"
) => createIconExample(format, "tabler:arrow-bar-up", data, options, mode)

test("compact is the default and contains only the icon, while full adds framework structure", () => {
  for (const format of iconCodeFormats) {
    for (const options of [original, customized]) {
      const compact = createIconExample(
        format,
        "tabler:arrow-bar-up",
        data,
        options
      ).code
      const full = generate(format, options, "full").code
      expect(compact).toBe(generate(format, options, "compact").code)
      if (format === "SVG" || format === "JSON") {
        expect(compact).toBe(full)
        continue
      }
      expect(compact).toStartWith(
        format === "Vanilla" ? "<icones-icon" : "<Icon"
      )
      expect(compact).not.toMatch(/^import\s/m)
      expect(compact).not.toContain("<script")
      expect(compact).not.toContain("<template")
      expect(compact).not.toContain("document.querySelector")
      expect(full).toContain("@icones/" + format.toLowerCase())
      for (const code of [compact, full]) {
        expect(code).toContain("tabler:arrow-bar-up")
        expect(code).toContain(String(options.size))
        expect(code).toContain(options.color)
        expect(code).not.toContain("IconConfig")
      }
    }
  }
  expect(generate("React", original, "compact").code).toContain(
    'as import("react").CSSProperties'
  )
})

test("all eight formats use real workspace adapters and preserve original JSON", () => {
  expect(iconCodeFormats).toHaveLength(8)
  for (const format of iconCodeFormats) {
    const example = generate(format, customized)
    expect(example.code).not.toBe("")
    if (format !== "SVG" && format !== "JSON") {
      expect(example.packageName).toBe(`@icones/${format.toLowerCase()}`)
      expect(example.code).toContain("tabler:arrow-bar-up")
      for (const options of [original, customized]) {
        const code = generate(format, options).code
        expect(code).not.toContain("IconConfig")
        expect(code).not.toContain("scope")
        expect(code).not.toContain("api:")
        expect(code).not.toContain("export function")
      }
      expect(example.code).toContain("#ff0000")
      expect(example.code).toContain("96")
      expect(example.code).toContain("2.5")
      expect(generate(format).code).toContain(
        format === "Vanilla"
          ? 'stroke-width="original"'
          : "--icones-stroke-width"
      )
    }
  }
  expect(JSON.parse(generate("JSON", customized).code)).toEqual(data)
  expect(generate("SVG").code).toContain('stroke-width="16"')
  expect(generate("SVG", customized).code).toContain(
    'stroke-width="26.666666666666668"'
  )
  expect(generate("SVG", customized).code).not.toContain("<use")
  expect(generate("React", customized).code).toContain("rotate={3}")
  expect(generate("Vue", customized).code).toContain(':rotate="3"')
  expect(generate("Vanilla", customized).code).toContain('rotate="3"')
})

test("code remains unavailable until actual icon data is loaded", () => {
  for (const format of iconCodeFormats)
    expect(
      createIconExample(format, "tabler:star", undefined, original).code
    ).toBe("")
})

test("JSON exports the exact source tuples, including keys, nesting and camelCase attributes", () => {
  for (const source of [data, parseElementData(logoJSON)]) {
    for (const mode of ["compact", "full"] as const) {
      const example = createIconExample(
        "JSON",
        "brand:4chan",
        source,
        customized,
        mode
      )
      expect(JSON.parse(example.code)).toEqual(source)
      expect(example.code).toContain('"key":')
      expect(example.code).toContain('"strokeWidth":')
      expect(example.code).not.toContain('"body":')
      expect(example.code).not.toContain("<path")
      expect(example.description).toContain("parseElementData")
      expect(example.description).not.toContain("Original Iconify data")
    }
  }
})

test("compact snippets parse in their existing framework context", async () => {
  const require = createRequire(import.meta.url)
  const vue = require("vue/compiler-sfc")
  const svelte = createRequire(
    new URL("../../packages/svelte/package.json", import.meta.url)
  )("svelte/compiler")
  const astro = createRequire(require.resolve("astro/package.json"))(
    "@astrojs/compiler-rs"
  )
  for (const options of [original, customized]) {
    for (const format of ["React", "SolidJS"] as const) {
      const example = generate(format, options, "compact")
      expect(
        ts.transpileModule(example.code, {
          fileName: example.filename,
          compilerOptions: { jsx: ts.JsxEmit.Preserve },
          reportDiagnostics: true,
        }).diagnostics
      ).toEqual([])
    }
    expect(
      vue.compileTemplate({
        source: generate("Vue", options, "compact").code,
        filename: "IconExample.vue",
        id: "compact",
      }).errors
    ).toEqual([])
    expect(
      svelte.compile(
        '<script>import { Icon } from "@icones/svelte"</script>\n' +
          generate("Svelte", options, "compact").code,
        {
          filename: "IconExample.svelte",
          generate: "server",
        }
      ).js.code
    ).toContain("@icones/svelte")
    const result = await astro.transform(
      '---\nimport { Icon } from "@icones/astro"\n---\n' +
        generate("Astro", options, "compact").code,
      {
        filename: "IconExample.astro",
      }
    )
    expect(
      result.diagnostics?.filter(
        (item: { severity: number }) => item.severity === 1
      ) ?? []
    ).toEqual([])
  }
})

test("generated framework examples compile in original and customized modes", async () => {
  const require = createRequire(import.meta.url)
  const vue = require("vue/compiler-sfc")
  const svelte = createRequire(
    new URL("../../packages/svelte/package.json", import.meta.url)
  )("svelte/compiler")
  const astro = createRequire(require.resolve("astro/package.json"))(
    "@astrojs/compiler-rs"
  )
  for (const options of [original, customized]) {
    for (const format of ["React", "SolidJS"] as const) {
      const example = generate(format, options)
      const result = ts.transpileModule(example.code, {
        fileName: example.filename,
        compilerOptions: {
          jsx: ts.JsxEmit.Preserve,
          target: ts.ScriptTarget.ESNext,
        },
        reportDiagnostics: true,
      })
      expect(result.diagnostics).toEqual([])
    }
    const component = vue.parse(generate("Vue", options).code)
    expect(component.errors).toEqual([])
    const script = vue.compileScript(component.descriptor, { id: "test-icon" })
    const template = vue.compileTemplate({
      source: component.descriptor.template.content,
      filename: "IconExample.vue",
      id: "test-icon",
      compilerOptions: { bindingMetadata: script.bindings },
    })
    expect(template.errors).toEqual([])
    expect(
      svelte.compile(generate("Svelte", options).code, {
        filename: "IconExample.svelte",
        generate: "server",
      }).js.code
    ).toContain("@icones/svelte")
    const result = await astro.transform(generate("Astro", options).code, {
      filename: "IconExample.astro",
    })
    expect(result.code).toContain("@icones/astro")
    expect(
      result.diagnostics?.filter(
        (diagnostic: { severity: number }) => diagnostic.severity === 1
      ) ?? []
    ).toEqual([])
  }
})

test("source information comes from imported metadata and bundled licenses", () => {
  expect(getIconSource("tabler")?.licenseName).toBe("MIT License")
  expect(getIconSource("lucide")?.licenseName).toBe("ISC License")
  expect(getIconSource("hugeicons")?.revision).toBe("2026-09-09")
  for (const set of ["bootstrap", "antd"]) {
    expect(getIconSource(set)?.licenseName).toMatch(/MIT License/i)
    expect(getIconSource(set)?.licenseText).toContain(
      "Permission is hereby granted"
    )
    expect(getIconSource(set)?.revision).toMatch(/^[a-f0-9]{40}$/)
  }
  expect(getIconSource("remix")).toBeUndefined()
  expect(getIconSource("tabler")?.licenseText).toContain("Paweł Kuna")
  expect(getIconSource("unknown")).toBeUndefined()
  expect(getIconSource("__proto__")).toBeUndefined()
})

test("Vanilla HTML examples initialize and preserve customization in both modes", () => {
  for (const mode of ["compact", "full"] as const) {
    for (const options of [original, customized]) {
      const example = generate("Vanilla", options, mode)
      expect(example.filename).toBe("icon.html")
      expect(example.code).not.toMatch(/querySelector|createIcon\(|append\(/)
      const dom = new JSDOM(example.code)
      const document = dom.window.document
      const scope = createIconConfig({
        api: false,
        sources: { "tabler:arrow-bar-up": data },
      })
      defineIconElement({ window: dom.window, scope })
      try {
        const svg = document.querySelector<SVGSVGElement>("icones-icon > svg")!
        expect(svg.querySelector("path")).not.toBeNull()
        expect(svg.getAttribute("width")).toBe(String(options.size))
        expect(svg.getAttribute("color")).toBe(options.color)
        if (!options.strokeWidth)
          expect(svg.style.getPropertyValue("--icones-stroke-width")).toBe(
            "initial"
          )
        if (mode === "full") {
          const script = document.querySelector("script")!.textContent!
          expect(script).toContain("@icones/vanilla/web-element")
          expect(
            ts.transpileModule(script, { reportDiagnostics: true }).diagnostics
          ).toEqual([])
        } else expect(document.querySelector("script")).toBeNull()
      } finally {
        document.body.replaceChildren()
        dom.window.close()
      }
    }
  }
})

test("Vanilla attribute snippets escape HTML without changing values", () => {
  const name = 'app:"><script>alert(1)</script>&'
  const code = createIconExample("Vanilla", name, data, original).code
  const dom = new JSDOM(code)
  expect(
    dom.window.document.querySelector("icones-icon")!.getAttribute("name")
  ).toBe(name)
  expect(dom.window.document.querySelector("script")).toBeNull()
  dom.window.close()
})

test("both Vanilla elements generate matching compact/full examples and exact entry imports", async () => {
  for (const elementMode of ["web", "standard"] as const)
    for (const mode of ["compact", "full"] as const) {
      const example = createIconExample(
        "Vanilla",
        "tabler:arrow-bar-up",
        data,
        customized,
        mode,
        elementMode
      )
      const dom = new JSDOM(example.code)
      const document = dom.window.document
      const scope = createIconConfig({
        api: false,
        sources: { "tabler:arrow-bar-up": data },
      })
      let standard: ReturnType<typeof bindIcons>
      try {
        if (elementMode === "web")
          defineIconElement({ window: dom.window, scope })
        else standard = bindIcons({ root: document, scope })
        const svg = document.querySelector("svg")!
        expect(svg.querySelector("path")).not.toBeNull()
        expect(svg.getAttribute("width")).toBe(String(customized.size))
        expect(svg.getAttribute("color")).toBe(customized.color)
        expect(svg.parentElement?.localName).toBe(
          elementMode === "web" ? "icones-icon" : "i"
        )
        expect(svg.parentElement?.shadowRoot).toBeNull()
        const script = document.querySelector("script")
        if (mode === "full") {
          const entry =
            elementMode === "web" ? "web-element" : "standard-element"
          expect(script?.textContent).toContain(
            'import "@icones/vanilla/' + entry + '"'
          )
          expect(script?.textContent).not.toContain("initIcons")
        } else expect(script).toBeNull()
      } finally {
        standard?.destroy()
        document.body.replaceChildren()
        dom.window.close()
      }
    }
})

test("compact React uses no missing type imports for the original stroke", () => {
  const filename = new URL("./compact-example.tsx", import.meta.url).pathname
  const source =
    'import { Icon } from "@icones/react"\n' +
    generate("React", original, "compact").code
  const options: ts.CompilerOptions = {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    allowImportingTsExtensions: true,
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (
    name,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  ) =>
    name === filename
      ? ts.createSourceFile(
          name,
          source,
          languageVersion,
          true,
          ts.ScriptKind.TSX
        )
      : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile)
  const program = ts.createProgram([filename], options, host)
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"))
  ).toEqual([])
})
