import { parse, type DefaultTreeAdapterTypes } from "parse5"

export function resolveAttrPrefixes(
  prefixes: readonly string[] = ["icon-"]
): string[] {
  if (
    !Array.isArray(prefixes) ||
    prefixes.some(
      (prefix) =>
        typeof prefix !== "string" ||
        !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-$/.test(prefix)
    )
  )
    throw new TypeError(
      'attrPrefixes must contain lowercase attribute prefixes ending in "-", such as "icon-" or "ui-".'
    )
  return [...new Set(prefixes)]
}

/** Read real HTML attributes, never comments, script strings or SVG metadata. */
export function collectHtmlNames(
  html: string,
  configuredPrefixes?: readonly string[]
): string[] {
  // Preserve configured prefixes in case users standardize a non-default tag schema.
  const prefixes = resolveAttrPrefixes(configuredPrefixes)
  const names = new Set<string>()
  function visit(node: DefaultTreeAdapterTypes.Node) {
    if ("tagName" in node) {
      if (
        node.namespaceURI === "http://www.w3.org/1999/xhtml" &&
        (node.tagName === "icones-icon" || node.tagName === "i")
      ) {
        const attr = (name: string) =>
          node.attrs.find((item) => item.name === name)?.value
        // Support both icon-* and icones-* conventions based on element type.
        for (const prefix of node.tagName === "i" ? prefixes : [""]) {
          const name = attr(prefix + "name")?.trim()
          if (!name) continue
          const alt = attr(prefix + "alt-name")?.trim()
          for (const value of [name, alt])
            if (
              value &&
              /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
            )
              names.add(value)
        }
      }
      // Template contents can be cloned into the page later.
      if (node.tagName === "template" && "content" in node) visit(node.content)
    }
    if ("childNodes" in node) for (const child of node.childNodes) visit(child)
  }
  visit(parse(html))
  return [...names].toSorted()
}
