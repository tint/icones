/** Catalog metadata stays on the website; artwork can use a root per collection. */
export function createIconUrls({
  dataBaseUrl = "/icons",
  catalogBaseUrl = "/icons",
  collectionUrl = "",
}: {
  dataBaseUrl?: string
  catalogBaseUrl?: string
  collectionUrl?: string
} = {}) {
  const trim = (url: string) => url.replace(/\/+$/, "")
  if (collectionUrl) {
    if (!collectionUrl.includes("{set}"))
      throw new Error("VITE_ICON_COLLECTION_URL must contain {set}.")
    const url = new URL(collectionUrl.replaceAll("{set}", "tabler"))
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error(
        "VITE_ICON_COLLECTION_URL must be an HTTP(S) URL without credentials, query, or fragment."
      )
  }
  function collectionBaseUrl(prefix: string) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prefix))
      throw new Error(`Invalid collection prefix: ${prefix}`)
    return collectionUrl
      ? trim(collectionUrl.replaceAll("{set}", prefix))
      : `${trim(dataBaseUrl)}/${prefix}`
  }
  return {
    catalogBaseUrl: trim(catalogBaseUrl),
    collectionBaseUrl,
    dataUrl: (prefix: string, slug: string) =>
      `${collectionBaseUrl(prefix)}/data/${encodeURIComponent(slug)}.json`,
    symbolUrl: (prefix: string, slug: string) =>
      `${collectionBaseUrl(prefix)}/symbols/${encodeURIComponent(slug)}.svg#icon`,
  }
}
