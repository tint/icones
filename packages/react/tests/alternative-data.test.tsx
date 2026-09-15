import { expect, spyOn, test } from "bun:test"
import { act } from "react"
import { renderToStaticMarkup, renderToString } from "react-dom/server"
import { JSDOM } from "jsdom"
import { Icon, IconConfig, type IconProps } from "@icones/react"
import {
  createIconController,
  createIconScope,
  renderIcon,
  type ElementData,
  type IconOptions,
} from "@icones/core"

const primary = {
  body: '<circle cx="12" cy="12" r="8"/>',
  width: 24,
  height: 24,
}

const alternative: ElementData = [
  ["path", { d: "M2 12h20", stroke: "currentColor" }],
]

const scopeOptions = { sources: { primary, alternative }, api: false as const }

function view(props: IconProps) {
  return (
    <IconConfig api={false}>
      <Icon {...props} />
    </IconConfig>
  )
}

test("collections use sources and exact names for both source groups", () => {
  const error = spyOn(console, "error").mockImplementation(() => {})
  const props = {
    name: "main:one",
    altName: "alt:two",
    showAlt: true,
  }
  const config = {
    sources: {
      main: { prefix: "main", icons: { one: primary } },
      alt: {
        prefix: "alt",
        icons: { two: { body: '<rect width="24" height="12"/>' } },
      },
    },
    api: false as const,
  }
  const controller = createIconController(props, createIconScope(config))
  try {
    expect(controller.getState().data).toEqual(config.sources.alt.icons.two)
    expect(
      renderIcon(controller.getState(), props).attributes["data-icon"]
    ).toBe("alt:two")
    controller.update({ ...props, showAlt: false })
    expect(controller.getState().data).toEqual(primary)
    expect(error).not.toHaveBeenCalled()
    const html = renderToStaticMarkup(
      <IconConfig {...config}>
        <Icon {...props} />
      </IconConfig>
    )
    expect(html).toContain("<rect")
    expect(html).toContain('data-icon="alt:two"')
    expect(error).not.toHaveBeenCalled()
  } finally {
    controller.destroy()
    error.mockRestore()
  }
})

test("JavaScript callers receive migration guidance for collections and names in inline data", () => {
  const collection = { prefix: "main", icons: { one: primary } }
  for (const prop of ["data", "altData"] as const) {
    for (const value of [collection, "main:one"]) {
      for (const showAlt of [false, true]) {
        const props = {
          name: "main:one",
          [prop]: value,
          showAlt,
        }
        expect(() =>
          createIconController(
            props as unknown as IconOptions,
            createIconScope({ api: false })
          )
        ).toThrow(`"${prop}" must contain a single icon's data`)
        expect(() =>
          renderToStaticMarkup(<Icon {...(props as unknown as IconProps)} />)
        ).toThrow('Register collections with "sources"')
      }
    }
  }
})

test("React SSR supports both source groups without leaking component props to SVG", () => {
  for (const main of [{ name: "primary" }, { data: primary }]) {
    for (const alt of [{ altName: "alternative" }, { altData: alternative }]) {
      for (const showAlt of [false, true]) {
        const html = renderToStaticMarkup(
          <IconConfig {...scopeOptions}>
            <Icon {...main} {...alt} showAlt={showAlt} />
          </IconConfig>
        )
        expect(html).toContain(showAlt ? "<path" : "<circle")
        expect(html).not.toContain(showAlt ? "<circle" : "<path")
        expect(html).not.toMatch(/\s(?:data|altData|altName|showAlt|altIcon)=/i)
        if (showAlt && "altData" in alt)
          expect(html).not.toContain("data-icon=")
      }
    }
  }
})

test("React reports both conflicts once and renders the selected data", () => {
  const error = spyOn(console, "error").mockImplementation(() => {})
  try {
    const html = renderToStaticMarkup(
      <Icon
        name="unused:main"
        data={primary}
        altName="unused:alt"
        altData={alternative}
        showAlt
      />
    )
    expect(html).toContain("<path")
    expect(html).not.toContain("<circle")
    expect(error).toHaveBeenCalledTimes(2)
    expect(String(error.mock.calls[0][0])).toContain('"name" and "data"')
    expect(String(error.mock.calls[1][0])).toContain('"altName" and "altData"')
  } finally {
    error.mockRestore()
  }
})

test("React hydrates altData and updates both inline sources without repeated diagnostics", async () => {
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
  const { hydrateRoot } = await import("react-dom/client")
  const host = document.getElementById("root")!
  const props = { data: primary, altData: alternative, showAlt: true }
  host.innerHTML = renderToString(view(props))
  const recoverable: unknown[] = []
  const error = spyOn(console, "error").mockImplementation(() => {})
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(async () => {
      root = hydrateRoot(host, view(props), {
        onRecoverableError: (err) => recoverable.push(err),
      })
    })
    expect(host.querySelector("path")).not.toBeNull()
    expect(recoverable).toEqual([])
    expect(error).not.toHaveBeenCalled()
    const invalid = { ...props, name: "unused:main", altName: "unused:alt" }
    await act(async () => root!.render(view(invalid)))
    expect(error).toHaveBeenCalledTimes(2)
    await act(async () => root!.render(view({ ...invalid, showAlt: false })))
    expect(host.querySelector("circle")).not.toBeNull()
    await act(async () => root!.render(view({ ...invalid, altData: primary })))
    expect(host.querySelector("circle")).not.toBeNull()
    expect(host.querySelector("path")).toBeNull()
    expect(error).toHaveBeenCalledTimes(2)
  } finally {
    await act(async () => root?.unmount())
    error.mockRestore()
    dom.window.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
