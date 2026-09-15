export type IconSetMap<Value> = Readonly<Partial<Record<string, Value>>>
export type IconSetOptions<Value> = Value | IconSetMap<Value>

export function ownValue<Value>(
  values: IconSetMap<Value> | undefined,
  key: string | undefined
): Value | undefined {
  return values && key !== undefined && Object.hasOwn(values, key)
    ? values[key]
    : undefined
}

/** The default discriminator is for primitive values; object values supply their own. */
export function isSetMap<Value>(
  value: IconSetOptions<Value>
): value is IconSetMap<Value> {
  return typeof value === "object" && value !== null
}

export function resolveSetOption<Value>(
  value: IconSetOptions<Value> | undefined,
  set: string | undefined,
  isMap = isSetMap<Value>
): Value | undefined {
  if (value === undefined || !isMap(value)) return value
  return ownValue(value, set) ?? ownValue(value, "default")
}

/** Child maps merge by set; a shared value replaces the inherited map. */
export function mergeSetOptions<Value>(
  parent: IconSetOptions<Value> | undefined,
  next: IconSetOptions<Value> | undefined,
  isMap = isSetMap<Value>
): IconSetOptions<Value> | undefined {
  if (next === undefined) return parent
  if (!isMap(next)) return next
  return {
    ...(parent !== undefined && isMap(parent) ? parent : { default: parent }),
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined)
    ),
  }
}
