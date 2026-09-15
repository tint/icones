import { useLayoutEffect, useRef } from "react"
import { cn } from "../../../shared/lib/cn.ts"

/** Keep grid layout authoritative; animate only the visual change between rows. */
export function GuideTocIndicator({
  first,
  last,
  count,
}: {
  first: number
  last: number
  count: number
}) {
  const element = useRef<HTMLDivElement>(null)
  const previous = useRef<{ top: number; height: number } | undefined>(
    undefined
  )
  const animation = useRef<Animation | undefined>(undefined)

  useLayoutEffect(() => {
    const node = element.current!
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      const next = { top: node.offsetTop, height: node.offsetHeight }
      const from = previous.current
      if (from?.top === next.top && from.height === next.height) return
      previous.current = next.height > 0 ? next : undefined

      // If scrolling interrupts an animation, continue from its current visual position.
      let top = from?.top ?? next.top
      let height = from?.height ?? next.height
      if (
        from &&
        animation.current?.playState === "running" &&
        typeof window.DOMMatrixReadOnly === "function"
      ) {
        const value = window.getComputedStyle(node).transform
        const transform = new window.DOMMatrixReadOnly(
          value === "none" ? undefined : value
        )
        top += transform.m42
        height *= transform.m22
      }
      animation.current?.cancel()
      animation.current = undefined
      if (!next.height || motion.matches || typeof node.animate !== "function")
        return
      animation.current = node.animate(
        from
          ? [
              {
                transform: `translateY(${top - next.top}px) scaleY(${height / next.height})`,
              },
              { transform: "translateY(0) scaleY(1)" },
            ]
          : [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      )
    }
    const reduceMotion = () => {
      if (motion.matches) animation.current?.cancel()
    }
    update()
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(update)
        : undefined
    observer?.observe(node)
    if (node.parentElement) observer?.observe(node.parentElement)
    motion.addEventListener("change", reduceMotion)
    return () => {
      observer?.disconnect()
      motion.removeEventListener("change", reduceMotion)
    }
  }, [first, last, count])

  useLayoutEffect(() => () => animation.current?.cancel(), [])

  return (
    <div
      ref={element}
      aria-hidden="true"
      data-toc-indicator=""
      className={cn(
        "pointer-events-none z-1 col-start-1 origin-top bg-primary",
        last < count - 1 && "mb-1"
      )}
      style={{ gridRow: `${first + 1} / ${last + 2}` }}
    />
  )
}
