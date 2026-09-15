import config from "../../config/deployment.json" with { type: "json" }

/** Deployment policy belongs to tooling, never to the published artwork package. */
export const deployment = config

export function iconDeploymentMode(value = process.env.ICONES_ICON_DEPLOYMENT) {
  if (value === undefined || value === "split") return "split"
  if (value === "local") return "local"
  throw new Error("ICONES_ICON_DEPLOYMENT must be split or local.")
}

export function collectionDomain(prefix: string, domain = deployment.domain) {
  // Hostnames also become output directory names and Cloudflare resource names.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prefix) || prefix.length > 55)
    throw new Error(`Invalid collection prefix: ${prefix}`)
  if (
    domain.length > 253 ||
    !domain.includes(".") ||
    domain
      .split(".")
      .some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
    `${prefix}.${domain}`.length > 253
  )
    throw new Error(`Invalid deployment domain: ${domain}`)
  return `${prefix}.${domain}`
}

export function collectionConfig(prefix: string) {
  return {
    name: `icones-${prefix}`,
    compatibility_date: deployment.compatibilityDate,
    workers_dev: false,
    preview_urls: false,
    routes: [{ pattern: collectionDomain(prefix), custom_domain: true }],
    // No main, bindings, or fallback HTML: this is an assets-only deployment.
    assets: { directory: "./public", not_found_handling: "none" },
  }
}

// URLs are mutable, so revalidate instead of assigning immutable year-long caches.
export const collectionHeaders = `/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
  Cache-Control: public, max-age=0, must-revalidate
`

export function selectCollections(
  available: readonly string[],
  requested?: readonly string[],
  excluded: Readonly<Record<string, string>> = deployment.excludedCollections
) {
  const selected =
    requested ?? available.filter((prefix) => !Object.hasOwn(excluded, prefix))
  if (!selected.length)
    throw new Error("No deployable icon collections selected.")
  for (const prefix of selected) {
    collectionDomain(prefix)
    if (!available.includes(prefix))
      throw new Error(`Unknown collection: ${prefix}`)
    if (Object.hasOwn(excluded, prefix))
      throw new Error(`Collection ${prefix} is excluded: ${excluded[prefix]}`)
  }
  return [...new Set(selected)].sort()
}
