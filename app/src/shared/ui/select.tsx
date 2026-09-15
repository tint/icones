import { useLanguage } from "../i18n/language.ts"
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "../lib/cn.ts"
import { Chevron } from "./chevron.tsx"

type SelectOption<T extends string | number> = {
  value: T
  label: ReactNode
}

type RenderOptionProps<T extends string | number> = {
  option: SelectOption<T>
  selected: boolean
  onClick: () => void
  className?: string
}

type SelectProps<T extends string | number> = {
  options: SelectOption<T>[]
  value?: NoInfer<T>
  defaultValue?: NoInfer<T>
  renderValue?: ((option?: SelectOption<T>) => ReactNode) | ReactNode
  align?: "start" | "end" | "center"
  className?: string
  panelClassName?: string
  "aria-label"?: string
  renderOption?: (props: RenderOptionProps<T>) => ReactNode
  onValueChange?: (value: NoInfer<T> | undefined) => void
  header?: ReactNode
  footer?: ReactNode
  /** Mouse hover opens without moving keyboard focus; touch remains click-only. */
  openOnHover?: boolean
}

function defaultRenderOptions<T extends string | number>({
  option,
  selected,
  onClick,
  className,
}: RenderOptionProps<T>) {
  return (
    <Button
      type="button"
      tabIndex={-1}
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "aria-selected:bg-slate-200 dark:aria-selected:bg-slate-700",
        className
      )}
    >
      {option.label}
    </Button>
  )
}

function renderValue<T extends string | number>(
  renderFn?: ((option?: SelectOption<T>) => ReactNode) | ReactNode,
  option?: SelectOption<T>,
  fallback = "Select an option"
) {
  return renderFn instanceof Function
    ? renderFn(option)
    : (option?.label ?? renderFn ?? fallback)
}

