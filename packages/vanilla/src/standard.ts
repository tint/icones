import type { IconScope } from "@icones/core"
import { createHtmlIconHost, htmlIconAttributes } from "./html-host"

export type IconBindingRoot = Document | DocumentFragment | Element
export type IconBindingOptions = {
  /** Defaults to document. Includes the root itself when it is an icon host. */
  root?: IconBindingRoot
  /** Attribute prefix, including the trailing hyphen. Defaults to "icon-". */
  attrPrefix?: string
  scope?: IconScope
  /** Defaults to true. With false, call refresh after DOM/attribute changes. */
  observe?: boolean
}
export type IconBinding = {
  refresh(): void
  /** Wait for mounted SVGs, without forcing deferred hosts to activate. */
  load(): Promise<void>
  /** Stop observing and remove only this initializer's generated SVGs. */
  destroy(): void
}

type Host = ReturnType<typeof createHtmlIconHost>
const instances = new WeakMap<IconBindingRoot, Map<string, IconBinding>>()
const owners = new WeakMap<Element, IconBinding>()
function isHost(node: Node, nameAttribute: string): node is HTMLElement {
  const element = node as Element
  return (
    node.nodeType === 1 &&
    element.namespaceURI === "http://www.w3.org/1999/xhtml" &&
    element.localName === "i" &&
    !!element.getAttribute(nameAttribute)?.trim()
  )
}

/** Manage <i> hosts with the configured attribute prefix. A no-op during SSR. */
export function bindIcons(
  options: IconBindingOptions = {}
): IconBinding | undefined {
  const prefix = options.attrPrefix ?? "icon-"
  if (
    typeof prefix !== "string" ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-$/.test(prefix)
  )
    throw new TypeError(
      'attrPrefix must be a lowercase attribute prefix ending in "-", such as "icon-" or "ui-".'
    )
  const nameAttribute = prefix + "name"
  const selector = "i[" + nameAttribute + "]"
  const root = options.root ?? globalThis.document
  if (!root) return
  const registrations = instances.get(root) ?? new Map<string, IconBinding>()
  const existing = registrations.get(prefix)
  if (existing) return existing
  const document =
    root.nodeType === 9 ? (root as Document) : root.ownerDocument!
  const Observer =
    document.defaultView?.MutationObserver ?? globalThis.MutationObserver
  if (options.observe !== false && !Observer)
    throw new Error(
      "Standard elements require MutationObserver, or observe: false."
    )
  const active = new Map<HTMLElement, Host>()
  const cached = new WeakMap<HTMLElement, Host>()
  let destroyed = false
  let observer: MutationObserver | undefined

  function release(element: HTMLElement, host: Host) {
    host.disconnect()
    active.delete(element)
    owners.delete(element)
  }
  function sync(element: HTMLElement) {
    if (destroyed) return
    const owner = owners.get(element)
    if (owner && owner !== handle) return
    if (!root!.contains(element) || !isHost(element, nameAttribute)) {
      const host = active.get(element)
      if (host) release(element, host)
      return
    }
    let host = cached.get(element)
    if (!host) {
      host = createHtmlIconHost(
        element,
        "standard",
        () => options.scope,
        () =>
          !destroyed &&
          root!.contains(element) &&
          owners.get(element) === handle,
        prefix
      )
      cached.set(element, host)
    }
    owners.set(element, handle)
    active.set(element, host)
    host.sync()
  }
  function collect(node: Node) {
    if (isHost(node, nameAttribute)) sync(node)
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11)
      return
    // SVG changes belong to the renderer, not the HTML host scanner.
    if (
      node.nodeType === 1 &&
      (node as Element).namespaceURI !== "http://www.w3.org/1999/xhtml"
    )
      return
    for (const element of (node as ParentNode).querySelectorAll(selector))
      if (isHost(element, nameAttribute)) sync(element)
  }
  function prune() {
    for (const [element, host] of active)
      if (!root!.contains(element) || !isHost(element, nameAttribute))
        release(element, host)
  }
  const handle: IconBinding = {
    refresh() {
      if (destroyed) return
      prune()
      collect(root)
    },
    async load() {
      handle.refresh()
      await Promise.all([...active.values()].map((host) => host.load()))
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      observer?.disconnect()
      for (const [element, host] of active) release(element, host)
      registrations.delete(prefix)
      if (!registrations.size) instances.delete(root)
    },
  }
  if (options.observe !== false) {
    observer = new Observer((records) => {
      if (destroyed) return
      if (records.some((record) => record.removedNodes.length)) prune()
      for (const record of records) {
        if (record.type === "attributes") sync(record.target as HTMLElement)
        else for (const node of record.addedNodes) collect(node)
      }
    })
    observer.observe(root, {
      attributes: true,
      attributeFilter: htmlIconAttributes("standard", prefix),
      childList: true,
      subtree: true,
    })
  }
  registrations.set(prefix, handle)
  instances.set(root, registrations)
  handle.refresh()
  return handle
}
