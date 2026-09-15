import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
} from "react"
import {
  codeLanguage,
  highlightCode,
  maxHighlightLength,
  type HighlightLines,
} from "./syntax-highlighter.ts"
import { cn } from "../lib/cn.ts"

export function HighlightedCode({
  code,
  filename,
  className,
  theme = "auto",
  highlight = highlightCode,
  ...attributes
}: {
  code: string
  filename: string
  className?: string
  theme?: "auto" | "dark"
  highlight?: typeof highlightCode
} & Omit<ComponentPropsWithoutRef<"code">, "children">) {
  const element = useRef<HTMLElement>(null)
  const language = codeLanguage(filename)
  const [result, setResult] = useState<{
    code: string
    language: string
    tokens: HighlightLines
  }>()
  const tokens =
    result?.code === code && result.language === language
      ? result.tokens
      : undefined

  useEffect(() => {
    if (
      !language ||
      !code ||
      code.length > maxHighlightLength ||
      !element.current ||
      typeof window.IntersectionObserver !== "function"
    )
      return
    let cancelled = false
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        void highlight(code, language)
          .then((tokens) => {
            if (!cancelled && tokens) setResult({ code, language, tokens })
          })
          .catch(() => {
            /* Optional enhancement: keep the original text. */
          })
      },
      { rootMargin: "200px" }
    )
    observer.observe(element.current)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [code, language, highlight])

  const breaks = tokens ? (code.match(/\r\n|\n|\r/g) ?? []) : []
  return (
    <code
      {...attributes}
      ref={element}
      className={cn("syntax-code", className)}
      data-language={language}
      data-highlighted={!!tokens}
      data-code-theme={theme}
    >
      {tokens
        ? tokens.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {line.map((token, tokenIndex) => (
                <span
                  key={tokenIndex}
                  className="syntax-token"
                  style={
                    {
                      "--syntax-light": token.variants.light?.color,
                      "--syntax-dark": token.variants.dark?.color,
                    } as CSSProperties
                  }
                >
                  {token.content}
                </span>
              ))}
              {breaks[lineIndex]}
            </Fragment>
          ))
        : code}
    </code>
  )
}
