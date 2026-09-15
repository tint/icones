import { Icon } from "@icones/react"
import { Select } from "../ui/select.tsx"
import { useLanguage, type Language } from "./language.ts"
import { useLocation } from "../routing/router.tsx"
import { languageHref } from "./locale-routing.ts"

const languageFlags = {
  "en-US": (
    <Icon
      icon="flag:us-circle"
      size={20}
      className="shrink-0"
      aria-hidden="true"
    />
  ),
  "zh-CN": (
    <Icon
      icon="flag:cn-circle"
      size={20}
      className="shrink-0"
      aria-hidden="true"
    />
  ),
}

const languageOptions = [
  {
    value: "en-US" as const,
    label: (
      <span
        lang="en-US"
        className="inline-flex items-center gap-3 whitespace-nowrap"
      >
        {languageFlags["en-US"]}
        English
      </span>
    ),
  },
  {
    value: "zh-CN" as const,
    label: (
      <span
        lang="zh-CN"
        className="inline-flex items-center gap-3 whitespace-nowrap"
      >
        {languageFlags["zh-CN"]}
        简体中文
      </span>
    ),
  },
]

export function LanguageSelect() {
  const { language, t } = useLanguage()
  const { pathname, search, hash } = useLocation()
  const href = (value: Language) =>
    languageHref(value, pathname + search + hash, import.meta.env.BASE_URL)
  return (
    <Select<Language>
      openOnHover
      aria-label={t("Language: {language}", {
        language: language === "en-US" ? "English" : "简体中文",
      })}
      options={languageOptions}
      value={language}
      align="end"
      className="grid size-9 cursor-pointer place-items-center rounded-lg transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-slate-800"
      panelClassName="p-1 [&_ul]:space-y-1"
      renderValue={() => languageFlags[language]}
      header={
        <p className="my-1 ps-2 text-xs text-slate-500 select-none dark:text-slate-400">
          {t("Language")}
        </p>
      }
      renderOption={({ option, selected, onClick }) => (
        <a
          href={href(option.value)}
          hrefLang={option.value}
          role="option"
          tabIndex={-1}
          aria-selected={selected}
          onClick={onClick}
          className="flex h-9 min-w-40 items-center justify-between gap-4 rounded-lg px-2 text-sm hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-primary aria-selected:bg-primary/10 aria-selected:text-primary dark:hover:bg-slate-800"
        >
          {option.label}
          <Icon
            icon="tabler:check"
            size={16}
            strokeWidth={2}
            className={selected ? "shrink-0" : "invisible shrink-0"}
          />
        </a>
      )}
    />
  )
}
