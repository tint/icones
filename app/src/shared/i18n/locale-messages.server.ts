import { messages } from "./locales/zh-CN.ts"
import { guideMessages } from "./locales/guide.zh-CN.ts"
import { renderingMessages } from "./locales/rendering.zh-CN.ts"
import type { Language } from "./locale-routing.ts"

export const localeMessages = {
  "en-US": {},
  "zh-CN": { ...messages, ...guideMessages, ...renderingMessages },
} satisfies Record<Language, Readonly<Record<string, string>>>
