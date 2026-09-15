import type React from "react"
import { cn } from "../lib/cn.ts"

export type ButtonProps =
  | (React.ComponentProps<"button"> & { href?: never })
  | (React.ComponentProps<"a"> & { href: string })

const buttonClassName =
  "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:cursor-default disabled:opacity-30 dark:hover:bg-slate-800"

export function Button(props: ButtonProps) {
  if (typeof props.href === "string") {
    const { children, className, ...anchorProps } = props
    return (
      <a className={cn(buttonClassName, className)} {...anchorProps}>
        {children}
      </a>
    )
  }

  const { children, className, type = "button", ...buttonProps } = props
  return (
    <button
      type={type}
      className={cn(buttonClassName, className)}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
