import { expect, test } from "bun:test"
import { act, type ReactNode } from "react"
import { renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import { IconConfig } from "@icones/react"
import {
  codeLanguage,
  createCodeHighlighter,
  highlighterUrl,
  maxHighlightLength,
  type HighlightLines,
} from "../src/shared/code/syntax-highlighter.ts"
import { HighlightedCode } from "../src/shared/code/highlighted-code.tsx"
import { CodeBlock, CopyCodeButton } from "../src/shared/code/code-block.tsx"

test("code panel corners match its toolbar and viewport, with a compact copy control", () => {
  const fragment = JSDOM.fragment(
    renderToString(
      <IconConfig api={false}>
        <CodeBlock filename="Example.tsx" code="const size = 24" />
      </IconConfig>
    )
  )
  const pre = fragment.querySelector("pre")!
  expect(pre.parentElement!.classList.contains("rounded-xl")).toBe(true)
  expect(pre.previousElementSibling!.classList.contains("rounded-t-xl")).toBe(
    true
  )
  expect(pre.classList.contains("rounded-b-xl")).toBe(true)
  expect(
    fragment.querySelector("button")!.classList.contains("rounded-md")
  ).toBe(true)
})

function tokens(code: string): HighlightLines {
  return code.split(/\r\n|\n|\r/).map((content) => [
    {
      content,
      variants: { light: { color: "#123456" }, dark: { color: "#abcdef" } },
    },
  ])
}

test("maps framework filenames and terminal/tool examples to explicit grammars", () => {
  for (const [filename, language] of Object.entries({
    "IconExample.vue": "vue",
    "Icon.svelte": "svelte",
    "Icon.astro": "astro",
    "icon.tsx": "tsx",
    "icon.jsx": "jsx",
    "vite.config.ts": "typescript",
    "astro.config.mjs": "javascript",
    "icon.svg": "xml",
    "index.html": "html",
    "mcp.json": "json",
    Terminal: "shellscript",
    "tools/call · search_icons": "json",
    "app.css": "css",
  } as const))
    expect(codeLanguage(filename)).toBe(language)
  for (const filename of ["project-layout.txt", "README", "constructor"])
    expect(codeLanguage(filename)).toBeUndefined()
  expect(highlighterUrl).toBe("https://esm.sh/shiki@4.4.2/bundle/web")
})

test("loads the CDN once and shares concurrent snippets while keeping grammars separate", async () => {
  let imports = 0
  const calls: string[] = []
  const highlight = createCodeHighlighter(async () => {
    imports++
    return {
      codeToTokensWithThemes: async (code, options) => {
        calls.push(options.lang)
        expect(options.themes).toEqual({
          light: "github-light",
          dark: "github-dark",
        })
        expect(options.tokenizeMaxLineLength).toBe(1000)
        return tokens(code)
      },
    }
  })
  const code = "<Icon />"
  const results = await Promise.all([
    highlight(code, "vue"),
    highlight(code, "vue"),
    highlight(code, "tsx"),
  ])
  expect(imports).toBe(1)
  expect(calls).toEqual(["vue", "tsx"])
  expect(results[0]).toBe(results[1])
})

test("offline, timeout and grammar errors fall back without repeated CDN loads", async () => {
  let imports = 0
  const offline = createCodeHighlighter(async () => {
    imports++
    throw new Error("offline")
  })
  expect(await offline("one", "vue")).toBeNull()
  expect(await offline("two", "tsx")).toBeNull()
  expect(imports).toBe(1)
  const stalled = createCodeHighlighter(() => new Promise(() => {}), 5)
  expect(await stalled("one", "vue")).toBeNull()
  const grammarError = createCodeHighlighter(async () => ({
    codeToTokensWithThemes: async () => {
      throw new Error("grammar unavailable")
    },
  }))
  expect(await grammarError("one", "vue")).toBeNull()
})

test("skips large blocks, bounds caching and refuses output that changes source text", async () => {
  let imports = 0,
    calls = 0
  const highlight = createCodeHighlighter(async () => {
    imports++
    return {
      codeToTokensWithThemes: async (code) => {
        calls++
        return tokens(code)
      },
    }
  })
  expect(await highlight("x".repeat(maxHighlightLength + 1), "vue")).toBeNull()
  expect(await highlight("", "vue")).toBeNull()
  expect(imports).toBe(0)
  await Promise.all(
    Array.from({ length: 33 }, (_, i) => highlight(String(i), "vue"))
  )
  await highlight("0", "vue")
  expect(calls).toBe(34)
  expect(imports).toBe(1)
  const invalid = createCodeHighlighter(async () => ({
    codeToTokensWithThemes: async () => tokens("changed"),
  }))
  expect(await invalid("original", "vue")).toBeNull()
  const code = "line1\r\n\r\nline2\n"
  expect(await highlight(code, "vue")).toEqual(tokens(code))
})

async function withDOM(
  run: (context: {
    host: HTMLElement
    render: (node: ReactNode, hydrate?: boolean) => Promise<void>
    intersect: () => Promise<void>
    errors: unknown[]
    copied: () => string
  }) => Promise<void>
) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://icons.test/",
  })
  const observations: {
    callback: IntersectionObserverCallback
    connected: boolean
  }[] = []
  dom.window.IntersectionObserver = class {
    item: (typeof observations)[number]
    constructor(callback: IntersectionObserverCallback) {
      this.item = { callback, connected: true }
      observations.push(this.item)
    }
    observe() {}
    disconnect() {
      this.item.connected = false
    }
  } as unknown as typeof IntersectionObserver
  let copied = ""
  Object.defineProperty(dom.window.navigator, "clipboard", {
    value: {
      writeText: async (value: string) => {
        copied = value
      },
    },
  })
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  const { createRoot, hydrateRoot } = await import("react-dom/client")
  const host = dom.window.document.getElementById("root")!
  let root: ReturnType<typeof createRoot> | undefined
  const errors: unknown[] = []
  try {
    await run({
      host,
      errors,
      copied: () => copied,
      render: async (node, hydrate = false) => {
        await act(async () => {
          if (hydrate) {
            host.innerHTML = renderToString(node)
            root = hydrateRoot(host, node, {
              onRecoverableError: (error) => errors.push(error),
            })
          } else {
            root ??= createRoot(host)
            root.render(node)
          }
        })
      },
      intersect: async () => {
        await act(async () => {
          for (const item of observations)
            if (item.connected)
              item.callback(
                [{ isIntersecting: true } as IntersectionObserverEntry],
                {} as IntersectionObserver
              )
        })
      },
    })
  } finally {
    await act(async () => root?.unmount())
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
}

