import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createIconRepository, updateIconManifest } from "@icones/vite/server"

const roots: string[] = []

async function temp() {
  const root = await mkdtemp(path.join(tmpdir(), "icones-collections-"))
  roots.push(root)
  return root
}

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

test("parallel manifest updates preserve entries, and category moves never change file paths", async () => {
  const root = await temp()
  await Promise.all(
    Array.from({ length: 40 }, (_, index) =>
      updateIconManifest(root, {
        prefix: "app",
        slug: "icon-" + index,
        category: "general",
        variant: "outline",
      })
    )
  )
  const repository = createIconRepository(root)
  await repository.ready()
  expect(repository.records.size).toBe(40)
  const before = repository.resolve("app:icon-0")!.file
  await updateIconManifest(root, {
    prefix: "app",
    slug: "icon-0",
    category: "animals",
    variant: "solid",
  })
  await repository.refresh()
  expect(repository.resolve("app:icon-0")?.file).toBe(before)
  expect(
    (await repository.catalog({ variant: "solid", category: "animals" })).total
  ).toBe(1)
  const page = await repository.catalog()
  page.variants![0]!.count = 999
  expect((await repository.catalog()).variants![0]!.count).toBe(39)
})
