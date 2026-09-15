import type { IconScope } from "@icones/core"
import { createHtmlIconHost, htmlIconAttributes } from "./html-host"

export interface IconElement extends HTMLElement {
  /** Per-element configuration. Unset to use the registration's default scope. */
  scope: IconScope | undefined
  /** Wait for the current SVG without activating a deferred element. */
  load(): Promise<void>
}
export type IconElementConstructor = CustomElementConstructor & {
  new (): IconElement
}
export type DefineIconElementOptions = {
  /** Defaults to the current window. Useful for iframes and DOM tests. */
  window?: {
    HTMLElement: typeof HTMLElement
    customElements: CustomElementRegistry
  }
  /** Initial default for this registry. Set element.scope for per-icon scopes. */
  scope?: IconScope
}

declare global {
  interface HTMLElementTagNameMap {
    "icones-icon": IconElement
  }
}

const tagName = "icones-icon"
const brand = Symbol.for("@icones/vanilla/element")
/** Register the light-DOM Web Component. Safe to import/call without a browser. */
export function defineIconElement(
  options: DefineIconElementOptions = {}
): IconElementConstructor | undefined {
  const view =
    options.window ?? (typeof window === "undefined" ? undefined : window)
  // Graceful no-op on environments without custom elements (SSR/tests without browser).
  if (!view?.customElements || !view.HTMLElement) {
    return
  }
  const existing = view.customElements.get(tagName)
  if (existing) {
    if (!(existing as unknown as Record<symbol, unknown>)[brand]) {
      throw new Error("icones-icon is already registered by another component.")
    }
    return existing as IconElementConstructor
  }

  class IconesElement extends view.HTMLElement implements IconElement {
    static readonly [brand] = true
    static readonly observedAttributes = htmlIconAttributes("web")
    #scope?: IconScope
    #upgraded = false
    #host = createHtmlIconHost(
      this,
      "web",
      () => this.#scope ?? options.scope,
      () => this.isConnected
    )

    get scope() {
      return this.#scope
    }
    set scope(value: IconScope | undefined) {
      this.#scope = value
      this.#host.sync()
    }

    connectedCallback() {
      // Preserve properties assigned before upgrade; copy them into the private field.
      if (!this.#upgraded) {
        this.#upgraded = true
        if (Object.hasOwn(this, "scope")) {
          const value = this.scope
          Reflect.deleteProperty(this, "scope")
          this.#scope = value
        }
      }
      this.#host.sync()
    }

    disconnectedCallback() {
      this.#host.disconnect()
    }

    attributeChangedCallback(
      _name: string,
      previous: string | null,
      next: string | null
    ) {
      if (previous !== next && this.#upgraded) this.#host.sync()
    }

    async load() {
      await this.#host.load()
    }
  }
  view.customElements.define(tagName, IconesElement)
  return IconesElement
}
