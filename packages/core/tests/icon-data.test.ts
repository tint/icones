import { expect, test } from "bun:test"
import {
  readIconSet,
  resolveSetIcon,
  type IconData,
  type IconSet,
} from "@icones/core/icon-data"

const icon: IconData = { body: '<path d="M2 12h20"/>', width: 24, height: 24 }

test("local collection inheritance is bounded, immutable and ignores prototype entries", () => {
  const set: IconSet = {
    prefix: "demo",
    width: 48,
    height: 32,
    icons: { star: { body: icon.body, hFlip: true, rotate: 1 } },
    aliases: {
      reverse: { parent: "star", hFlip: true, rotate: 3, width: 64 },
      inherited: { parent: "reverse", top: 2 },
      cycle: { parent: "cycle" },
    },
  }
  const original = structuredClone(set)
  expect(resolveSetIcon(readIconSet(set), "inherited")).toEqual({
    body: icon.body,
    width: 64,
    height: 32,
    top: 2,
    hFlip: false,
    rotate: 0,
  })
  expect(resolveSetIcon(set, "cycle")).toBeNull()
  expect(resolveSetIcon(set, "missing")).toBeNull()
  expect(resolveSetIcon(set, "toString")).toBeNull()
  expect(set).toEqual(original)
  for (const value of [
    { prefix: "bad", icons: [] },
    { prefix: "bad", icons: { star: { body: 1 } } },
    { ...set, width: NaN },
    { ...set, aliases: { missing: { parent: "absent" } } },
    { ...set, aliases: [] },
  ])
    expect(() => readIconSet(value)).toThrow()
})
