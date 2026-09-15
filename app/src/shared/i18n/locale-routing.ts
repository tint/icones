export const languages = ["en-US", "zh-CN"] as const
export type Language = (typeof languages)[number]
export const defaultLanguage: Language = "en-US"

export function languageFromPath(
  pathname: string,
  base = "/"
): Language | undefined {
  if (!pathname.startsWith(base)) return
  const segment = pathname.slice(base.length).split("/")[0]
  return languages.find((language) => language === segment)
}

/** Router paths exclude the language basename; query strings and hashes stay intact. */
export function languageHref(language: Language, route: string, base = "/") {
  const prefix = language === defaultLanguage ? base : `${base}${language}/`
  return prefix + route.replace(/^\//, "")
}

export function languageBasename(language: Language, base = "/") {
  return languageHref(language, "/", base).replace(/\/$/, "") || "/"
}

export function localePage(pathname: string, base = "/") {
  const prefix = languageFromPath(pathname, base)
  const route = prefix
    ? pathname.slice(base.length + prefix.length)
    : pathname.slice(base.length - 1)
  return {
    language: pathname.startsWith(base)
      ? (prefix ?? defaultLanguage)
      : undefined,
    route: route.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/",
  }
}
