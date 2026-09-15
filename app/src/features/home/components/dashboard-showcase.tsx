import { useId, useState } from "react"
import { Icon } from "@icones/react"
import { Link } from "../../../shared/routing/router.tsx"
import { useLanguage } from "../../../shared/i18n/language.ts"
import { paths } from "../../../shared/routing/paths.ts"
import { DashboardIcon } from "./dashboard-icons.tsx"
import {
  dashboardIconSets,
  type DashboardIconSet,
} from "./dashboard-icon-sets.ts"

const sections = [
  {
    label: "Overview",
    glyph: "overview",
    chart: "Revenue over time",
    metrics: [
      { label: "Total revenue", value: 48560, format: "money" },
      { label: "Orders", value: 1284 },
      { label: "Customers", value: 892 },
    ],
  },
  {
    label: "Revenue",
    glyph: "revenue",
    chart: "Revenue over time",
    metrics: [
      { label: "Gross revenue", value: 48560, format: "money" },
      { label: "Fees", value: 1240, format: "money" },
      { label: "Net revenue", value: 47320, format: "money" },
    ],
  },
  {
    label: "Orders",
    glyph: "orders",
    chart: "Order activity",
    metrics: [
      { label: "Total orders", value: 1284 },
      { label: "Completed", value: 1248 },
      { label: "Pending", value: 36 },
    ],
  },
  {
    label: "Customers",
    glyph: "customers",
    chart: "Customer activity",
    metrics: [
      { label: "Active customers", value: 892 },
      { label: "New customers", value: 148 },
      { label: "Returning", value: 744 },
    ],
  },
  {
    label: "Reports",
    glyph: "reports",
    chart: "Report activity",
    metrics: [
      { label: "Completed reports", value: 24 },
      { label: "Scheduled", value: 6 },
      { label: "Exports", value: 18 },
    ],
  },
  {
    label: "Payouts",
    glyph: "payouts",
    chart: "Processed payouts",
    metrics: [
      { label: "Paid out", value: 32480, format: "money" },
      { label: "Available", value: 6480, format: "money" },
      { label: "In transit", value: 8360, format: "money" },
    ],
  },
] as const

type Period = 7 | 30
type PreviewTheme = "light" | "dark"

export function DashboardShowcase() {
  const { t } = useLanguage()
  const [theme, setTheme] = useState<PreviewTheme>("dark")
  const [family, setFamily] = useState<DashboardIconSet>("tabler")
  const [section, setSection] = useState(0)
  const [period, setPeriod] = useState<Period>(30)
  const titleId = useId()
  return (
    <figure
      id="dashboard-preview"
      className="dashboard-showcase"
      aria-labelledby={titleId}
    >
      <figcaption className="dashboard-caption">
        <div>
          <h3 id={titleId}>{t("One family. A whole interface.")}</h3>
          <p>
            {t(
              "From the sidebar to the smallest status indicator, a consistent icon style brings the whole dashboard together."
            )}
          </p>
        </div>
        <div className="dashboard-controls">
          <div
            className="dashboard-set-picker"
            role="group"
            aria-label={t("Dashboard icon set")}
          >
            {dashboardIconSets.map((set) => (
              <button
                key={set.id}
                type="button"
                aria-pressed={family === set.id}
                aria-controls="dashboard-stage"
                onClick={() => setFamily(set.id)}
              >
                {set.label}
              </button>
            ))}
          </div>
          <div
            className="dashboard-theme-picker"
            role="group"
            aria-label={t("Dashboard preview theme")}
          >
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              <Icon name="tabler:sun" size={17} aria-hidden="true" />
              {t("Light")}
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Icon name="tabler:moon" size={17} aria-hidden="true" />
              {t("Dark")}
            </button>
          </div>
        </div>
      </figcaption>
      <div id="dashboard-stage" className="dashboard-stage">
        <div className="dashboard-layer-back" aria-hidden="true">
          <DashboardPanel
            family={family}
            theme={theme === "dark" ? "light" : "dark"}
            section={section}
            period={period}
          />
        </div>
        <div className="dashboard-layer-front">
          <DashboardPanel
            family={family}
            theme={theme}
            section={section}
            period={period}
            onSectionChange={setSection}
            onPeriodChange={setPeriod}
          />
        </div>
      </div>
      <p className="dashboard-demo-note">
        <Icon name="tabler:click" size={16} aria-hidden="true" />
        {t(
          "Illustrative data. Try the sidebar, date range and theme; only this preview changes."
        )}
      </p>
    </figure>
  )
}

