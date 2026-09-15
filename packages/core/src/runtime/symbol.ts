import type { IconSymbolApiOptions } from "./loaders.ts"
import { parseIconName } from "./sources.ts"
import type { RuntimeIcon } from "./types.ts"
import { getIconViewBox } from "../svg/index.ts"
import { parseViewBox } from "../svg/view-box.ts"

/** URL resolution only: never fetches or evaluates a data source. Safe during SSR. */
export function resolveIconSymbol(
  api: IconSymbolApiOptions,
  name: string
): RuntimeIcon | null {
  const parsed = parseIconName(name)
  if (!api.url && (!name.includes(":") || !parsed || parsed.provider))
    return null
  const base = (api.baseUrl ?? "/icons").replace(/\/+$/, "")
  const href = String(
    api.url
      ? api.url(name, parsed)
      : `${base}/${encodeURIComponent(parsed!.prefix)}/${encodeURIComponent(parsed!.name)}.svg#icon`
  )
  const url = new URL(href, "https://icones.invalid/")
  if (!/^https?:$/.test(url.protocol) || !url.hash || url.hash === "#")
    throw new TypeError(
      "Symbol URL must use HTTP(S) or a relative path and include a fragment ID."
    )
  const viewBox = api.viewBox ?? getIconViewBox(name)
  const dimensions = parseViewBox(viewBox)
  if (!dimensions) throw new TypeError("Invalid symbol viewBox.")
  return { href, viewBox: dimensions.join(" ") }
}
