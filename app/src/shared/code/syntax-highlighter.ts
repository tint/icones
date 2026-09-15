// Optional browser enhancement: no package dependency, build-time fetch, or SSR work.
// Pin the CDN version so grammar/engine updates cannot silently change rendering.
export const highlighterUrl = "https://esm.sh/shiki@4.4.2/bundle/web"
export const maxHighlightLength = 20_000

const languages = {
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  tsx: "tsx",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  html: "html",
  svg: "xml",
  xml: "xml",
  css: "css",
  json: "json",
  jsonc: "jsonc",
  yaml: "yaml",
  yml: "yaml",
  sh: "shellscript",
  bash: "shellscript",
  md: "markdown",
} as const
export type CodeLanguage = (typeof languages)[keyof typeof languages]

export function codeLanguage(filename: string): CodeLanguage | undefined {
  const name = filename.toLowerCase()
  if (name === "terminal") return "shellscript"
  if (name.startsWith("tools/call · ")) return "json"
  const extension = name.split(".").at(-1)!
  return Object.hasOwn(languages, extension)
    ? languages[extension as keyof typeof languages]
    : undefined
}

export type HighlightToken = {
  content: string
  variants: { light?: { color?: string }; dark?: { color?: string } }
}
export type HighlightLines = HighlightToken[][]
type HighlighterModule = {
  codeToTokensWithThemes(
    code: string,
    options: {
      lang: CodeLanguage
      themes: { light: string; dark: string }
      tokenizeMaxLineLength: number
      tokenizeTimeLimit: number
    }
  ): Promise<HighlightLines>
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Highlighting timed out")),
      milliseconds
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/** Share the CDN module and a bounded snippet cache across all code blocks. */
export function createCodeHighlighter(
  loadModule: () => Promise<HighlighterModule> = () =>
    import(/* @vite-ignore */ highlighterUrl),
  timeoutMs = 8_000
) {
  let module: Promise<HighlighterModule | null> | undefined
  const cache = new Map<string, Promise<HighlightLines | null>>()
  return (
    code: string,
    language: CodeLanguage
  ): Promise<HighlightLines | null> => {
    if (!code || code.length > maxHighlightLength) return Promise.resolve(null)
    const key = language + "\0" + code
    const cached = cache.get(key)
    if (cached) return cached
    const result = (async () => {
      // Keep a failed load cached too: offline pages must not repeatedly retry the CDN.
      module ??= withTimeout(
        Promise.resolve().then(loadModule),
        timeoutMs
      ).catch(() => null)
      const shiki = await module
      if (!shiki) return null
      const tokens = await withTimeout(
        shiki.codeToTokensWithThemes(code, {
          lang: language,
          themes: { light: "github-light", dark: "github-dark" },
          tokenizeMaxLineLength: 1_000,
          tokenizeTimeLimit: 100,
        }),
        timeoutMs
      )
      // Preserve every character, including blank lines, instead of trusting an HTML string.
      const lines = code.split(/\r\n|\n|\r/)
      if (
        tokens.length !== lines.length ||
        tokens.some(
          (line, index) =>
            line.map((token) => token.content).join("") !== lines[index]
        )
      )
        return null
      return tokens
    })().catch(() => null)
    cache.set(key, result)
    if (cache.size > 32) cache.delete(cache.keys().next().value!)
    return result
  }
}

export const highlightCode = createCodeHighlighter()