test("SSG and hydration render plain text; visible blocks safely gain colors and copy original code", async () => {
  const code =
    '<script setup lang="ts">\nconst unsafe = "<img src=x onerror=alert(1)>"\n</script>\n'
  let calls = 0
  const highlight = async (value: string) => {
    calls++
    return tokens(value)
  }
  const node = (
    <IconConfig api={false}>
      <pre>
        <HighlightedCode
          code={code}
          filename="Icon.vue"
          highlight={highlight}
          theme="dark"
        />
      </pre>
      <CopyCodeButton code={code} />
    </IconConfig>
  )
  expect(renderToString(node)).not.toContain("syntax-token")
  expect(calls).toBe(0)
  await withDOM(async ({ host, render, intersect, errors, copied }) => {
    await render(node, true)
    expect(calls).toBe(0)
    expect(host.querySelector("code")?.textContent).toBe(code)
    await intersect()
    expect(calls).toBe(1)
    expect(host.querySelector("code")?.dataset.highlighted).toBe("true")
    expect(host.querySelector("code")?.textContent).toBe(code)
    expect(host.querySelector("code img")).toBeNull()
    expect(host.querySelector("code script")).toBeNull()
    expect(
      host
        .querySelector<HTMLElement>(".syntax-token")
        ?.style.getPropertyValue("--syntax-dark")
    ).toBe("#abcdef")
    await act(async () => host.querySelector("button")!.click())
    expect(copied()).toBe(code)
    expect(errors).toEqual([])
  })
})

test("changing code or language never displays stale asynchronous tokens", async () => {
  const pending: ((value: HighlightLines) => void)[] = []
  const highlight = () =>
    new Promise<HighlightLines>((resolve) => pending.push(resolve))
  await withDOM(async ({ host, render, intersect }) => {
    const node = (code: string, filename: string) => (
      <pre>
        <HighlightedCode
          code={code}
          filename={filename}
          highlight={highlight}
        />
      </pre>
    )
    await render(node("old", "Icon.vue"))
    await intersect()
    await render(node("new", "Icon.svelte"))
    await intersect()
    await act(async () => pending[0]!(tokens("old")))
    expect(host.querySelector("code")?.textContent).toBe("new")
    expect(host.querySelector("code")?.dataset.highlighted).toBe("false")
    await act(async () => pending[1]!(tokens("new")))
    expect(host.querySelector("code")?.dataset.highlighted).toBe("true")
    await render(node("latest", "Icon.astro"))
    expect(host.querySelector("code")?.textContent).toBe("latest")
    expect(host.querySelector("code")?.dataset.highlighted).toBe("false")
  })
})

test("unknown filenames, missing observer and CDN failure keep code readable", async () => {
  let calls = 0
  const highlight = async () => {
    calls++
    throw new Error("blocked")
  }
  await withDOM(async ({ host, render, intersect }) => {
    await render(
      <HighlightedCode
        code="plain"
        filename="layout.txt"
        highlight={highlight}
      />
    )
    await intersect()
    expect(calls).toBe(0)
    await render(
      <HighlightedCode
        code="const a = 1"
        filename="a.ts"
        highlight={highlight}
      />
    )
    await intersect()
    expect(calls).toBe(1)
    expect(host.querySelector("code")?.textContent).toBe("const a = 1")
    expect(host.querySelector("code")?.dataset.highlighted).toBe("false")
    Reflect.deleteProperty(window, "IntersectionObserver")
    await render(
      <HighlightedCode
        code="const b = 2"
        filename="b.ts"
        highlight={highlight}
      />
    )
    expect(calls).toBe(1)
    expect(host.querySelector("code")?.textContent).toBe("const b = 2")
  })
})
