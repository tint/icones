import { expect, test } from "bun:test"
import {
  languageFromPath,
  languageHref,
  languageBasename,
  localePage,
} from "../src/shared/i18n/locale-routing.ts"
import { loadLocaleMessages } from "../src/shared/i18n/locale-document.ts"

test("locale links preserve routes, filters, hashes and deployment bases", () => {
  const route = "/guide/vanilla/standard/icon-config?set=flag#options"
  expect(languageHref("zh-CN", route)).toBe("/zh-CN" + route)
  expect(languageHref("en-US", route)).toBe(route)
  expect(languageHref("en-US", route, "/docs/")).toBe("/docs" + route)
  expect(languageBasename("en-US")).toBe("/")
  expect(languageBasename("zh-CN", "/docs/")).toBe("/docs/zh-CN")
  expect(languageFromPath("/zh-CN/guide")).toBe("zh-CN")
  expect(languageFromPath("/zh-CN-extra/guide")).toBeUndefined()
  expect(localePage("/zh-CN/guide/index.html")).toEqual({
    language: "zh-CN",
    route: "/guide",
  })
  expect(localePage("/guide")).toEqual({ language: "en-US", route: "/guide" })
  expect(localePage("/docs/en-US/guide", "/docs/")).toEqual({
    language: "en-US",
    route: "/guide",
  })
})

test("locale loading rejects missing or malformed dictionaries", async () => {
  for (const value of [null, [], { title: 12 }])
    await expect(
      loadLocaleMessages("zh-CN", "/", async () => Response.json(value))
    ).rejects.toThrow("Invalid locale dictionary")
  await expect(
    loadLocaleMessages(
      "zh-CN",
      "/",
      async () => new Response(null, { status: 404 })
    )
  ).rejects.toThrow("Unable to load locale: 404")
})
