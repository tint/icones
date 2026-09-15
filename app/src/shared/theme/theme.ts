import { useEffect, useLayoutEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"
export const themeStorageKey = "icones-theme"
const systemThemeQuery = "(prefers-color-scheme: dark)"

export function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(themeStorageKey)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // Storage may be unavailable in private or embedded browsing contexts.
  }
  return "system"
}

function applyTheme(theme: Theme, systemDark: boolean) {
  const dark = theme === "dark" || (theme === "system" && systemDark)
  const root = document.documentElement
  root.classList.toggle("dark", dark)
  root.dataset.theme = theme
  root.style.colorScheme = dark ? "dark" : "light"
}

// Mounted once by the header; every page shares the root theme class.
export function useTheme() {
  // The first client render must match SSG; the head script already paints the saved theme.
  const [theme, setTheme] = useState<Theme>("system")

  useLayoutEffect(() => {
    setTheme(readTheme())
  }, [])

  useLayoutEffect(() => {
    const media = window.matchMedia(systemThemeQuery)
    const update = () => applyTheme(theme, media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [theme])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null)
        setTheme(readTheme())
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  function selectTheme(next: Theme) {
    setTheme(next)
    try {
      window.localStorage.setItem(themeStorageKey, next)
    } catch {
      // The selection still applies for this tab when persistence is blocked.
    }
  }

  return { theme, setTheme: selectTheme }
}
