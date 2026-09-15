import { useLanguage } from "../i18n/language.ts"
import { Icon } from "@icones/react"
import { Select } from "../ui/select.tsx"
import { useTheme, type Theme } from "./theme.ts"
import { cn } from "../lib/cn.ts"

const themeIcons = {
  light: <Icon icon="tabler:sun-high" size={20} strokeWidth={2} />,
  dark: <Icon icon="tabler:moon" size={20} strokeWidth={2} />,
  system: <Icon icon="tabler:circle-half-2" size={20} strokeWidth={2} />,
}
const themeLabels = { light: "Light", dark: "Dark", system: "System" }

export function ThemeSelect() {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const themeOptions = (["light", "dark", "system"] as const).map((value) => ({
    value,
    label: (
      <span className="inline-flex items-center gap-3">
        {themeIcons[value]}
        {t(themeLabels[value])}
      </span>
    ),
  }))

  return (
    <Select<Theme>
      openOnHover
      aria-label={t("Theme: {theme}", { theme: t(themeLabels[theme]) })}
      options={themeOptions}
      value={theme}
      align="end"
      className="grid size-9 cursor-pointer place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      panelClassName="p-1 [&_ul]:space-y-1"
      renderValue={() => themeIcons[theme]}
      onValueChange={(value) => {
        if (value) setTheme(value)
      }}
      header={
        <p className="my-1 ps-2 text-xs text-slate-500 select-none dark:text-slate-400">
          {t("theme")}
        </p>
      }
      renderOption={({ option, selected, onClick, className }) => (
        <button
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={selected}
          onClick={onClick}
          className={cn(
            "min-w-40 cursor-pointer gap-4 rounded-lg px-2! text-sm aria-selected:bg-primary/10 aria-selected:text-primary",
            className
          )}
        >
          {option.label}
          <Icon
            icon="tabler:check"
            size={16}
            strokeWidth={2}
            className={selected ? "" : "invisible"}
          />
        </button>
      )}
    />
  )
}
