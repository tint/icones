import type { ElementData, ElementNode } from "./element-types.ts"
export { reactAttributeName, svgAttributeName } from "../svg/attributes.ts"
export { elementDataToIcon } from "../svg/data.ts"

const xmlName = /^[a-zA-Z_][a-zA-Z0-9_.:-]*$/

/** Check whether a value matches the `[tag, attrs]` tuple format. */
export function isElementData(value: unknown): value is ElementData {
  return Array.isArray(value) && value.every(isElementNode)
}

/** JSON imports are inferred as arrays, not fixed tuples. Validate once at the boundary. */
export function parseElementData(value: unknown): ElementData {
  if (!isElementData(value)) throw new TypeError("Invalid icon element tuples.")
  return value
}

/** Validate non-empty persisted tuples without loading an SVG/XML parser. */
export function readElementData(value: unknown, name: string): ElementData {
  if (!isElementData(value) || !value.length)
    throw new TypeError(`Invalid element tuple JSON: ${name}`)
  return value
}

/** Validate element node shape recursively to prevent malformed trees at runtime. */
function isElementNode(value: unknown): value is ElementNode {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "string" ||
    !xmlName.test(value[0])
  )
    return false
  const attributes: unknown = value[1]
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  )
    return false
  return Object.entries(attributes).every(([key, value]) => {
    if (key === "children")
      return (
        Array.isArray(value) &&
        value.every(
          (child) => typeof child === "string" || isElementNode(child)
        )
      )
    return (
      xmlName.test(key) &&
      (typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value)))
    )
  })
}
