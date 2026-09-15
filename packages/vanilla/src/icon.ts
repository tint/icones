import {
  createIconController,
  defaultIconScope,
  renderIcon,
  iconStyleText,
  type IconOptions,
  type IconScope,
} from "@icones/core"

export type IconProps = IconOptions & {
  class?: string
  id?: string
  style?: string | Record<string, string | number | undefined>
  attributes?: Record<string, string | number | boolean | undefined>
}
export type IconHandle = {
  element: SVGSVGElement
  update(props: IconProps, scope?: IconScope): void
  load(): Promise<void>
  destroy(): void
}
let nextId = 0

/** Create a managed SVG. Call destroy when its owner is removed. */
export function createIcon(
  initial: IconProps,
  options: { scope?: IconScope; document?: Document } = {}
): IconHandle {
  // Use explicit document for SSR/custom DOM; default to global document in browser.
  const doc = options.document ?? globalThis.document
  if (!doc)
    throw new Error(
      "createIcon requires a Document. Use renderIcon for server rendering."
    )
  const element = doc.createElementNS("http://www.w3.org/2000/svg", "svg")
  const instanceId = `vanilla-${++nextId}`
  let props = initial
  let scope = options.scope ?? defaultIconScope()
  let destroyed = false
  const controller = createIconController(props, scope)
  const applied = new Set<string>()
  function paint() {
    if (destroyed) return
    // RenderIcon returns attributes/body + loading state used to drive DOM.
    const result = renderIcon(
      controller.getState(),
      props,
      scope.appearance,
      instanceId
    )
    const attributes = {
      ...props.attributes,
      ...result.attributes,
      class: props.class,
      id: props.id,
    }
    for (const key of applied) element.removeAttribute(key)
    applied.clear()
    for (const [key, value] of Object.entries(attributes)) {
      if (value === undefined || /^on/i.test(key) || key === "innerHTML")
        continue
      element.setAttribute(key, String(value))
      applied.add(key)
    }
    element.style.cssText = iconStyleText(result.style)
    if (typeof props.style === "string")
      element.style.cssText += ";" + props.style
    else
      for (const [key, value] of Object.entries(props.style ?? {})) {
        if (value !== undefined) element.style.setProperty(key, String(value))
      }
    element.innerHTML = result.body
  }
  const unsubscribe = controller.subscribe(paint)
  paint()
  return {
    element,
    update(next, nextScope = scope) {
      if (destroyed) throw new Error("Icon has been destroyed.")
      props = next
      scope = nextScope
      controller.update(props, scope)
    },
    async load() {
      // Trigger async download and immediately repaint when resolved.
      await controller.load()
      paint()
    },
    destroy() {
      // Ensure DOM cleanup and store unsubscribes happen once.
      destroyed = true
      unsubscribe()
      controller.destroy()
      element.remove()
    },
  }
}

export function mountIcon(
  target: Element,
  props: IconProps,
  scope?: IconScope
) {
  // Convenience helper for immediate mount into an existing element.
  const icon = createIcon(props, { scope, document: target.ownerDocument })
  target.append(icon.element)
  return icon
}
