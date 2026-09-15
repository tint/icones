import { cn } from "../lib/cn.ts"

export function SvgIcon({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
    >
      {children}
    </svg>
  )
}
