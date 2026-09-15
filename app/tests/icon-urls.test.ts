import { expect, test } from "bun:test"
import { createIconUrls } from "../src/shared/icons/urls.ts"

test("local development and shared custom roots retain the original file layout", () => {
  const local = createIconUrls()
  expect(local.dataUrl("tabler", "star")).toBe("/icons/tabler/data/star.json")
  expect(local.symbolUrl("flag", "us-circle")).toBe(
    "/icons/flag/symbols/us-circle.svg#icon"
  )
  const external = createIconUrls({ dataBaseUrl: "https://cdn.test/icons/" })
  expect(external.catalogBaseUrl).toBe("/icons")
  expect(external.dataUrl("tabler", "star")).toBe(
    "https://cdn.test/icons/tabler/data/star.json"
  )
})

test("split artwork hosts do not move the catalog or duplicate the collection prefix", () => {
  const urls = createIconUrls({
    catalogBaseUrl: "/preview/icons/",
    collectionUrl: "https://{set}.icones.go-slim.dev/",
  })
  expect(urls.catalogBaseUrl).toBe("/preview/icons")
  expect(urls.dataUrl("tabler", "star")).toBe(
    "https://tabler.icones.go-slim.dev/data/star.json"
  )
  expect(urls.symbolUrl("flag", "us-circle")).toBe(
    "https://flag.icones.go-slim.dev/symbols/us-circle.svg#icon"
  )
  expect(urls.collectionBaseUrl("huge") + "/license.txt").toBe(
    "https://huge.icones.go-slim.dev/license.txt"
  )
})

test("templates support a CDN path and reject malformed origins or prefixes", () => {
  const urls = createIconUrls({ collectionUrl: "https://cdn.test/v1/{set}" })
  expect(urls.dataUrl("tabler", "star")).toBe(
    "https://cdn.test/v1/tabler/data/star.json"
  )
  expect(() => urls.dataUrl("../tabler", "star")).toThrow("prefix")
  for (const collectionUrl of [
    "https://cdn.test",
    "ftp://{set}.test",
    "https://user:pass@{set}.test",
    "https://{set}.test/?q=x",
    "https://{set}.test/#x",
  ])
    expect(() => createIconUrls({ collectionUrl })).toThrow()
})
