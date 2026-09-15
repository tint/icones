type SectionTarget = { id: string; element: HTMLElement }

/** Track complete sections without synchronous layout reads on the scroll path. */
export function observeGuideSections(
  sections: readonly SectionTarget[],
  header: HTMLElement | null,
  onChange: (ids: string[]) => void
) {
  let previous: string[] = []
  const publish = (ids: string[]) => {
    if (
      ids.length === previous.length &&
      ids.every((id, index) => id === previous[index])
    )
      return
    previous = ids
    onChange(ids)
  }

  if (typeof window.IntersectionObserver !== "function")
    return observeCachedBounds(sections, header, publish)

  const visible = new Set<Element>()
  let current: IntersectionObserver | undefined
  let headerHeight = -1
  let disposed = false
  const observe = (height: number) => {
    const nextHeight = Math.max(0, height)
    if (disposed || nextHeight === headerHeight) return
    headerHeight = nextHeight
    current?.disconnect()
    visible.clear()
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (disposed || current !== observer) return
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            entry.intersectionRect.height > 0 &&
            entry.intersectionRect.width > 0
          )
            visible.add(entry.target)
          else visible.delete(entry.target)
        }
        publish(
          sections
            .filter(({ element }) => visible.has(element))
            .map(({ id }) => id)
        )
      },
      {
        rootMargin: `-${headerHeight}px 0px 0px 0px`,
        // Notify when edge contact (zero area) becomes a positive intersection too.
        threshold: [0, Number.EPSILON],
      }
    )
    current = observer
    sections.forEach(({ element }) => observer.observe(element))
  }
  const measureHeader = () => observe(header?.offsetHeight ?? 0)
  measureHeader()
  const resize =
    header && typeof ResizeObserver === "function"
      ? new ResizeObserver((entries) => {
          const entry = entries.find((item) => item.target === header)
          if (entry)
            observe(entry.borderBoxSize?.[0]?.blockSize ?? header.offsetHeight)
        })
      : undefined
  if (header) resize?.observe(header)
  if (!resize) window.addEventListener("resize", measureHeader)
  return () => {
    disposed = true
    current?.disconnect()
    resize?.disconnect()
    window.removeEventListener("resize", measureHeader)
  }
}

/** Legacy fallback: remeasure on layout changes, not ordinary scrolling. */
function observeCachedBounds(
  sections: readonly SectionTarget[],
  header: HTMLElement | null,
  publish: (ids: string[]) => void
) {
  let dirty = true
  let disposed = false
  let frame: number | undefined
  let headerHeight = 0
  let bounds: { id: string; top: number; bottom: number; height: number }[] = []
  const update = () => {
    frame = undefined
    if (disposed) return
    const scrollY = window.scrollY
    if (dirty) {
      dirty = false
      headerHeight = Math.max(0, header?.getBoundingClientRect().height ?? 0)
      bounds = sections.map(({ id, element }) => {
        const rect = element.getBoundingClientRect()
        return {
          id,
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
          height: rect.height,
        }
      })
    }
    const top = scrollY + headerHeight
    const bottom = scrollY + window.innerHeight
    publish(
      bounds
        .filter(
          (rect) =>
            bottom > top &&
            rect.height > 0 &&
            rect.bottom > top &&
            rect.top < bottom
        )
        .map(({ id }) => id)
    )
  }
  const schedule = () => {
    if (disposed) return
    frame ??= window.requestAnimationFrame(update)
  }
  const invalidate = () => {
    dirty = true
    schedule()
  }
  const resize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(invalidate)
      : undefined
  sections.forEach(({ element }) => resize?.observe(element))
  resize?.observe(document.body)
  if (header) resize?.observe(header)
  update()
  window.addEventListener("scroll", schedule, { passive: true })
  window.addEventListener("resize", invalidate)
  document.addEventListener("toggle", invalidate, true)
  return () => {
    disposed = true
    window.removeEventListener("scroll", schedule)
    window.removeEventListener("resize", invalidate)
    document.removeEventListener("toggle", invalidate, true)
    resize?.disconnect()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
  }
}
