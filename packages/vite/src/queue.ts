type Job = { start(): void; cancel(reason: unknown): void }

/** One queue per plugin, shared by module transforms and virtual-module loads. */
export function createExtractionQueue(concurrency = 8, timeout = 15_000) {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1)
    throw new RangeError(`Invalid icon extraction concurrency: ${concurrency}`)
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 2_147_483_647)
    throw new RangeError(`Invalid icon extraction timeout: ${timeout}`)
  const waiting: Job[] = []
  const jobs = new Set<Job>()
  let active = 0
  // Drain respects configured concurrency and starts queued jobs in FIFO order.
  function drain() {
    while (waiting.length) {
      if (active >= concurrency) break
      waiting.shift()!.start()
    }
  }
  return {
    run<T>(
      name: string,
      task: (signal: AbortSignal) => Promise<T>
    ): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const controller = new AbortController()
        let started = false
        let settled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        // Centralizes resolution + counter maintenance for both success and error paths.
        const finish = (success: boolean, value: unknown) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          controller.signal.removeEventListener("abort", abort)
          jobs.delete(job)
          if (started) active--
          else {
            const index = waiting.indexOf(job)
            if (index >= 0) waiting.splice(index, 1)
          }
          if (success) resolve(value as T)
          else reject(value)
          // Drain after cancellation has removed all jobs, never mid-cancel.
          queueMicrotask(drain)
        }
        const abort = () => finish(false, controller.signal.reason)
        const job: Job = {
          start() {
            // Enter active state only when actually executing and arm per-task timeout.
            if (settled) return
            started = true
            active++
            timer = setTimeout(
              () =>
                controller.abort(
                  new Error(`Icon extraction timed out: ${name}`)
                ),
              timeout
            )
            // Release the slot on abort even if a custom loader ignores it.
            void Promise.resolve()
              .then(() => {
                controller.signal.throwIfAborted()
                return task(controller.signal)
              })
              .then(
                (value) => finish(true, value),
                (error: unknown) => finish(false, error)
              )
          },
          cancel(reason) {
            controller.abort(reason)
          },
        }
        controller.signal.addEventListener("abort", abort, { once: true })
        jobs.add(job)
        waiting.push(job)
        queueMicrotask(drain)
      })
    },
    cancel(reason: unknown = new Error("Icon extraction cancelled.")) {
      // Abort listeners may enqueue new work; cancel only the current generation.
      // eslint-disable-next-line unicorn/no-useless-spread
      for (const job of [...jobs]) job.cancel(reason)
    },
  }
}
