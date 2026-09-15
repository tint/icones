import { Icon } from "@icones/react"
import { useLanguage } from "../../shared/i18n/language.ts"
import { Button } from "../../shared/ui/button.tsx"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-6 pt-10 pb-20 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
        <span>
          {t("Independent icon collections · original licenses apply")}
        </span>
        <Button href="https://github.com/tint/icones">
          <Icon name="brand:github" />
          GitHub
        </Button>
      </div>
    </footer>
  )
}
