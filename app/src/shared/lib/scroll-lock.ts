type ScrollLock = { count: number; overflow: string; gutter: string }

const locks = new WeakMap<Document, ScrollLock>()

/** Keep the page locked until every modal has released it, in any order. */
export function lockPageScroll() {
  const page = document
  let lock = locks.get(page)
  if (!lock) {
    lock = {
      count: 0,
      overflow: page.body.style.overflow,
      gutter: page.documentElement.style.scrollbarGutter,
    }
    locks.set(page, lock)
    page.documentElement.style.scrollbarGutter = lock.gutter || "stable"
    page.body.style.overflow = "hidden"
  }
  lock.count++

  let released = false
  return () => {
    if (released) return
    released = true
    if (--lock.count === 0) {
      page.body.style.overflow = lock.overflow
      page.documentElement.style.scrollbarGutter = lock.gutter
      locks.delete(page)
    }
  }
}
