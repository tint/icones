import { expect, test } from "bun:test"
import { act, createRef, type ReactNode } from "react"
import { renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import { Button, type ButtonProps } from "../src/shared/ui/button.tsx"

function markup(node: ReactNode) {
  return JSDOM.fragment(renderToString(node)).firstElementChild!
}

test("Button keeps native button semantics and an overridable default type", () => {
  const button = markup(
    <Button name="action" value="save">
      Save
    </Button>
  )
  expect(button.tagName).toBe("BUTTON")
  expect(button.getAttribute("type")).toBe("button")
  expect(button.getAttribute("name")).toBe("action")
  expect(button.getAttribute("value")).toBe("save")
  expect(button.hasAttribute("href")).toBe(false)
  for (const type of ["submit", "reset"] as const) {
    const control = markup(<Button type={type} form="settings" disabled />)
    expect(control.getAttribute("type")).toBe(type)
    expect(control.getAttribute("form")).toBe("settings")
    expect(control.hasAttribute("disabled")).toBe(true)
  }
})

test("href renders a native anchor with download, security and accessibility attributes", () => {
  const link = markup(
    <Button
      href="/llms.txt"
      download="icones-guide.txt"
      target="_blank"
      rel="noopener noreferrer"
      hrefLang="en"
      referrerPolicy="no-referrer"
      aria-label="Download the guide"
      data-purpose="download"
    >
      Download
    </Button>
  )
  expect(link.tagName).toBe("A")
  for (const [attribute, value] of Object.entries({
    href: "/llms.txt",
    download: "icones-guide.txt",
    target: "_blank",
    rel: "noopener noreferrer",
    hreflang: "en",
    referrerpolicy: "no-referrer",
    "aria-label": "Download the guide",
    "data-purpose": "download",
  }))
    expect(link.getAttribute(attribute)).toBe(value)
  expect(link.hasAttribute("type")).toBe(false)
  expect(link.hasAttribute("role")).toBe(false)
  expect(link.hasAttribute("disabled")).toBe(false)
  const typedLink = markup(<Button href="/llms.txt" type="text/plain" />)
  expect(typedLink.getAttribute("type")).toBe("text/plain")
  expect(markup(<Button href="" />).tagName).toBe("A")
})

test("button and link share styling and allow utility overrides", () => {
  const button = markup(<Button />)
  const link = markup(<Button href="/guide" />)
  expect(button.className).toBe(link.className)
  expect(button.classList.contains("rounded-lg")).toBe(true)
  for (const element of [
    markup(<Button className="rounded-full px-6" />),
    markup(<Button href="/guide" className="rounded-full px-6" />),
  ]) {
    expect(element.classList.contains("rounded-full")).toBe(true)
    expect(element.classList.contains("rounded-lg")).toBe(false)
    expect(element.classList.contains("px-3")).toBe(false)
    expect(element.classList.contains("px-6")).toBe(true)
  }
})

test("both variants forward refs and correctly typed native click events without a router", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "https://icons.test/",
  })
  const previous = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  const { createRoot } = await import("react-dom/client")
  const root = createRoot(dom.window.document.getElementById("root")!)
  const buttonRef = createRef<HTMLButtonElement>()
  const anchorRef = createRef<HTMLAnchorElement>()
  const clicks: Element[] = []
  try {
    await act(async () => {
      root.render(
        <>
          <Button
            ref={buttonRef}
            onClick={(event) => {
              const target: HTMLButtonElement = event.currentTarget
              clicks.push(target)
            }}
          >
            Save
          </Button>
          <Button
            href="/llms.txt"
            ref={anchorRef}
            onClick={(event) => {
              event.preventDefault()
              const target: HTMLAnchorElement = event.currentTarget
              clicks.push(target)
            }}
          >
            Download
          </Button>
        </>
      )
    })
    expect(buttonRef.current).toBeInstanceOf(dom.window.HTMLButtonElement)
    expect(anchorRef.current).toBeInstanceOf(dom.window.HTMLAnchorElement)
    await act(async () => {
      buttonRef.current!.click()
      anchorRef.current!.click()
    })
    expect(clicks).toEqual([buttonRef.current!, anchorRef.current!])
    await act(async () =>
      root.render(
        <Button
          ref={buttonRef}
          disabled
          onClick={() => clicks.push(buttonRef.current!)}
        />
      )
    )
    await act(async () => buttonRef.current!.click())
    expect(clicks).toHaveLength(2)
    expect(anchorRef.current).toBeNull()
  } finally {
    await act(async () => root.unmount())
    expect(buttonRef.current).toBeNull()
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})

// Compiled by tsconfig.tests.json: native-only props/ref types cannot cross variants.
export function buttonTypeAssertions() {
  const buttonRef = createRef<HTMLButtonElement>()
  const anchorRef = createRef<HTMLAnchorElement>()
  const linkProps: ButtonProps = { href: "/guide", target: "_blank" }
  const buttonProps: ButtonProps = { type: "submit", disabled: true }
  const valid = (
    <>
      <Button {...linkProps} />
      <Button {...buttonProps} />
    </>
  )
  // @ts-expect-error Native anchors do not support disabled.
  const disabledLink = <Button href="/guide" disabled />
  // @ts-expect-error An anchor destination is required for target.
  const missingHref = <Button target="_blank" />
  // @ts-expect-error Anchor refs cannot be used for buttons.
  const anchorOnButton = <Button ref={anchorRef} />
  // @ts-expect-error Button refs cannot be used for anchors.
  const buttonOnAnchor = <Button href="/guide" ref={buttonRef} />
  // @ts-expect-error Form actions apply to buttons, not anchors.
  const formLink = <Button href="/guide" formAction="/save" />
  return [
    valid,
    disabledLink,
    missingHref,
    anchorOnButton,
    buttonOnAnchor,
    formLink,
  ]
}
