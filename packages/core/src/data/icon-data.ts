/** Native SVG payloads: structural types, not an SDK or a remote service contract. */
export type IconDimensions = {
  left?: number
  top?: number
  width?: number
  height?: number
}
export type IconTransform = {
  /** Clockwise quarter turns. */
  rotate?: number
  hFlip?: boolean
  vFlip?: boolean
}
export type IconData = IconDimensions &
  IconTransform & {
    body: string
    hidden?: boolean
  }
export type IconAlias = IconDimensions &
  IconTransform & {
    parent: string
    hidden?: boolean
  }
/** Optional local collection shorthand. Metadata is not needed by the renderer. */
export type IconSet = IconDimensions & {
  prefix: string
  provider?: string
  icons: Record<string, IconData>
  aliases?: Record<string, IconAlias>
  /** Optional metadata for callers/build tools; runtime lookup does not read it. */
  categories?: Record<string, string[]>
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

/** Shallow single-body discriminator; use readIconData for import validation. */
export function isIconData(value: unknown): value is IconData {
  return object(value) && "body" in value && typeof value.body === "string"
}

/** Check if a value is a full icon set payload. */
export function isIconSet(value: unknown): value is IconSet {
  return (
    object(value) &&
    "prefix" in value &&
    typeof value.prefix === "string" &&
    "icons" in value &&
    object(value.icons)
  )
}

export function readIconData(value: unknown, name: string): IconData {
  if (
    !value ||
    typeof value !== "object" ||
    !("body" in value) ||
    typeof value.body !== "string" ||
    !value.body.trim()
  )
    throw new TypeError(`Invalid icon data: ${name}`)
  const icon = value as IconData
  for (const key of ["width", "height", "left", "top", "rotate"] as const) {
    const item = icon[key]
    if (
      item !== undefined &&
      (!Number.isFinite(item) ||
        ((key === "width" || key === "height") && item <= 0))
    )
      throw new TypeError(`Invalid ${key} for ${name}`)
  }
  return icon
}

/** Validate collection payloads without interpreting provider-specific metadata. */
export function readIconSet(value: unknown): IconSet {
  if (!isIconSet(value)) throw new TypeError("Invalid icon set.")
  const properties = (item: IconDimensions & IconTransform) => {
    for (const key of ["left", "top", "width", "height", "rotate"] as const) {
      const number = item[key]
      if (
        number !== undefined &&
        (!Number.isFinite(number) ||
          ((key === "width" || key === "height") && number <= 0))
      )
        throw new TypeError(`Invalid icon set ${key}.`)
    }
    for (const key of ["hFlip", "vFlip"] as const)
      if (item[key] !== undefined && typeof item[key] !== "boolean")
        throw new TypeError(`Invalid icon set ${key}.`)
  }
  properties(value)
  if (value.provider !== undefined && typeof value.provider !== "string")
    throw new TypeError("Invalid icon set provider.")
  for (const [name, icon] of Object.entries(value.icons)) {
    if (!name || !isIconData(icon))
      throw new TypeError("Invalid icon set entry.")
    properties(icon)
  }
  if (value.aliases !== undefined) {
    if (!object(value.aliases)) throw new TypeError("Invalid icon aliases.")
    for (const [name, alias] of Object.entries(value.aliases)) {
      if (
        !name ||
        !object(alias) ||
        typeof alias.parent !== "string" ||
        !(
          Object.hasOwn(value.icons, alias.parent) ||
          Object.hasOwn(value.aliases, alias.parent)
        )
      )
        throw new TypeError("Invalid icon alias parent.")
      properties(alias)
    }
  }
  return value
}

/** Resolve local inheritance only; cycles/missing parents produce no icon. */
export function resolveSetIcon(set: IconSet, name: string): IconData | null {
  const chain: (IconData | IconAlias)[] = []
  const visited = new Set<string>()
  let current = name
  while (!visited.has(current)) {
    visited.add(current)
    if (Object.hasOwn(set.icons, current)) {
      const icon = set.icons[current]
      if (!isIconData(icon)) return null
      const result: IconData = { body: icon.body }
      for (const layer of [set, icon, ...chain.reverse()]) {
        const item: Partial<IconData> = layer
        for (const key of [
          "left",
          "top",
          "width",
          "height",
          "body",
          "hidden",
        ] as const)
          if (Object.hasOwn(item, key))
            Object.assign(result, { [key]: item[key] })
        for (const key of ["hFlip", "vFlip"] as const) {
          if (Object.hasOwn(item, key))
            result[key] = !!result[key] !== !!item[key]
        }
        if (Object.hasOwn(item, "rotate"))
          result.rotate = ((result.rotate ?? 0) + (item.rotate ?? 0)) % 4
      }
      return result
    }
    const alias =
      set.aliases && Object.hasOwn(set.aliases, current)
        ? set.aliases[current]
        : undefined
    if (!alias || typeof alias.parent !== "string") return null
    chain.push(alias)
    current = alias.parent
  }
  return null
}
