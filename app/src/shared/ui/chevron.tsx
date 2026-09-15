import { cn } from "../lib/cn.ts"

type Direction = "up" | "down" | "left" | "right"

const directionMap: Record<Direction, string> = {
  up: "m18 15-6-6-6 6",
  down: "m6 9 6 6 6-6",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
}

type Props = {
  direction?: Direction
  className?: string
}

export function Chevron({ direction = "down", className }: Props) {
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
      <path d={directionMap[direction]} />
    </svg>
  )
}
