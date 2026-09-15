import type { Language } from "./locale-routing.ts"
import type { Locale } from "./language.ts"

/** Resolve the dictionary for an unrendered URL using the same locale as its route. */
export async function loadLocaleMessages(
  language: Language,
  base: string,
  fetcher: (input: string) => Promise<Response> = fetch
): Promise<Locale> {
  const response = await fetcher(`${base}locales/${language}.json`)
  if (!response.ok) throw new Error("Unable to load locale: " + response.status)
  const messages: unknown = await response.json()
  if (
    !messages ||
    typeof messages !== "object" ||
    Array.isArray(messages) ||
    Object.values(messages).some((message) => typeof message !== "string")
  )
    throw new Error("Invalid locale dictionary")
  return { language, messages: messages as Locale["messages"] }
}
