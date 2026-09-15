import { Icon } from "@icones/react"
import type { ReactNode } from "react"
import { Select } from "../ui/select.tsx"
import { Chevron } from "../ui/chevron.tsx"
import { useLanguage } from "../i18n/language.ts"
import { cn } from "../lib/cn.ts"
import { packageManagers, type PackageManager } from "./package-install.ts"

// Bun path: Simple Icons (CC0). See assets/package-managers.md.
const bunMark = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-4"
    aria-hidden="true"
  >
    <path d="M12 22.596c6.628 0 12-4.338 12-9.688 0-3.318-2.057-6.248-5.219-7.986-1.286-.715-2.297-1.357-3.139-1.89C14.058 2.025 13.08 1.404 12 1.404c-1.097 0-2.334.785-3.966 1.821a49.92 49.92 0 0 1-2.816 1.697C2.057 6.66 0 9.59 0 12.908c0 5.35 5.372 9.687 12 9.687v.001ZM10.599 4.715c.334-.759.503-1.58.498-2.409 0-.145.202-.187.23-.029.658 2.783-.902 4.162-2.057 4.624-.124.048-.199-.121-.103-.209a5.763 5.763 0 0 0 1.432-1.977Zm2.058-.102a5.82 5.82 0 0 0-.782-2.306v-.016c-.069-.123.086-.263.185-.172 1.962 2.111 1.307 4.067.556 5.051-.082.103-.23-.003-.189-.126a5.85 5.85 0 0 0 .23-2.431Zm1.776-.561a5.727 5.727 0 0 0-1.612-1.806v-.014c-.112-.085-.024-.274.114-.218 2.595 1.087 2.774 3.18 2.459 4.407a.116.116 0 0 1-.049.071.11.11 0 0 1-.153-.026.122.122 0 0 1-.022-.083 5.891 5.891 0 0 0-.737-2.331Zm-5.087.561c-.617.546-1.282.76-2.063 1-.117 0-.195-.078-.156-.181 1.752-.909 2.376-1.649 2.999-2.778 0 0 .155-.118.188.085 0 .304-.349 1.329-.968 1.874Zm4.945 11.237a2.957 2.957 0 0 1-.937 1.553c-.346.346-.8.565-1.286.62a2.178 2.178 0 0 1-1.327-.62 2.955 2.955 0 0 1-.925-1.553.244.244 0 0 1 .064-.198.234.234 0 0 1 .193-.069h3.965a.226.226 0 0 1 .19.07c.05.053.073.125.063.197Zm-5.458-2.176a1.862 1.862 0 0 1-2.384-.245 1.98 1.98 0 0 1-.233-2.447c.207-.319.503-.566.848-.713a1.84 1.84 0 0 1 1.092-.11c.366.075.703.261.967.531a1.98 1.98 0 0 1 .408 2.114 1.931 1.931 0 0 1-.698.869v.001Zm8.495.005a1.86 1.86 0 0 1-2.381-.253 1.964 1.964 0 0 1-.547-1.366c0-.384.11-.76.32-1.079.207-.319.503-.567.849-.713a1.844 1.844 0 0 1 1.093-.108c.367.076.704.262.968.534a1.98 1.98 0 0 1 .4 2.117 1.932 1.932 0 0 1-.702.868Z" />
  </svg>
)

const marks = {
  npm: <Icon name="brand:npm" size={16} />,
  pnpm: <Icon name="brand:pnpm" size={16} />,
  yarn: <Icon name="brand:yarn" size={16} />,
  bun: bunMark,
  deno: <Icon name="brand:deno" size={16} />,
} satisfies Record<PackageManager, ReactNode>

function Label({ manager }: { manager: PackageManager }) {
  return (
    <span
      lang="en"
      className="inline-flex items-center gap-2.5 whitespace-nowrap"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-4 shrink-0 items-center justify-center"
      >
        {marks[manager]}
      </span>
      <span>{manager}</span>
    </span>
  )
}

export function PackageManagerSelect({
  value,
  onChange,
  inverted = false,
  align = "end",
}: {
  value: PackageManager
  onChange: (value: PackageManager) => void
  inverted?: boolean
  align?: "start" | "end"
}) {
  const { t } = useLanguage()
  return (
    <Select<PackageManager>
      aria-label={t("Package manager")}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      align={align}
      className={cn(
        "group/manager inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
        inverted
          ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 aria-expanded:bg-white/10 dark:hover:bg-white/10 dark:aria-expanded:bg-white/10"
          : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
      )}
      panelClassName="z-30 w-fit min-w-0 rounded-xl p-1 [&_ul]:space-y-1 text-slate-700 dark:text-slate-200"
      options={packageManagers.map((manager) => ({
        value: manager,
        label: <Label manager={manager} />,
      }))}
      renderValue={() => (
        <>
          <Label manager={value} />
          <Chevron
            direction="down"
            className="size-3.5 transition-transform group-aria-expanded/manager:rotate-180"
          />
        </>
      )}
      renderOption={({ option, selected, onClick, className }) => (
        <button
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={selected}
          onClick={onClick}
          className={cn(
            "cursor-pointer gap-4 rounded-lg px-2.5! text-sm aria-selected:bg-primary/8 aria-selected:text-primary",
            className
          )}
        >
          {option.label}
          <Icon
            name="tabler:check"
            size={16}
            strokeWidth={1.75}
            className={selected ? "shrink-0" : "invisible shrink-0"}
          />
        </button>
      )}
    />
  )
}

/** The surrounding command panel establishes @container/install. */
export function PackageManagerPicker({
  value,
  onChange,
  panelId,
}: {
  value: PackageManager
  onChange: (value: PackageManager) => void
  panelId: string
}) {
  const { t } = useLanguage()
  return (
    <div className="min-w-0 flex-1 text-xs">
      <div className="w-fit max-w-full @[42rem]/install:hidden">
        <PackageManagerSelect value={value} onChange={onChange} align="start" />
      </div>
      <div
        role="tablist"
        aria-label={t("Package manager")}
        className="hidden min-h-10 min-w-0 items-center gap-0.5 @[42rem]/install:flex"
        onKeyDown={(event) => {
          const index = packageManagers.indexOf(value)
          const next =
            event.key === "ArrowRight"
              ? (index + 1) % packageManagers.length
              : event.key === "ArrowLeft"
                ? (index - 1 + packageManagers.length) % packageManagers.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? packageManagers.length - 1
                    : undefined
          if (next === undefined) return
          event.preventDefault()
          onChange(packageManagers[next]!)
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [next]?.focus()
        }}
      >
        {packageManagers.map((manager) => (
          <button
            key={manager}
            type="button"
            role="tab"
            id={`${panelId}-${manager}`}
            aria-controls={panelId}
            aria-selected={value === manager}
            tabIndex={value === manager ? 0 : -1}
            className="flex h-8 shrink-0 cursor-pointer items-center rounded-md px-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-primary aria-selected:bg-primary/8 aria-selected:text-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => onChange(manager)}
          >
            <Label manager={manager} />
          </button>
        ))}
      </div>
    </div>
  )
}
