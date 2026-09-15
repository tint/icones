import type { SharedGuidePageId } from "./routing.ts"
import { article as methods } from "./rendering/methods.ts"
import { article as loading } from "./rendering/loading.ts"
import { article as props } from "./rendering/props.ts"
import { article as collections } from "./rendering/collections.ts"

const articles = {
  rendering: methods,
  loading,
  "prop-support": props,
  collections,
} as const

/** One canonical article per topic, independent of framework and element track. */
export function getRenderingArticle(page: SharedGuidePageId) {
  return articles[page]
}
