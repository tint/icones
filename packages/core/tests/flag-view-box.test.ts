import { expect, test } from "bun:test"
import { getIconViewBox, iconViewBoxes } from "@icones/core"

test("three built-in viewports are selected by Flag namespace and exact variant suffix", () => {
  expect(iconViewBoxes).toEqual({
    default: "0 0 24 24",
    flagSquare: "0 0 512 512",
    flagLandscape: "0 0 640 480",
  })
  expect(Object.isFrozen(iconViewBoxes)).toBe(true)
  expect(getIconViewBox()).toBe(iconViewBoxes.default)
  expect(getIconViewBox("tabler:circle")).toBe(iconViewBoxes.default)
  expect(getIconViewBox("app:flag-square")).toBe(iconViewBoxes.default)
  expect(getIconViewBox("flag:us-circle")).toBe(iconViewBoxes.flagSquare)
  expect(getIconViewBox("flag:us-square")).toBe(iconViewBoxes.flagSquare)
  expect(getIconViewBox("flag:us")).toBe(iconViewBoxes.flagLandscape)
  expect(getIconViewBox("flag:circle-other")).toBe(iconViewBoxes.flagLandscape)
})
