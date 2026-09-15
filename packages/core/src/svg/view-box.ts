export type ViewBox = [left: number, top: number, width: number, height: number]

/** Parse finite SVG coordinates with positive dimensions. Callers supply error context. */
export function parseViewBox(value: string): ViewBox | null {
  const dimensions = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (
    dimensions.length !== 4 ||
    !dimensions.every(Number.isFinite) ||
    dimensions[2] <= 0 ||
    dimensions[3] <= 0
  )
    return null
  return dimensions as ViewBox
}
