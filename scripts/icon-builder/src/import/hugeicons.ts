import path from "node:path"
import { cachedText } from "../shared/upstream-cache.ts"
import type { SourceIcon } from "./catalog.ts"

const catalogUrl = "https://hugeicons.com/icons/stroke-rounded"
export function hugeiconsSlug(value: string) {
  return value
    .replaceAll("+", "-plus-")
    .replaceAll("'", "-apostrophe-")
    .replaceAll(":", "-colon-")
    .replace(/\s+/g, "-space-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
const decode = (text: string) =>
  text.replaceAll("&#x27;", "'").replaceAll("&amp;", "&")
export function hugeiconsCategories(source: string) {
  const count = Number(source.match(/"numberOfItems":(\d+)/)?.[1])
  const categories = new Map<string, number>()
  for (const match of source.matchAll(
    /<a\b[^>]*href="\/icons\/stroke-rounded\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g
  )) {
    const number = Number(
      match[2]
        .match(
          /class="text-muted-foreground text-\[13px\]"[^>]*>([\d,]+)</
        )?.[1]
        ?.replaceAll(",", "")
    )
    if (Number.isSafeInteger(number) && number > 0)
      categories.set(match[1], number)
  }
  if (!categories.size || categories.size !== count)
    throw new Error(
      `Hugeicons category markup changed: expected ${count}, found ${categories.size}.`
    )
  return categories
}
export function hugeiconsLinks(source: string) {
  return [
    ...new Set(
      [...source.matchAll(/href="\/icon\/([^"]+)"/g)].map((match) =>
        decode(match[1])
      )
    ),
  ].sort()
}
export async function parallel<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<void>
) {
  let next = 0
  let failed = false
  const workers = Array.from(
    { length: Math.min(items.length, concurrency) },
    async () => {
      try {
        while (!failed && next < items.length) await task(items[next++])
      } catch (error) {
        failed = true
        throw error
      }
    }
  )
  const results = await Promise.allSettled(workers)
  const failure = results.find((result) => result.status === "rejected")
  if (failure?.status === "rejected") throw failure.reason
}

export async function hugeiconsCatalog(
  cacheDir: string,
  snapshot: string,
  log = console.log
): Promise<SourceIcon[]> {
  const cache = path.join(cacheDir, "hugeicons-" + snapshot)
  const main = await cachedText(catalogUrl, path.join(cache, "catalog.html"))
  const categories = hugeiconsCategories(main)
  const icons = new Map<string, SourceIcon[]>()
  await parallel([...categories], 6, async ([category, count]) => {
    const url = `${catalogUrl}/${category}`
    const first = await cachedText(url, path.join(cache, `${category}-1.html`))
    const pageCount = Math.max(
      1,
      ...[...first.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]))
    )
    if (pageCount > 100)
      throw new Error(`Unexpected Hugeicons pagination: ${category}`)
    const names = new Set(hugeiconsLinks(first))
    for (let page = 2; page <= pageCount; page++) {
      const body = await cachedText(
        `${url}?page=${page}`,
        path.join(cache, `${category}-${page}.html`)
      )
      for (const name of hugeiconsLinks(body)) names.add(name)
    }
    if (names.size !== count)
      throw new Error(
        `Hugeicons ${category}: expected ${count} icons, found ${names.size}.`
      )
    icons.set(
      category,
      [...names].map((name) => ({
        prefix: "hugeicons",
        category,
        slug: hugeiconsSlug(name),
        source: `https://cdn.hugeicons.com/icons/${encodeURIComponent(name)}-stroke-rounded.svg`,
        load: async () =>
          (
            await cachedText(
              `https://cdn.hugeicons.com/icons/${encodeURIComponent(name)}-stroke-rounded.svg`,
              path.join(cache, "svg", `${hugeiconsSlug(name)}.svg`)
            )
          ).replace(/#141b34/gi, "currentColor"),
      }))
    )
    log(`Hugeicons ${category}: ${names.size}`)
  })
  // One set:name has one canonical path, even if upstream assigns multiple categories.
  const unique = new Map<string, SourceIcon>()
  for (const category of [...icons.keys()].sort()) {
    for (const icon of icons.get(category)!) {
      const existing = unique.get(icon.slug)
      if (existing && existing.source !== icon.source)
        throw new Error(`Hugeicons slug collision: ${icon.slug}`)
      if (!existing) unique.set(icon.slug, icon)
    }
  }
  return [...unique.values()]
}
