import { expect, test } from "bun:test"
import { createIconStore, type IconLoader } from "@icones/core"

const line = { body: "<path/>" }

const circle = { body: "<circle/>" }

test("load promise is installed before subscribers receive loading state", async () => {
  const store = createIconStore({ api: () => line })
  let nested: Promise<unknown> | undefined
  const unsubscribe = store.subscribe("x:one", () => {
    if (store.getState("x:one").status === "loading")
      nested = store.load("x:one")
  })
  const request = store.load("x:one")
  expect(nested).toBe(request)
  await request
  unsubscribe()
})

test("invalid cache and queue limits fail immediately", () => {
  expect(() => createIconStore({ concurrency: NaN })).toThrow(RangeError)
  expect(() => createIconStore({ maxEntries: 0 })).toThrow(RangeError)
  expect(() => createIconStore({ timeout: Infinity })).toThrow(RangeError)
})

test("failed loads retry; missing results have TTL and explicit retry", async () => {
  let calls = 0
  const store = createIconStore({
    api: async () => {
      calls++
      if (calls === 1) throw new Error("Temporary failure")
      return line
    },
  })
  await expect(store.load("x:one")).rejects.toThrow("Temporary")
  expect(await store.load("x:one")).toEqual(line)
  let missingCalls = 0
  const missing = createIconStore({
    api: () => {
      missingCalls++
      return null
    },
    missingTtl: 1000,
  })
  await missing.load("x:one")
  await missing.load("x:one")
  expect(missingCalls).toBe(1)
  await missing.retry("x:one")
  expect(missingCalls).toBe(2)
  const expires = createIconStore({
    api: () => {
      missingCalls++
      return null
    },
    missingTtl: 0,
  })
  await expires.load("x:one")
  await expires.load("x:one")
  expect(missingCalls).toBe(4)
})

test("API overrides inherit explicit sources, not another scope's fetched data", async () => {
  const parent = createIconStore({ sources: { Local: line }, api: () => line })
  await parent.preload(["x:remote"])
  const child = createIconStore({ parent, api: () => circle })
  expect(child.getState("Local").data).toEqual(line)
  expect(child.getState("x:remote").status).toBe("idle")
  expect(await child.load("x:remote")).toEqual(circle)
  expect(parent.getState("x:remote").data).toEqual(line)
})

test("bounded cache retains subscribed entries; TTL refreshes on load, not getState", async () => {
  let calls = 0
  const store = createIconStore({
    api: () => {
      calls++
      return line
    },
    maxEntries: 2,
  })
  const unsubscribe = store.subscribe("x:keep", () => {})
  await store.preload(["x:keep", "x:two"])
  await store.load("x:three")
  expect(Object.keys(store.snapshot()).length).toBe(2)
  expect(store.getState("x:keep").data).toEqual(line)
  expect(store.getState("x:two").status).toBe("idle")
  unsubscribe()
  const expired = createIconStore({
    api: () => {
      calls++
      return line
    },
    ttl: 0,
  })
  await expired.load("x:ttl")
  const previous = calls
  const state = expired.getState("x:ttl")
  expect(expired.getState("x:ttl")).toBe(state)
  expect(calls).toBe(previous)
  await expired.load("x:ttl")
  expect(calls).toBe(previous + 1)
})

test("synchronous reads and initial data respect the cache limit", () => {
  const sources = Object.fromEntries(
    Array.from({ length: 1000 }, (_, index) => [`x:icon-${index}`, line])
  )
  const store = createIconStore({ sources, api: false, maxEntries: 2 })
  for (const name of Object.keys(sources)) {
    const state = store.getState(name)
    expect(store.getState(name)).toBe(state)
    expect(Object.keys(store.snapshot()).length).toBeLessThanOrEqual(2)
  }
  expect(Object.keys(store.snapshot())).toEqual(["x:icon-998", "x:icon-999"])
  const hydrated = createIconStore({
    initialData: sources,
    api: false,
    maxEntries: 2,
  })
  expect(hydrated.snapshot()).toEqual({
    "x:icon-998": line,
    "x:icon-999": line,
  })
  expect(hydrated.getState("x:icon-0").status).toBe("idle")
})

test("synchronous symbol and error snapshots use bounded LRU storage", () => {
  const symbols = createIconStore({
    api: { type: "symbol", baseUrl: "/icons" },
    maxEntries: 2,
  })
  let probes = 0
  const errors = createIconStore({
    sources: {
      get x(): never {
        probes++
        throw new Error("Invalid source")
      },
    },
    api: false,
    maxEntries: 2,
  })
  for (const store of [symbols, errors]) {
    const first = store.getState("x:first")
    const second = store.getState("x:second")
    expect(store.getState("x:first")).toBe(first)
    const third = store.getState("x:third")
    expect(store.getState("x:third")).toBe(third)
    expect(store.getState("x:first")).toBe(first)
    expect(store.getState("x:second")).not.toBe(second)
  }
  expect(probes).toBe(4)
})

test("active snapshots remain stable over capacity and shrink after unsubscribe", () => {
  const store = createIconStore({
    sources: { First: line, Second: circle, Third: line },
    api: false,
    maxEntries: 1,
  })
  const unsubscribeFirst = store.subscribe("First", () => {})
  const first = store.getState("First")
  // A newly read snapshot must survive until its consumer can subscribe.
  const second = store.getState("Second")
  expect(store.getState("Second")).toBe(second)
  const unsubscribeSecond = store.subscribe("Second", () => {})
  store.getState("Third")
  expect(store.getState("First")).toBe(first)
  expect(store.getState("Second")).toBe(second)
  unsubscribeFirst()
  expect(store.snapshot()).toEqual({ Second: circle })
  unsubscribeSecond()
})

test("invalidation aborts pending loads and late custom results cannot restore old state", async () => {
  let finish!: (data: typeof line) => void
  let signal: AbortSignal | undefined
  const store = createIconStore({
    api: (_name, _parsed, context) => {
      signal = context?.signal
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  const request = store.load("x:one")
  const handled = request.catch((error: unknown) => error)
  await new Promise((resolve) => setTimeout(resolve, 0))
  store.invalidate("x:one")
  expect(signal?.aborted).toBe(true)
  finish(line)
  expect(await handled).toBeInstanceOf(Error)
  expect(store.getState("x:one").status).toBe("idle")
  expect(store.snapshot()).toEqual({})
})

test("queue limits concurrent requests and skips cancelled queued work", async () => {
  const requested: string[] = []
  let finish!: (data: typeof line) => void
  const api: IconLoader = (name) => {
    requested.push(name)
    return new Promise((resolve) => {
      finish = resolve
    })
  }
  const store = createIconStore({ api, concurrency: 1 })
  const first = store.load("x:first")
  const queued = store.load("x:queued")
  const cancelled = queued.catch((error: unknown) => error)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(requested).toEqual(["x:first"])
  store.invalidate("x:queued")
  finish(line)
  await first
  expect(await cancelled).toBeInstanceOf(Error)
  expect(requested).toEqual(["x:first"])
})

test("timeouts free queue slots even when a loader ignores abort", async () => {
  const store = createIconStore({
    timeout: 5,
    concurrency: 1,
    api: (name) => (name === "x:hung" ? new Promise(() => {}) : line),
  })
  const hung = store.load("x:hung")
  const next = store.load("x:next")
  await expect(hung).rejects.toThrow("timed out")
  expect(await next).toEqual(line)
})
