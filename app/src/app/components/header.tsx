import { useLanguage } from "../../shared/i18n/language.ts"
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"
import { Icon } from "@icones/react"
import { Link, NavLink, useLocation } from "../../shared/routing/router.tsx"
import { ThemeSelect } from "../../shared/theme/theme-select.tsx"
import { LanguageSelect } from "../../shared/i18n/language-select.tsx"
import { paths, solutionLinks } from "../../shared/routing/paths.ts"
import { Dropdown } from "../../shared/ui/dropdown.tsx"

const navClass =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary dark:hover:bg-slate-800"

// Literal names let the Vite plugin include these icons in the static build.
const solutionIcons = {
  [paths.packages]: <Icon name="tabler:packages" size={18} />,
  [paths.llms]: <Icon name="tabler:brain" size={18} />,
  [paths.mcp]: <Icon name="tabler:plug-connected" size={18} />,
}

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true })
  return () => window.removeEventListener("scroll", callback)
}
const isScrolled = () => window.scrollY > 0
const serverScrolled = () => false

export function Header() {
  const { t } = useLanguage()

  const { pathname, key } = useLocation()
  const overlaysHero = pathname === paths.home
  // The catalog toolbar takes over the top edge as this header scrolls away.
  const catalogPage = pathname.replace(/\/$/, "") === paths.icons
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    isScrolled,
    serverScrolled
  )
  const dropdown = useRef<HTMLDetailsElement>(null)
  const navigationId = useId()
  const header = useRef<HTMLElement>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const solutionItems = solutionLinks.map(({ to, label }) => (
    <li key={to}>
      <NavLink to={to} className={navClass + " w-full gap-3 px-4 py-2.5"}>
        <span
          aria-hidden="true"
          className="inline-flex size-5 shrink-0 items-center justify-center"
        >
          {solutionIcons[to]}
        </span>
        {t(label)}
      </NavLink>
    </li>
  ))
  const [navigationKey, setNavigationKey] = useState(key)
  if (navigationKey !== key) {
    setNavigationKey(key)
    setMobileOpen(false)
  }
  useEffect(() => {
    if (dropdown.current) dropdown.current.open = false
  }, [key])
  useEffect(() => {
    if (mobileOpen)
      document.getElementById(navigationId)?.querySelector("a")?.focus()
  }, [mobileOpen, navigationId])
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    const resized = () => {
      if (desktop.matches) setMobileOpen(false)
    }
    desktop.addEventListener("change", resized)
    return () => desktop.removeEventListener("change", resized)
  }, [])
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMobileOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])
  return (
    <header
      ref={header}
      id="top"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setMobileOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false)
          mobileTrigger.current?.focus()
        }
      }}
      className={
        (catalogPage ? "relative " : "sticky top-0 ") +
        "z-30 h-(--header-height) shrink-0 border-b transition-colors " +
        (overlaysHero ? "-mb-(--header-height) " : "") +
        (overlaysHero && !scrolled
          ? "border-transparent bg-transparent"
          : "border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95")
      }
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          className="flex items-center gap-3 rounded-lg font-semibold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          to={paths.home}
        >
          <span className="grid size-9 place-items-center rounded-lg">
            <Icon icon="tabler:droplet" size={24} strokeWidth={2} />
          </span>
          <span>Icones</span>
        </Link>
        <nav
          id={navigationId}
          aria-label={t("Main navigation")}
          data-open={mobileOpen}
          className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-var(--header-height))] flex-col items-stretch gap-1 overflow-y-auto border-y border-slate-200 bg-white p-4 shadow-lg data-[open=true]:flex md:static md:ml-auto md:flex md:max-h-none md:w-auto md:flex-row md:items-center md:gap-2 md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:shadow-none dark:border-slate-800 dark:bg-slate-950 dark:md:bg-transparent"
        >
          <NavLink to={paths.icons} end className={navClass}>
            {t("Icons")}
          </NavLink>
          <NavLink to={paths.guide} className={navClass}>
            {t("Guide")}
          </NavLink>
          <Dropdown
            ref={dropdown}
            className="hidden md:block"
            align="end"
            openOnHover
            trigger={
              <>
                {t("Solutions")}
                <Icon name="tabler:chevron-down" size={15} />
              </>
            }
            triggerProps={{
              "data-active": pathname.startsWith("/solutions/"),
              className:
                navClass +
                " data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
            }}
          >
            <ul className="space-y-1">{solutionItems}</ul>
          </Dropdown>
          <div role="group" aria-label={t("Solutions")} className="md:hidden">
            <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("Solutions")}
            </p>
            <ul className="">{solutionItems}</ul>
          </div>
          <NavLink to={paths.licenses} className={navClass}>
            {t("Licenses")}
          </NavLink>
        </nav>
        <div className="pointer-events-none mx-2 h-4 w-px md:bg-slate-200 dark:md:bg-slate-800"></div>
        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-1 md:gap-2">
          <LanguageSelect key={key + "-language"} />
          <ThemeSelect key={key + "-theme"} />
          <button
            ref={mobileTrigger}
            type="button"
            aria-label={t(mobileOpen ? "Close navigation" : "Open navigation")}
            aria-expanded={mobileOpen}
            aria-controls={navigationId}
            className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden dark:hover:bg-slate-800"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <Icon
              name="tabler:menu-2"
              altName="tabler:x"
              showAlt={mobileOpen}
              size={20}
            />
          </button>
        </div>
      </div>
    </header>
  )
}