export function Select<T extends string | number>(props: SelectProps<T>) {
  const { t } = useLanguage()
  const {
    options,
    value: controlledValue,
    defaultValue,
    renderValue: placeholder,
    align = "start",
    className,
    panelClassName,
    renderOption = defaultRenderOptions,
    onValueChange,
    "aria-label": ariaLabel,
    header,
    footer,
    openOnHover = false,
  } = props
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(
    defaultValue
  )
  const [open, setOpen] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [menuHeight, setMenuHeight] = useState(516)
  const [above, setAbove] = useState(false)
  const menuId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const openingIndex = useRef<number | undefined>(undefined)
  const focusOnOpen = useRef(true)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const autoScrollFrameRef = useRef<number | undefined>(undefined)

  const controlled = Object.hasOwn(props, "value")
  const currentValue = controlled ? controlledValue : uncontrolledValue
  const selectedOption = options.find((option) => option.value === currentValue)

  const updateScrollControls = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const scrollEnd = viewport.scrollHeight - viewport.clientHeight
    setCanScrollUp(viewport.scrollTop > 1)
    setCanScrollDown(scrollEnd > 1 && viewport.scrollTop < scrollEnd - 1)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== undefined) {
      window.cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = undefined
    }
  }, [])

  const startAutoScroll = useCallback(
    (direction: -1 | 1) => {
      stopAutoScroll()

      function scroll() {
        const viewport = viewportRef.current
        if (!viewport) return

        const previousScrollTop = viewport.scrollTop
        viewport.scrollTop += direction * 7
        updateScrollControls()

        if (viewport.scrollTop !== previousScrollTop) {
          autoScrollFrameRef.current = window.requestAnimationFrame(scroll)
        } else {
          autoScrollFrameRef.current = undefined
        }
      }

      autoScrollFrameRef.current = window.requestAnimationFrame(scroll)
    },
    [stopAutoScroll, updateScrollControls]
  )

  const closeMenu = useCallback(() => {
    setOpen(false)
    setCanScrollUp(false)
    setCanScrollDown(false)
    stopAutoScroll()
  }, [stopAutoScroll])

  const scrollPage = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current
    if (!viewport) return

    viewport.scrollBy({
      behavior: "smooth",
      top: direction * Math.max(72, viewport.clientHeight * 0.75),
    })
  }, [])

  const outsideClickListener = useEffectEvent((e: MouseEvent) => {
    const el = e.target as Node
    if (!rootRef.current?.contains(el)) {
      closeMenu()
    }
  })

  useEffect(() => {
    if (!open) return

    document.addEventListener("click", outsideClickListener)
    document.addEventListener("pointerdown", outsideClickListener)
    return () => {
      document.removeEventListener("click", outsideClickListener)
      document.removeEventListener("pointerdown", outsideClickListener)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 8
      const above = below < 200 && rect.top > below
      setAbove(above)
      setMenuHeight(Math.max(72, Math.min(516, above ? rect.top - 8 : below)))
    }
    measure()
    window.addEventListener("resize", measure)

    const animationFrame = window.requestAnimationFrame(updateScrollControls)
    const viewport = viewportRef.current
    const resizeObserver = new ResizeObserver(updateScrollControls)
    if (viewport) resizeObserver.observe(viewport)
    if (listRef.current) resizeObserver.observe(listRef.current)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      window.removeEventListener("resize", measure)
      stopAutoScroll()
    }
  }, [open, options.length, stopAutoScroll, updateScrollControls])

  useLayoutEffect(() => {
    if (!open) return
    if (!focusOnOpen.current) return
    const index =
      openingIndex.current ??
      Math.max(
        0,
        options.findIndex((option) => option.value === currentValue)
      )
    openingIndex.current = undefined
    focusOption(index)
    // Only choose an initial focus when opening; option updates retain focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function focusOption(index: number) {
    const item = listRef.current?.children[index]?.querySelector<HTMLElement>(
      "[role=option], button"
    )
    item?.focus({ preventScroll: true })
    const viewport = viewportRef.current
    if (item && viewport) {
      const top =
        item.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop
      if (top < viewport.scrollTop) viewport.scrollTop = top
      else if (
        top + item.offsetHeight >
        viewport.scrollTop + viewport.clientHeight
      )
        viewport.scrollTop = top + item.offsetHeight - viewport.clientHeight
    }
  }

  function selectOption(option: SelectOption<T>) {
    if (!controlled) {
      setUncontrolledValue(option.value)
    }
    onValueChange?.(option.value)
    closeMenu()
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(event) => {
        if (openOnHover && event.pointerType === "mouse" && !open) {
          focusOnOpen.current = false
          setOpen(true)
        }
      }}
      onPointerLeave={(event) => {
        if (
          openOnHover &&
          event.pointerType === "mouse" &&
          !event.currentTarget.contains(document.activeElement)
        )
          closeMenu()
      }}
      onBlur={(event) => {
        if (openOnHover && !event.currentTarget.contains(event.relatedTarget))
          closeMenu()
      }}
      onKeyDown={(event) => {
        const key = event.key
        if (key === "Tab") {
          if (open) triggerRef.current?.focus()
          closeMenu()
          return
        }
        if (key === "Escape") {
          if (open) {
            event.preventDefault()
            event.stopPropagation()
            closeMenu()
            triggerRef.current?.focus()
          }
          return
        }
        if (
          !["ArrowUp", "ArrowDown", "Home", "End", "Enter", " "].includes(key)
        )
          return
        if (!options.length) return
        if (!open) {
          if (key !== "ArrowUp" && key !== "ArrowDown") return
          event.preventDefault()
          focusOnOpen.current = true
          openingIndex.current =
            currentValue === undefined
              ? key === "ArrowUp"
                ? options.length - 1
                : 0
              : Math.max(
                  0,
                  options.findIndex((option) => option.value === currentValue)
                )
          setOpen(true)
          return
        }
        event.preventDefault()
        const current = Array.from(listRef.current?.children ?? []).findIndex(
          (item) =>
            item === document.activeElement ||
            item.contains(document.activeElement)
        )
        // A mouse-opened menu can subsequently be operated from its trigger.
        if (
          current < 0 &&
          ["Enter", " ", "ArrowUp", "ArrowDown"].includes(key)
        ) {
          focusOption(
            Math.max(
              0,
              options.findIndex((option) => option.value === currentValue)
            )
          )
          return
        }
        if (key === "Enter" || key === " ") {
          // Activate custom links as well as button options.
          listRef.current?.children[current]
            ?.querySelector<HTMLElement>("[role=option]")
            ?.click()
          return
        }
        focusOption(
          key === "Home"
            ? 0
            : key === "End"
              ? options.length - 1
              : Math.max(
                  0,
                  Math.min(
                    options.length - 1,
                    current + (key === "ArrowUp" ? -1 : 1)
                  )
                )
        )
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        id={`${menuId}-trigger`}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "hover:bg-slate-200 aria-expanded:bg-slate-200 dark:hover:bg-slate-700 dark:aria-expanded:bg-slate-700",
          className
        )}
        onClick={() => {
          focusOnOpen.current = true
          if (open) closeMenu()
          else setOpen(true)
        }}
      >
        {renderValue(placeholder, selectedOption, t("Select an option"))}
      </button>
      <div
        className={cn(
          "absolute z-20 hidden min-w-full data-[open=true]:block",
          "data-[above=false]:top-full data-[above=false]:pt-1 data-[above=true]:bottom-full data-[above=true]:pb-1",
          { "left-0": align === "start" },
          { "left-1/2 -translate-x-1/2": align === "center" },
          { "right-0": align === "end" }
        )}
        data-open={open}
        data-above={above}
        style={
          {
            "--select-height": `${menuHeight}px`,
          } as import("react").CSSProperties
        }
      >
        {/* Padding on the outer layer bridges the hover gap without scrolling the header/footer. */}
        <div
          className={cn(
            "flex max-h-(--select-height) min-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            panelClassName
          )}
        >
          {header != null && <div className="shrink-0">{header}</div>}
          {canScrollUp && (
            <div className="shrink-0">
              <Button
                type="button"
                className="justify-center"
                aria-label={t("Scroll options up")}
                tabIndex={-1}
                onClick={() => scrollPage(-1)}
                onMouseEnter={() => startAutoScroll(-1)}
                onMouseLeave={stopAutoScroll}
              >
                <Chevron direction="up" className="size-4" />
              </Button>
            </div>
          )}
          <div
            ref={viewportRef}
            className="min-h-0 flex-auto scrollbar-none overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
            onScroll={updateScrollControls}
          >
            <ul
              role="listbox"
              id={menuId}
              ref={listRef}
              aria-labelledby={`${menuId}-trigger`}
              className="[&_button]:flex [&_button]:h-9 [&_button]:w-full [&_button]:items-center [&_button]:justify-between [&_button]:px-4 [&_button]:hover:bg-slate-200 dark:[&_button]:hover:bg-slate-800"
            >
              {options.map((option) => (
                <li key={option.value} role="presentation">
                  {renderOption({
                    option,
                    selected: option.value === currentValue,
                    onClick: () => selectOption(option),
                    className:
                      "outline-none focus-within:bg-slate-100 dark:focus-within:bg-slate-800",
                  })}
                </li>
              ))}
            </ul>
          </div>
          {canScrollDown && (
            <div className="shrink-0">
              <Button
                type="button"
                className="justify-center"
                aria-label={t("Scroll options down")}
                tabIndex={-1}
                onClick={() => scrollPage(1)}
                onMouseEnter={() => startAutoScroll(1)}
                onMouseLeave={stopAutoScroll}
              >
                <Chevron direction="down" className="size-4" />
              </Button>
            </div>
          )}
          {footer != null && <div className="shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

function Button({ children, className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between px-4 text-sm whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-800",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
