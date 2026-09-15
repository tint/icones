import type React from "react"
import { Link, useLocation } from "../routing/router.tsx"
import { cn } from "../lib/cn.ts"

export function ActionLink({
  children,
  className,
  variant = "ghost",
  href = "#",
  ...props
}: React.ComponentProps<"a"> & { variant?: "solid" | "ghost" }) {
  const location = useLocation()
  const to = href.startsWith("#")
    ? { pathname: location.pathname, search: location.search, hash: href }
    : href
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        variant === "solid"
          ? "bg-blue-600 text-white! shadow-sm hover:bg-blue-500"
          : "border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
