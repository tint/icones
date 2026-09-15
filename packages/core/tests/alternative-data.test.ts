import { expect, spyOn, test } from "bun:test"
import {
  createIconController,
  createIconScope,
  renderIcon,
  selectIconSource,
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

test("name/data and altName/altData are independent source groups", () => {
  for (const main of [{ name: "primary" }, { data: primary }]) {
    for (const alt of [{ altName: "alternative" }, { altData: alternative }]) {
      const props: IconOptions = { ...main, ...alt }
      expect(selectIconSource(props).source).toBe(
        "name" in main ? "primary" : primary
      )
      expect(selectIconSource({ ...props, showAlt: true }).source).toBe(
        "altName" in alt ? "alternative" : alternative
      )
      const controller = createIconController(
        props,
        createIconScope(scopeOptions)
      )
      expect(controller.getState().data).toBe(primary)
      controller.update({ ...props, showAlt: true })
      expect(controller.getState().data).toBe(alternative)
      controller.update({ ...props, showAlt: false })
      expect(controller.getState().data).toBe(primary)
      controller.destroy()
    }
  }
})

test("data wins within each group, including empty tuples and shared data references", () => {
  const props = {
    name: "primary",
    data: primary,
    altName: "alternative",
    altData: primary,
  }
  expect(selectIconSource(props)).toEqual({ source: primary, name: "primary" })
  expect(selectIconSource({ ...props, showAlt: true })).toEqual({
    source: primary,
    name: "alternative",
  })
  const empty: ElementData = []
  expect(
    selectIconSource({ ...props, altData: empty, showAlt: true }).source
  ).toBe(empty)
  expect(selectIconSource({ ...props, data: empty }).source).toBe(empty)
  expect(selectIconSource({ data: primary, showAlt: true }).source).toBe(
    primary
  )
  expect(
    selectIconSource({ data: primary, altData: undefined, showAlt: true })
      .source
  ).toBe(primary)
  expect(
    selectIconSource({ icon: primary, altIcon: alternative, showAlt: true })
      .source
  ).toBe(alternative)
  expect(
    selectIconSource({
      icon: primary,
      altIcon: primary,
      altData: alternative,
      showAlt: true,
    }).source
  ).toBe(alternative)
})

test("conflicts log once per pair, even when inactive, and reset after resolution", () => {
  const error = spyOn(console, "error").mockImplementation(() => {})
  let calls = 0
  const scope = createIconScope({
    api: () => {
      calls++
      return null
    },
  })
  const props = {
    name: "unused:primary",
    data: primary,
    altName: "unused:alternative",
    altData: alternative,
  }
  const controller = createIconController(props, scope)
  try {
    expect(error).toHaveBeenCalledTimes(2)
    expect(String(error.mock.calls[0][0])).toContain('"data" takes priority')
    expect(String(error.mock.calls[1][0])).toContain('"altData" takes priority')
    expect(controller.getState().data).toBe(primary)
    controller.update({ ...props, showAlt: true })
    expect(controller.getState().data).toBe(alternative)
    renderIcon(controller.getState(), { ...props, showAlt: true })
    controller.update({ ...props, showAlt: false, size: 32 })
    expect(error).toHaveBeenCalledTimes(2)
    controller.update({ data: primary, altData: alternative })
    controller.update(props)
    expect(error).toHaveBeenCalledTimes(4)
    expect(calls).toBe(0)
  } finally {
    controller.destroy()
    error.mockRestore()
  }
})

test("an active missing alternative never falls back to primary data", async () => {
  const controller = createIconController(
    { data: primary, altName: "missing", showAlt: true },
    createIconScope({ api: false })
  )
  try {
    await controller.load()
    expect(controller.getState().data).toBeUndefined()
    expect(
      renderIcon(controller.getState(), {
        data: primary,
        altName: "missing",
        showAlt: true,
      }).available
    ).toBe(false)
  } finally {
    controller.destroy()
  }
})

test("switching to altData ignores a pending named source response", async () => {
  let resolve!: (data: typeof primary) => void
  let start!: () => void
  const started = new Promise<void>((done) => {
    start = done
  })
  const controller = createIconController(
    { name: "slow", altData: alternative },
    createIconScope({
      api: () =>
        new Promise<typeof primary>((done) => {
          resolve = done
          start()
        }),
    })
  )
  try {
    const pending = controller.load()
    await started
    controller.update({ name: "slow", altData: alternative, showAlt: true })
    expect(controller.getState().data).toBe(alternative)
    resolve(primary)
    await pending
    expect(controller.getState().data).toBe(alternative)
  } finally {
    controller.destroy()
  }
})
