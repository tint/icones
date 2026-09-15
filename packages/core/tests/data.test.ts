import { afterEach, expect, test } from "bun:test"
import {
  addIconData,
  addIconSet,
  clearIconData,
  createFileIconLoader,
  loadIconData,
  resolveIconData,
  type IconData,
  type IconSet,
} from "@icones/core"

const circle: IconData = {
  body: '<circle cx="12" cy="12" r="10"/>',
  width: 24,
  height: 24,
}

const brands: IconSet = {
  prefix: "brand",
  width: 24,
  height: 24,
  icons: {
    github: circle,
  },
  aliases: {
    hub: {
      parent: "github",
      hFlip: true,
    },
  },
}

afterEach(() => {
  clearIconData()
})

test("registers a set for dynamic hyphen names", () => {
  addIconSet(brands)

  expect(resolveIconData("brand-github")).toHaveProperty("body", circle.body)
  expect(resolveIconData("brand:hub")).toHaveProperty("hFlip", true)
})

test("registers individual icon data", () => {
  addIconData("custom-circle", circle)

  expect(resolveIconData("custom-circle")).toBe(circle)
})

test("deduplicates concurrent dynamic requests", async () => {
  let requestCount = 0
  const loader = async () => {
    requestCount += 1
    await Promise.resolve()
    return circle
  }

  const [first, second] = await Promise.all([
    loadIconData("brand-github", loader),
    loadIconData("brand-github", loader),
  ])

  expect(first).toBe(circle)
  expect(second).toBe(circle)
  expect(requestCount).toBe(1)
})

test("loads a dynamically computed name from a standalone JSON file", async () => {
  const requests: string[] = []
  const loader = createFileIconLoader({
    baseUrl: "/icon-data/",
    fetch: async (input) => {
      requests.push(String(input))
      return new Response(JSON.stringify(circle), {
        headers: { "content-type": "application/json" },
      })
    },
  })
  const name = "github"

  const data = await loadIconData(`brand-${name}`, loader)

  expect(data).toEqual(circle)
  expect(requests).toEqual(["/icon-data/brand-github.json"])
})
