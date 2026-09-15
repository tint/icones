import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { parseElementData } from "@icones/core/elements"
import { elementDataToIcon } from "@icones/core/svg-data"
import {
  iconToElementData,
  svgToElementData,
} from "@icones/vite/tooling/elements"
import { readElementData } from "@icones/core/elements"

test("standalone SVG documents accept XML declarations without weakening fragment validation", () => {
  const svg = '<svg viewBox="0 0 1024 1024"><path d="M0 0h10v10z"/></svg>'
  expect(
    svgToElementData('<?xml version="1.0" standalone="no"?>\n' + svg)
  ).toEqual(svgToElementData(svg))
  expect(() => svgToElementData(svg + svg)).toThrow()
  expect(() => svgToElementData("<svg><path/></bad>")).toThrow()
  expect(() =>
    iconToElementData({ body: '<?xml version="1.0"?><path/>' })
  ).toThrow()
})

test("preserves nested groups, gradients, namespaces, attribute case and text entities", () => {
  const data = iconToElementData({
    width: 24,
    height: 24,
    body: '<defs><linearGradient id="paint" gradientUnits="userSpaceOnUse"><stop stop-color="#f00" offset="0"/><stop stop-color="#00f" offset="1"/></linearGradient></defs><g transform="translate(1 2)" fill="url(#paint)"><path id="shape" fill-rule="evenodd" d="M0 0h8v8H0z"/><use xlink:href="#shape"/></g><text xml:space="preserve">A &amp; <tspan>B</tspan> &lt; C</text>',
  })
  const converted = elementDataToIcon(data)
  const dom = new JSDOM(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${converted.body}</svg>`,
    { contentType: "image/svg+xml" }
  )
  try {
    const document = dom.window.document
    expect(
      document.querySelector("linearGradient")?.getAttribute("gradientUnits")
    ).toBe("userSpaceOnUse")
    expect(document.querySelectorAll("linearGradient > stop")).toHaveLength(2)
    expect(document.querySelector("g")?.getAttribute("transform")).toBe(
      "translate(1 2)"
    )
    expect(document.querySelector("path")?.getAttribute("fill-rule")).toBe(
      "evenodd"
    )
    expect(document.querySelector("use")?.getAttribute("xlink:href")).toBe(
      "#shape"
    )
    expect(document.querySelector("text")?.textContent).toBe("A & B < C")
    expect(document.querySelector("text")?.getAttribute("xml:space")).toBe(
      "preserve"
    )
    expect(JSON.stringify(data)).toContain('"stopColor"')
    expect(JSON.stringify(data)).toContain('"children"')
  } finally {
    dom.window.close()
  }
})

test("an actual nested SVG is not mistaken for the tuple viewport wrapper", () => {
  const data = iconToElementData({
    width: 24,
    height: 24,
    body: '<svg x="4" y="6" width="8" height="8" viewBox="0 0 16 16"><path d="M0 0h16v16H0z"/></svg>',
  })
  const converted = elementDataToIcon(data)
  expect(converted.width).toBe(24)
  expect(converted.height).toBe(24)
  expect(converted.body).toContain(
    '<svg x="4" y="6" width="8" height="8" viewBox="0 0 16 16"'
  )
})

test("malformed XML, raw body files and malformed nested tuples are rejected", () => {
  expect(() => iconToElementData({ body: "<g><path/></bad>" })).toThrow()
  expect(() => iconToElementData({ body: "<path/>", width: 0 })).toThrow()
  expect(() => readElementData({ body: "<path/>" }, "test:old")).toThrow(
    "tuple"
  )
  expect(() => readElementData([], "test:empty")).toThrow("tuple")
  for (const data of [
    [["path"]],
    [["g", { children: [["path", null]] }]],
    [["path", { width: Infinity }]],
    [["path", { 'x" onclick': "bad" }]],
  ])
    expect(() => parseElementData(data)).toThrow()
})