function DashboardPanel({
  family,
  theme,
  section,
  period,
  onSectionChange,
  onPeriodChange,
}: {
  family: DashboardIconSet
  theme: PreviewTheme
  section: number
  period: Period
  onSectionChange?: (index: number) => void
  onPeriodChange?: (period: Period) => void
}) {
  const { t, language } = useLanguage()
  const current = sections[section]!
  const interactive = !!onSectionChange
  const contentId = useId()
  const headingId = useId()
  const factor = period === 7 ? 0.25 : 1
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 0 })
  const money = new Intl.NumberFormat(language, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
  const rangeLabel = t("Last {days} days", { days: period })
  return (
    <div
      className="dashboard-panel"
      data-dashboard-theme={theme}
      data-dashboard-icon-set={family}
      data-dashboard-interactive={interactive || undefined}
    >
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span>
            <DashboardIcon family={family} glyph="brand" size={22} />
          </span>
          <strong>Forma</strong>
        </div>
        <p className="dashboard-sidebar-label">{t("Workspace")}</p>
        <div
          className="dashboard-nav"
          role={interactive ? "group" : undefined}
          aria-label={interactive ? t("Dashboard sections") : undefined}
        >
          {sections.map((item, index) =>
            interactive ? (
              <button
                key={item.label}
                type="button"
                aria-label={t(item.label)}
                title={t(item.label)}
                aria-pressed={section === index}
                aria-controls={contentId}
                onClick={() => onSectionChange?.(index)}
              >
                <DashboardIcon family={family} glyph={item.glyph} />
                <span className="dashboard-nav-label">{t(item.label)}</span>
              </button>
            ) : (
              <span
                key={item.label}
                className="dashboard-nav-item"
                data-active={section === index}
              >
                <DashboardIcon family={family} glyph={item.glyph} />
                <span>{t(item.label)}</span>
              </span>
            )
          )}
        </div>
        <div className="dashboard-sidebar-footer">
          {interactive ? (
            <Link to={paths.guide} aria-label={t("Usage guide")}>
              <DashboardIcon family={family} glyph="help" size={18} />
              <span className="dashboard-nav-label">{t("Usage guide")}</span>
            </Link>
          ) : (
            <span>
              <DashboardIcon family={family} glyph="help" size={18} />
              <span>{t("Usage guide")}</span>
            </span>
          )}
          <div className="dashboard-account">
            <span className="dashboard-avatar">S</span>
            <div>
              <strong>{t("Studio workspace")}</strong>
              <small>{t("Demo account")}</small>
            </div>
          </div>
        </div>
      </aside>
      <div
        className="dashboard-main"
        id={contentId}
        role={interactive ? "region" : undefined}
        aria-labelledby={headingId}
      >
        <header className="dashboard-header">
          <div>
            <DashboardIcon family={family} glyph={current.glyph} />
            <h4 id={headingId}>{t(current.label)}</h4>
          </div>
          <span className="dashboard-sample-label">{t("Sample data")}</span>
        </header>
        <div className="dashboard-content">
          <div className="dashboard-toolbar">
            <p>{t("Your business, at a glance.")}</p>
            <div
              className="dashboard-period"
              role={interactive ? "group" : undefined}
              aria-label={interactive ? t("Dashboard date range") : undefined}
            >
              {([7, 30] as const).map((days) =>
                interactive ? (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={period === days}
                    onClick={() => onPeriodChange?.(days)}
                  >
                    {t("{days} days", { days })}
                  </button>
                ) : (
                  <span key={days} data-active={period === days}>
                    {t("{days} days", { days })}
                  </span>
                )
              )}
            </div>
          </div>
          <dl className="dashboard-metrics">
            {current.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{t(metric.label)}</dt>
                <dd>
                  {"format" in metric
                    ? money.format(metric.value * factor)
                    : number.format(metric.value * factor)}
                </dd>
                <span className="dashboard-metric-period">{rangeLabel}</span>
              </div>
            ))}
          </dl>
          <div className="dashboard-chart">
            <div className="dashboard-chart-heading">
              <h5>{t(current.chart)}</h5>
              <DashboardIcon family={family} glyph="trend" size={18} />
            </div>
            <div className="dashboard-legend">
              <span>
                <i />
                {t("Current period")}
              </span>
              <span>
                <i />
                {t("Previous period")}
              </span>
            </div>
            <ActivityChart
              section={section}
              period={period}
              label={t(
                "{chart}, {range}. Illustrative comparison of the current and previous period.",
                { chart: t(current.chart), range: rangeLabel }
              )}
            />
            <div className="dashboard-axis">
              <span>{t("{days} days ago", { days: period })}</span>
              <span>{t("Today")}</span>
            </div>
          </div>
          <div className="dashboard-activity">
            <h5>{t("Recent activity")}</h5>
            <div>
              <span className="dashboard-activity-icon">
                <DashboardIcon family={family} glyph="store" size={17} />
              </span>
              <span>
                Studio North<small>{t("Payment received")}</small>
              </span>
              <span className="dashboard-status">
                <DashboardIcon family={family} glyph="complete" size={15} />
                {t("Completed")}
              </span>
            </div>
            <div>
              <span className="dashboard-activity-icon">
                <DashboardIcon family={family} glyph="transfer" size={17} />
              </span>
              <span>
                Canvas Supply<small>{t("Bank transfer")}</small>
              </span>
              <span className="dashboard-status is-pending">
                <DashboardIcon family={family} glyph="pending" size={15} />
                {t("Pending")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityChart({
  section,
  period,
  label,
}: {
  section: number
  period: Period
  label: string
}) {
  const samples =
    period === 7
      ? [26, 32, 24, 49, 43, 74, 82]
      : [14, 22, 19, 37, 31, 54, 47, 67, 61, 82, 72, 92]
  function points(previous: boolean) {
    return samples
      .map((value, index) => {
        const x = 4 + (index / (samples.length - 1)) * 552
        const adjusted = Math.min(
          96,
          Math.max(
            5,
            value +
              Math.sin(index + section) * (section * 3 + 4) -
              (previous ? 17 + Math.cos(index) * 9 : 0)
          )
        )
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${(174 - adjusted * 1.6).toFixed(1)}`
      })
      .join(" ")
  }
  return (
    <svg
      className="dashboard-chart-svg"
      viewBox="0 0 560 180"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      {[20, 65, 110, 155].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="560"
          y2={y}
          className="dashboard-grid-line"
        />
      ))}
      <path
        data-series="previous"
        d={points(true)}
        className="dashboard-previous-line"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <path
        data-series="current"
        d={points(false)}
        className="dashboard-current-line"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
