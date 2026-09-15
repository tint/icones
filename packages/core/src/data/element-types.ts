// JSON-safe React-style SVG tuples; nested SVG nodes retain their structure.
export type ElementNode = readonly [string, ElementAttributes]
export type ElementChild = ElementNode | string
export type ElementAttributes = {
  readonly [key: string]: string | number | readonly ElementChild[]
}
export type ElementData = readonly ElementNode[]
