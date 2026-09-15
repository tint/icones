import { createContext, useCallback, useContext } from "react"
import { defaultLanguage, type Language } from "./locale-routing.ts"

export type { Language } from "./locale-routing.ts"
export type Messages = Readonly<Record<string, string>>
export type Translate = (
  message: string,
  values?: Record<string, string | number>
) => string
export type Locale = { language: Language; messages: Messages }

// A document has one fixed locale. Language changes are document navigations,
// never a shared mutable store or a browser/localStorage preference.
const LanguageContext = createContext<Locale>({
  language: defaultLanguage,
  messages: {},
})
export const LanguageProvider = LanguageContext.Provider

/** Translate prose and explicitly marked code comments/labels, never technical data. */
export function translate(
  messages: Messages,
  message: string,
  values?: Record<string, string | number>
) {
  const template = Object.hasOwn(messages, message)
    ? messages[message]!
    : message
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    values && Object.hasOwn(values, key) ? String(values[key]) : placeholder
  )
}

export function useLanguage() {
  const { language, messages } = useContext(LanguageContext)
  const t: Translate = useCallback(
    (message, values) => translate(messages, message, values),
    [messages]
  )
  return { language, t }
}
