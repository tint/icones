/** Normalize an ASCII slug; the caller decides how to handle an empty result. */
export function toAsciiSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
