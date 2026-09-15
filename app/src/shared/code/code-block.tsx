import { useLanguage } from "../i18n/language.ts"
import React from "react"
import { Icon } from "@icones/react"
import { cn } from "../lib/cn.ts"
import { HighlightedCode } from "./highlighted-code.tsx"
import { localizeExampleCode, type CodeExample } from "./code-example.ts"

export function CodeBlock({
  code,
  codeMessages,
  filename,
  className,
  toolbar,
  showWindowControls = true,
}: CodeExample & {
  filename: string
  className?: string
  toolbar?: React.ReactNode
  showWindowControls?: boolean
}) {
  const { t } = useLanguage()
  const localizedCode = localizeExampleCode({ code, codeMessages }, t)
  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative flex min-w-0 flex-col rounded-xl bg-slate-950 text-slate-200 shadow-inner ring-1 ring-white/10 dark:bg-slate-950">
        <div className="flex h-11 shrink-0 items-center gap-2 rounded-t-xl border-b border-white/10 px-4 pr-12 text-xs text-slate-400">
          {showWindowControls && (
            <>
              <span className="size-2 shrink-0 rounded-full bg-red-400/80" />
              <span className="size-2 shrink-0 rounded-full bg-amber-400/80" />
              <span className="size-2 shrink-0 rounded-full bg-emerald-400/80" />
            </>
          )}
          <span
            className={cn(
              "min-w-0 truncate font-mono",
              showWindowControls && "ml-2"
            )}
            title={t(filename)}
          >
            {t(filename)}
          </span>
          {toolbar && <div className="ml-auto shrink-0">{toolbar}</div>}
        </div>
        <pre className="min-h-0 flex-1 overflow-auto rounded-b-xl p-5 pr-14 font-mono text-xs leading-5">
          <HighlightedCode
            code={localizedCode}
            filename={filename}
            theme="dark"
          />
        </pre>
        <CopyCodeButton
          code={localizedCode}
          className="absolute top-1.5 right-2"
        />
      </div>
    </div>
  )
}

export function CopyCodeButton({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const { t } = useLanguage()
  const [feedback, setFeedback] = React.useState<{
    code: string
    error: boolean
  }>()
  const copyError = feedback?.code === code && feedback.error
  const copied = feedback?.code === code && !feedback.error
  const timeoutRef = React.useRef<number>(undefined)

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      setFeedback({ code, error: true })
      return
    }
    setFeedback({ code, error: false })
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setFeedback(undefined), 1500)
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
          className
        )}
        aria-label={copied ? t("Code copied") : t("Copy code")}
        onClick={() => void copy()}
      >
        <Icon
          icon={copied ? "tabler:check" : "tabler:clipboard-copy"}
          size={16}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {copyError
          ? t("Clipboard is unavailable. Select and copy the code manually.")
          : copied
            ? t("Code copied")
            : ""}
      </span>
    </>
  )
}
