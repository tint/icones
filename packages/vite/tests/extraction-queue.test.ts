import { expect, test } from "bun:test"
import { createExtractionQueue } from "../../vite/src/queue.ts"

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test("cancellation rejects active and queued jobs without starting more work", async () => {
  const queue = createExtractionQueue(1, 1000)
  const started = deferred<AbortSignal>()
  const late = deferred<string>()
  let secondStarted = false
  const first = queue.run("first", (signal) => {
    started.resolve(signal)
    return late.promise
  })
  const second = queue.run("second", async () => {
    secondStarted = true
    return "second"
  })
  const settled = Promise.allSettled([first, second])
  const signal = await started.promise
  const reason = new Error("Build failed")
  queue.cancel(reason)
  expect(signal.aborted).toBe(true)
  expect(await settled).toEqual([
    { status: "rejected", reason },
    { status: "rejected", reason },
  ])
  expect(secondStarted).toBe(false)
  // A custom loader can reject after cancellation without an unhandled rejection.
  late.reject(new Error("Late result"))
  expect(await queue.run("next-build", async () => "ok")).toBe("ok")
})

test("timeouts release capacity even when the loader ignores AbortSignal", async () => {
  const queue = createExtractionQueue(1, 20)
  let signal: AbortSignal | undefined
  const late = deferred<string>()
  const first = queue.run("stuck", (request) => {
    signal = request
    return late.promise
  })
  const second = queue.run("following", async () => "loaded")
  const results = await Promise.allSettled([first, second])
  expect(results[0]!.status).toBe("rejected")
  if (results[0]!.status === "rejected")
    expect(String(results[0]!.reason)).toContain("timed out: stuck")
  expect(results[1]).toEqual({ status: "fulfilled", value: "loaded" })
  expect(signal?.aborted).toBe(true)
  late.resolve("ignored")
  expect(await second).toBe("loaded")
})

test("queued jobs receive their own deadline only after starting", async () => {
  const queue = createExtractionQueue(1, 200)
  const started = deferred<void>()
  const first = queue.run("first", () => {
    started.resolve()
    return new Promise<never>(() => {})
  })
  const firstResult = first.catch((error: unknown) => error)
  await started.promise
  const second = queue.run("second", async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
    return "completed after first deadline"
  })
  expect(await firstResult).toBeInstanceOf(Error)
  expect(await second).toBe("completed after first deadline")
})

test("a synchronous loader error releases its slot", async () => {
  const queue = createExtractionQueue(1)
  const result = await Promise.allSettled([
    queue.run("broken", () => {
      throw new Error("Invalid data")
    }),
    queue.run("valid", async () => "ok"),
  ])
  expect(result[0]!.status).toBe("rejected")
  expect(result[1]).toEqual({ status: "fulfilled", value: "ok" })
})
