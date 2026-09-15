import { Icon } from "@icones/react"
import type { ReactNode } from "react"
import type { DashboardIconSet } from "./dashboard-icon-sets.ts"
export type DashboardGlyph =
  | "overview"
  | "revenue"
  | "orders"
  | "customers"
  | "reports"
  | "payouts"
  | "brand"
  | "help"
  | "trend"
  | "store"
  | "complete"
  | "transfer"
  | "pending"

// Match meanings, not slugs: each collection has its own names.
// Literal Icon names keep every choice available as a build-time SVG symbol.
const glyphs = {
  tabler: {
    overview: (size: number) => (
      <Icon name="tabler:layout-dashboard" size={size} aria-hidden="true" />
    ),
    revenue: (size: number) => (
      <Icon name="tabler:wallet" size={size} aria-hidden="true" />
    ),
    orders: (size: number) => (
      <Icon name="tabler:shopping-bag" size={size} aria-hidden="true" />
    ),
    customers: (size: number) => (
      <Icon name="tabler:users" size={size} aria-hidden="true" />
    ),
    reports: (size: number) => (
      <Icon name="tabler:chart-bar" size={size} aria-hidden="true" />
    ),
    payouts: (size: number) => (
      <Icon name="tabler:credit-card" size={size} aria-hidden="true" />
    ),
    brand: (size: number) => (
      <Icon name="tabler:command" size={size} aria-hidden="true" />
    ),
    help: (size: number) => (
      <Icon name="tabler:help-circle" size={size} aria-hidden="true" />
    ),
    trend: (size: number) => (
      <Icon name="tabler:chart-line" size={size} aria-hidden="true" />
    ),
    store: (size: number) => (
      <Icon name="tabler:building-store" size={size} aria-hidden="true" />
    ),
    complete: (size: number) => (
      <Icon name="tabler:circle-check" size={size} aria-hidden="true" />
    ),
    transfer: (size: number) => (
      <Icon name="tabler:arrows-exchange" size={size} aria-hidden="true" />
    ),
    pending: (size: number) => (
      <Icon name="tabler:clock" size={size} aria-hidden="true" />
    ),
  },
  lucide: {
    overview: (size: number) => (
      <Icon name="lucide:layout-dashboard" size={size} aria-hidden="true" />
    ),
    revenue: (size: number) => (
      <Icon name="lucide:wallet" size={size} aria-hidden="true" />
    ),
    orders: (size: number) => (
      <Icon name="lucide:shopping-bag" size={size} aria-hidden="true" />
    ),
    customers: (size: number) => (
      <Icon name="lucide:users" size={size} aria-hidden="true" />
    ),
    reports: (size: number) => (
      <Icon name="lucide:chart-column" size={size} aria-hidden="true" />
    ),
    payouts: (size: number) => (
      <Icon name="lucide:credit-card" size={size} aria-hidden="true" />
    ),
    brand: (size: number) => (
      <Icon name="lucide:command" size={size} aria-hidden="true" />
    ),
    help: (size: number) => (
      <Icon name="lucide:circle-question-mark" size={size} aria-hidden="true" />
    ),
    trend: (size: number) => (
      <Icon name="lucide:chart-line" size={size} aria-hidden="true" />
    ),
    store: (size: number) => (
      <Icon name="lucide:store" size={size} aria-hidden="true" />
    ),
    complete: (size: number) => (
      <Icon name="lucide:circle-check" size={size} aria-hidden="true" />
    ),
    transfer: (size: number) => (
      <Icon name="lucide:arrow-left-right" size={size} aria-hidden="true" />
    ),
    pending: (size: number) => (
      <Icon name="lucide:clock" size={size} aria-hidden="true" />
    ),
  },
  phosphor: {
    overview: (size: number) => (
      <Icon name="phosphor:squares-four" size={size} aria-hidden="true" />
    ),
    revenue: (size: number) => (
      <Icon name="phosphor:wallet" size={size} aria-hidden="true" />
    ),
    orders: (size: number) => (
      <Icon name="phosphor:shopping-bag" size={size} aria-hidden="true" />
    ),
    customers: (size: number) => (
      <Icon name="phosphor:users" size={size} aria-hidden="true" />
    ),
    reports: (size: number) => (
      <Icon name="phosphor:chart-bar" size={size} aria-hidden="true" />
    ),
    payouts: (size: number) => (
      <Icon name="phosphor:credit-card" size={size} aria-hidden="true" />
    ),
    brand: (size: number) => (
      <Icon name="phosphor:command" size={size} aria-hidden="true" />
    ),
    help: (size: number) => (
      <Icon name="phosphor:question" size={size} aria-hidden="true" />
    ),
    trend: (size: number) => (
      <Icon name="phosphor:chart-line" size={size} aria-hidden="true" />
    ),
    store: (size: number) => (
      <Icon name="phosphor:storefront" size={size} aria-hidden="true" />
    ),
    complete: (size: number) => (
      <Icon name="phosphor:check-circle" size={size} aria-hidden="true" />
    ),
    transfer: (size: number) => (
      <Icon name="phosphor:arrows-left-right" size={size} aria-hidden="true" />
    ),
    pending: (size: number) => (
      <Icon name="phosphor:clock" size={size} aria-hidden="true" />
    ),
  },
  bootstrap: {
    overview: (size: number) => (
      <Icon name="bootstrap:grid" size={size} aria-hidden="true" />
    ),
    revenue: (size: number) => (
      <Icon name="bootstrap:wallet" size={size} aria-hidden="true" />
    ),
    orders: (size: number) => (
      <Icon name="bootstrap:bag" size={size} aria-hidden="true" />
    ),
    customers: (size: number) => (
      <Icon name="bootstrap:people" size={size} aria-hidden="true" />
    ),
    reports: (size: number) => (
      <Icon name="bootstrap:bar-chart" size={size} aria-hidden="true" />
    ),
    payouts: (size: number) => (
      <Icon name="bootstrap:credit-card" size={size} aria-hidden="true" />
    ),
    brand: (size: number) => (
      <Icon name="bootstrap:command" size={size} aria-hidden="true" />
    ),
    help: (size: number) => (
      <Icon name="bootstrap:question-circle" size={size} aria-hidden="true" />
    ),
    trend: (size: number) => (
      <Icon name="bootstrap:graph-up" size={size} aria-hidden="true" />
    ),
    store: (size: number) => (
      <Icon name="bootstrap:shop" size={size} aria-hidden="true" />
    ),
    complete: (size: number) => (
      <Icon name="bootstrap:check-circle" size={size} aria-hidden="true" />
    ),
    transfer: (size: number) => (
      <Icon name="bootstrap:arrow-left-right" size={size} aria-hidden="true" />
    ),
    pending: (size: number) => (
      <Icon name="bootstrap:clock" size={size} aria-hidden="true" />
    ),
  },
  antd: {
    overview: (size: number) => (
      <Icon name="antd:appstore" size={size} aria-hidden="true" />
    ),
    revenue: (size: number) => (
      <Icon name="antd:wallet" size={size} aria-hidden="true" />
    ),
    orders: (size: number) => (
      <Icon name="antd:shopping" size={size} aria-hidden="true" />
    ),
    customers: (size: number) => (
      <Icon name="antd:team" size={size} aria-hidden="true" />
    ),
    reports: (size: number) => (
      <Icon name="antd:bar-chart" size={size} aria-hidden="true" />
    ),
    payouts: (size: number) => (
      <Icon name="antd:credit-card" size={size} aria-hidden="true" />
    ),
    brand: (size: number) => (
      <Icon name="antd:code" size={size} aria-hidden="true" />
    ),
    help: (size: number) => (
      <Icon name="antd:question-circle" size={size} aria-hidden="true" />
    ),
    trend: (size: number) => (
      <Icon name="antd:line-chart" size={size} aria-hidden="true" />
    ),
    store: (size: number) => (
      <Icon name="antd:shop" size={size} aria-hidden="true" />
    ),
    complete: (size: number) => (
      <Icon name="antd:check-circle" size={size} aria-hidden="true" />
    ),
    transfer: (size: number) => (
      <Icon name="antd:swap" size={size} aria-hidden="true" />
    ),
    pending: (size: number) => (
      <Icon name="antd:clock-circle" size={size} aria-hidden="true" />
    ),
  },
  huge: {
    overview: (size: number) => (
      <Icon name="huge:dashboard-square-01" size={size} aria-hidden="true" />
    ),
    revenue: (size: number) => (
      <Icon name="huge:wallet-01" size={size} aria-hidden="true" />
    ),
    orders: (size: number) => (
      <Icon name="huge:shopping-bag-01" size={size} aria-hidden="true" />
    ),
    customers: (size: number) => (
      <Icon name="huge:user-group" size={size} aria-hidden="true" />
    ),
    reports: (size: number) => (
      <Icon name="huge:chart-column" size={size} aria-hidden="true" />
    ),
    payouts: (size: number) => (
      <Icon name="huge:credit-card" size={size} aria-hidden="true" />
    ),
    brand: (size: number) => (
      <Icon name="huge:command" size={size} aria-hidden="true" />
    ),
    help: (size: number) => (
      <Icon name="huge:help-circle" size={size} aria-hidden="true" />
    ),
    trend: (size: number) => (
      <Icon name="huge:chart-line" size={size} aria-hidden="true" />
    ),
    store: (size: number) => (
      <Icon name="huge:store-01" size={size} aria-hidden="true" />
    ),
    complete: (size: number) => (
      <Icon name="huge:checkmark-circle-01" size={size} aria-hidden="true" />
    ),
    transfer: (size: number) => (
      <Icon name="huge:arrow-left-right" size={size} aria-hidden="true" />
    ),
    pending: (size: number) => (
      <Icon name="huge:clock-01" size={size} aria-hidden="true" />
    ),
  },
} satisfies Record<
  DashboardIconSet,
  Record<DashboardGlyph, (size: number) => ReactNode>
>

export function DashboardIcon({
  family,
  glyph,
  size = 19,
}: {
  family: DashboardIconSet
  glyph: DashboardGlyph
  size?: number
}) {
  return glyphs[family][glyph](size)
}
