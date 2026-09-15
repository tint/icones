export type VanillaElementMode = "web" | "standard"

export function vanillaIconAttribute(key: string, mode: VanillaElementMode) {
  const aliases: Record<string, string> =
    mode === "web"
      ? {
          "aria-label": "label",
          "aria-hidden": "decorative",
          role: "svg-role",
          class: "svg-class",
        }
      : { "aria-label": "label", "aria-hidden": "hidden" }
  return (
    (mode === "standard" ? "icon-" : "") +
    (aliases[key] ??
      key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()))
  )
}

/** HTML attribute examples shared by the guide and icon detail. */
export function vanillaIconExample(
  props: Record<string, string | number | boolean>,
  full = false,
  mode: VanillaElementMode = "web"
): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  const attributes = Object.entries(props).map(([key, value]) => {
    const name = vanillaIconAttribute(key, mode)
    return name + '="' + escape(String(value)) + '"'
  })
  const tag = mode === "web" ? "icones-icon" : "i"
  const icon =
    "<" + tag + "\n  " + attributes.join("\n  ") + "\n></" + tag + ">"
  return full
    ? icon +
        '\n\n<script type="module">\n  import "@icones/vanilla/' +
        (mode === "web" ? "web-element" : "standard-element") +
        '"\n</script>'
    : icon
}
