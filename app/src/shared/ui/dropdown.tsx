import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "../lib/cn.ts"

export type DropdownProps = Omit<ComponentProps<"details">, "children"> & {
  /** Content inside the native summary; do not nest another button or link. */
  trigger: ReactNode
  children: ReactNode
  align?: "start" | "center" | "end"
  /** Mouse only. Click and native keyboard activation work independently. */
  openOnHover?: boolean
  triggerProps?: Omit<
    ComponentProps<"summary">,
    "children" | "ref" | "aria-controls"
  > & {
    [attribute: `data-${string}`]: string | number | boolean | undefined
  }
  panelClassName?: string
}

const alignment = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
} as const

/** A native disclosure, not an ARIA menu: children retain their own semantics. */
export function Dropdown({
  ref,
  trigger,
  children,
  align = "start",
  openOnHover = false,
  className,
  triggerProps,
  panelClassName,
  onPointerEnter,
  onPointerLeave,
  onKeyDown,
  onBlur,
  ...props
}: DropdownProps) {
  const root = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const panelId = useId()
  useImperativeHandle(ref, () => root.current!, [])

  useEffect(() => {
    const element = root.current!
    const document = element.ownerDocument
    const closeOutside = (event: PointerEvent) => {
      if (!event.composedPath().includes(element)) element.open = false
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])

  return (
    <details
      {...props}
      ref={root}
      className={cn("relative", className)}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        if (
          !event.defaultPrevented &&
          openOnHover &&
          event.pointerType === "mouse"
        )
          event.currentTarget.open = true
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)
        if (
          !event.defaultPrevented &&
          openOnHover &&
          event.pointerType === "mouse" &&
          !event.currentTarget.contains(
            event.currentTarget.ownerDocument.activeElement
          )
        )
          event.currentTarget.open = false
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          !event.defaultPrevented &&
          event.key === "Escape" &&
          event.currentTarget.open
        ) {
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.open = false
          summary.current?.focus()
        }
      }}
      onBlur={(event) => {
        onBlur?.(event)
        if (
          !event.defaultPrevented &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          event.currentTarget.open = false
      }}
    >
      <summary
        {...triggerProps}
        ref={summary}
        aria-controls={panelId}
        className={cn(
          "inline-flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden",
          triggerProps?.className
        )}
      >
        {trigger}
      </summary>
      {/* Padding keeps the trigger-to-panel gap inside the hover boundary. */}
      <div
        className={cn("absolute top-full z-50 min-w-52 pt-2", alignment[align])}
      >
        <div
          id={panelId}
          className={cn(
            "rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900",
            panelClassName
          )}
        >
          {children}
        </div>
      </div>
    </details>
  )
}
