import { useLanguage } from "../i18n/language.ts"
import type { ReactNode } from "react"
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  const { t } = useLanguage()
  return (
    <header className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/35">
      <div className="mx-auto w-full max-w-7xl px-6 py-14 sm:py-20">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {t(eyebrow)}
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
          {t(title)}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
          {t(description)}
        </p>
        {children && (
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
