import { defaultIconScope, type IconScope } from "@icones/core"
import { mountIcon, type IconHandle, type IconProps } from "./icon"

type Mode = "web" | "standard"
const props = [
  "name",
  "size",
  "width",
  "height",
  "color",
  "fill",
  "stroke-width",
  "absolute-stroke-width",
  "rotate",
  "h-flip",
  "v-flip",
  "alt-name",
  "show-alt",
  "label",
  "hidden",
  "role",
  "class",
  "defer",
]
const webAttributes: Record<string, string> = {
  hidden: "decorative",
  role: "svg-role",
  class: "svg-class",
}
/** Translate standardized attribute names for standard-element/web-component hosts. */
function attribute(mode: Mode, name: string, prefix: string) {
  return mode === "standard" ? prefix + name : (webAttributes[name] ?? name)
}
/** List all host attributes that can influence icon rendering. */
export function htmlIconAttributes(mode: Mode, prefix = "icon-") {
  return props.map((name) => attribute(mode, name, prefix))
}

/** Parse host attributes into typed icon props, with camelCase conversions pre-handled. */
function readProps(read: (name: string) => string | null): IconProps {
  const text = (name: string) => read(name)?.trim() || undefined
  const number = (name: string) => {
    const value = text(name)
    return value !== undefined && Number.isFinite(Number(value))
      ? Number(value)
      : undefined
  }
  const boolean = (name: string) => {
    const value = read(name)?.trim()
    return value === "" || value === "true"
      ? true
      : value === "false"
        ? false
        : undefined
  }
  const dimension = (name: string) => number(name) ?? text(name)
  return {
    name: text("name")!,
    size: dimension("size") as IconProps["size"],
    width: dimension("width"),
    height: dimension("height"),
    color: text("color"),
    fill: text("fill"),
    strokeWidth: number("stroke-width"),
    style:
      text("stroke-width") === "original"
        ? { "--icones-stroke-width": "initial" }
        : undefined,
    absoluteStrokeWidth: boolean("absolute-stroke-width"),
    rotate: number("rotate"),
    hFlip: boolean("h-flip"),
    vFlip: boolean("v-flip"),
    altName: text("alt-name"),
    showAlt: boolean("show-alt"),
    "aria-label": text("label"),
    "aria-hidden": boolean("hidden"),
    role: text("role"),
    class: text("class"),
  }
}

type IntersectionGroup = {
  observer: IntersectionObserver
  callbacks: Map<Element, () => void>
}
const intersections = new WeakMap<Document, IntersectionGroup>()
/** Optional lazy-load helper for `defer="intersect"` strategy. */
function waitForIntersection(
  host: Element,
  activate: () => void
): (() => void) | undefined {
  const document = host.ownerDocument
  const Observer = document.defaultView?.IntersectionObserver
  if (!Observer) return
  let group = intersections.get(document)
  if (!group) {
    const callbacks = new Map<Element, () => void>()
    const observer = new Observer((records) => {
      for (const record of records)
        if (record.isIntersecting) callbacks.get(record.target)?.()
    })
    group = { observer, callbacks }
    intersections.set(document, group)
  }
  const current = group
  current.callbacks.set(host, activate)
  current.observer.observe(host)
  return () => {
    current.callbacks.delete(host)
    current.observer.unobserve(host)
    if (!current.callbacks.size) {
      current.observer.disconnect()
      intersections.delete(document)
    }
  }
}

/**
 * Shared light-DOM rendering and lazy-load deferral used by both HTML APIs.
 */
export function createHtmlIconHost(
  host: HTMLElement,
  mode: Mode,
  getScope: () => IconScope | undefined,
  isActive: () => boolean,
  prefix = "icon-"
) {
  const read = (name: string) =>
    host.getAttribute(attribute(mode, name, prefix))
  let icon: IconHandle | undefined
  let activated = false
  let waiting: string | undefined
  let cancelWait: (() => void) | undefined
  let signature: string | undefined
  let previousScope: IconScope | undefined

  /** Cancel pending deferral callbacks and reset transition state. */
  function stopWaiting() {
    cancelWait?.()
    cancelWait = undefined
    waiting = undefined
  }
  /** Unmount any mounted icon and clear pending activation timers. */
  function disconnect() {
    stopWaiting()
    icon?.destroy()
    icon = undefined
  }
  /** Move from deferred to active rendering when trigger condition is satisfied. */
  function activate(trigger: "intersect" | "domready") {
    if (waiting !== trigger) return
    stopWaiting()
    // A DOM event can arrive before the standard-element mutation callback.
    if (!isActive() || !read("name")?.trim()) {
      disconnect()
      return
    }
    if (read("defer")?.trim() !== trigger) {
      sync()
      return
    }
    activated = true
    sync()
  }
  /** Reconcile host attributes into mounted SVG or mount one-time if absent. */
  function sync() {
    if (!isActive() || !read("name")?.trim()) {
      disconnect()
      return
    }
    if (!activated) {
      const defer = read("defer")?.trim()
      if (waiting !== defer) stopWaiting()
      if (defer === "domready" && host.ownerDocument.readyState === "loading") {
        if (!cancelWait) {
          const document = host.ownerDocument
          waiting = defer
          const ready = () => activate("domready")
          document.addEventListener("DOMContentLoaded", ready, {
            once: true,
          })
          cancelWait = () =>
            document.removeEventListener("DOMContentLoaded", ready)
        }
        return
      }
      if (defer === "intersect") {
        if (!cancelWait) {
          waiting = defer
          cancelWait = waitForIntersection(host, () => activate("intersect"))
        }
        if (cancelWait) return
      }
      stopWaiting()
      activated = true
    }
    const scope = getScope() ?? defaultIconScope()
    const nextSignature = JSON.stringify(props.map(read))
    if (icon) {
      if (signature !== nextSignature || previousScope !== scope)
        icon.update(readProps(read), scope)
      if (icon.element.parentNode !== host) host.append(icon.element)
    } else icon = mountIcon(host, readProps(read), scope)
    signature = nextSignature
    previousScope = scope
  }
  return {
    sync,
    disconnect,
    async load() {
      await icon?.load()
    },
  }
}
