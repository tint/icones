import type { IconData } from "../data/icon-data.ts"

/** Built-in drawing coordinates. Rendered pixel dimensions are controlled by size. */
export const iconViewBoxes = Object.freeze({
  default: "0 0 24 24",
  flagSquare: "0 0 512 512",
  flagLandscape: "0 0 640 480",
} as const)

export function getIconViewBox(name?: string) {
  if (!name?.startsWith("flag:")) return iconViewBoxes.default
  return /-(circle|square)$/.test(name)
    ? iconViewBoxes.flagSquare
    : iconViewBoxes.flagLandscape
}

/** Only named Flag assets follow the filename contract; direct Data stays untouched. */
export function withIconViewBox(data: IconData, name?: string): IconData {
  const viewBox = getIconViewBox(name)
  if (viewBox === iconViewBoxes.default) return data
  const [, , width, height] = viewBox.split(" ").map(Number)
  return { ...data, left: 0, top: 0, width, height }
}

/** Component CSS contract; low-level rewriting is shared with build tools. */
export function configurableStrokeBody(
  body: string,
  variable = "--icones-stroke-width"
) {
  return rewriteStrokeWidths(body, variable)
}

/** Let inherited configuration override widths inside inline and external SVG. */
export function rewriteStrokeWidths(body: string, variable: string) {
  // In multicolour artwork (e.g. flags), stroke widths describe the drawing,
  // not an outline weight. Do not replace them with the UI's stroke preset.
  const strokes = [...body.matchAll(/\bstroke\s*=\s*(["'])(.*?)\1/gi)].map(
    (match) => match[2]
  )
  const styledStrokes = [
    ...body.matchAll(/(?:^|[;"'])\s*stroke\s*:\s*([^;"']+)/gi),
  ].map((match) => match[1])
  if (
    [...strokes, ...styledStrokes].some(
      (stroke) => !/^(currentcolor|none|inherit)$/i.test(stroke.trim())
    )
  )
    return body
  return body
    .replace(
      /\bstroke-width\s*=\s*(["'])(.*?)\1/g,
      (_match, quote: string, width: string) =>
        `stroke-width=${quote}${strokeValue(width, variable)}${quote}`
    )
    .replace(
      /\bstyle\s*=\s*(["'])(.*?)\1/g,
      (_match, quote: string, style: string) =>
        `style=${quote}${style.replace(
          /(^|;)\s*stroke-width\s*:\s*([^;]+)/g,
          (_declaration, separator: string, width: string) =>
            `${separator}stroke-width:${strokeValue(width, variable)}`
        )}${quote}`
    )
}

function strokeValue(width: string, variable: string) {
  return width.includes(variable) ? width : `var(${variable}, ${width.trim()})`
}

/** Rewrite SVG IDs and references using a caller-provided instance prefix. */
export function replaceSvgIds(body: string, prefix: string) {
  const ids = new Set(
    [...body.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map((match) => match[2])
  )
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    body = body.replace(
      new RegExp(`([#;"'])${escaped}([)"']|\\.[a-z])`, "g"),
      (_match, before: string, after: string) => before + prefix + id + after
    )
  }
  return body
}
