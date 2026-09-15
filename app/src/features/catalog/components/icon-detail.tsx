import { useLanguage } from "../../../shared/i18n/language.ts"
import React from "react"
import type { CatalogIcon } from "../types.ts"
import type { IconData } from "@icones/core/icon-data"
import type { ElementData } from "@icones/core/element-types"
import { elementDataToIcon } from "@icones/core/svg-data"
import { parseElementData } from "@icones/core/elements"
import {
  dataUrl,
  symbolUrl,
  previewIconApi,
} from "../../../shared/icons/config.ts"
import { createStandaloneSvg } from "../../../shared/icons/svg-export.ts"
import {
  createIconExample,
  iconCodeFormats,
  type IconCodeFormat,
  type IconExampleMode,
} from "../../../shared/integrations/icon-examples.ts"
import {
  packageInstall,
  packageInstallNote,
} from "../../../shared/integrations/package-install.ts"
import { usePackageManager } from "../../../shared/integrations/package-manager.ts"
import { PackageManagerPicker } from "../../../shared/integrations/package-manager-select.tsx"
import type { VanillaElementMode } from "../../../shared/integrations/vanilla-example.ts"
import { getIconSource } from "../../licenses/sources.ts"
import { lockPageScroll } from "../../../shared/lib/scroll-lock.ts"
import { LicenseNoticeDialog } from "../../licenses/components/license-notice-dialog.tsx"
import { HighlightedCode } from "../../../shared/code/highlighted-code.tsx"
import { Link } from "../../../shared/routing/router.tsx"
import { paths } from "../../../shared/routing/paths.ts"
import { guideHref } from "../../guide/routing.ts"
import { Select } from "../../../shared/ui/select.tsx"
import { Chevron } from "../../../shared/ui/chevron.tsx"
import { Button } from "../../../shared/ui/button.tsx"

import { Icon, IconConfig } from "@icones/react"
import { cn } from "../../../shared/lib/cn.ts"

const iconDetailSizes = [24, 32, 48, 64, 96] as const
const iconDetailStrokeWidths = [0.5, 1, 1.5, 2, 2.5, 3] as const
const iconDetailRotations = [0, 90, 180, 270] as const
type CopyTarget =
  | "name"
  | "svg"
  | "code"
  | "install"
  | "json-url"
  | "symbol-url"

function PreviewSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: number
  options: { value: number; label: string }[]
  onValueChange: (value: number) => void
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <Select<number>
        aria-label={label}
        value={value}
        options={options}
        onValueChange={(next) => {
          if (next !== undefined) onValueChange(next)
        }}
        className="group/preview flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900"
        panelClassName="p-1 [&_button]:rounded-md [&_ul]:space-y-1"
        renderValue={(option) => (
          <>
            {option?.label}
            <span aria-hidden="true" className="shrink-0 text-slate-400">
              <Chevron className="size-4 transition-transform group-aria-expanded/preview:rotate-180" />
            </span>
          </>
        )}
      />
    </div>
  )
}

export function IconDetail({
  icon,
  onClose,
}: {
  icon: CatalogIcon
  onClose: () => void
}) {
  const { t, language } = useLanguage()
  const { manager, setManager } = usePackageManager()
  const [notice, setNotice] = React.useState<{
    source: NonNullable<ReturnType<typeof getIconSource>>
    trigger: HTMLButtonElement
  }>()

  const [size, setSize] = React.useState<number>(64)
  const [strokeWidth, setStrokeWidth] = React.useState(0)
  const [color, setColor] = React.useState(() =>
    document.documentElement.classList.contains("dark") ? "#e2e8f0" : "#111827"
  )
  const [rotation, setRotation] = React.useState(0)
  const [tab, setTab] = React.useState<IconCodeFormat>("SVG")
  const [exampleMode, setExampleMode] =
    React.useState<IconExampleMode>("compact")
  const [elementMode, setElementMode] =
    React.useState<VanillaElementMode>("web")
  const [revision, setRevision] = React.useState(0)
  const jsonUrl = dataUrl(icon.prefix, icon.slug)
  const loadKey = `${icon.name}/${jsonUrl}/${revision}`
  const [loaded, setLoaded] = React.useState<{
    key: string
    data?: IconData
    original?: ElementData
    error?: string
  }>()
  const data = loaded?.key === loadKey ? loaded.data : undefined
  const loadError = loaded?.key === loadKey ? (loaded.error ?? "") : ""
  const svgMarkup = data
    ? createStandaloneSvg(data, { size, strokeWidth, color, rotation })
    : ""
  const [actionError, setActionError] = React.useState("")
  const copyKey = [
    loadKey,
    tab,
    exampleMode,
    elementMode,
    size,
    strokeWidth,
    color,
    rotation,
    manager,
  ].join("/")
  const [copyFeedback, setCopyFeedback] = React.useState<{
    key: string
    target: CopyTarget
  }>()
  const copiedTarget =
    copyFeedback?.key === copyKey ? copyFeedback.target : undefined
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const copyTimeoutRef = React.useRef<number>(undefined)
  const titleId = React.useId()
  const tabsId = React.useId()
  const example = createIconExample(
    tab,
    icon.name,
    loaded?.key === loadKey ? loaded.original : undefined,
    {
      size,
      strokeWidth,
      color,
      rotation,
    },
    exampleMode,
    elementMode
  )
  const activeCode = example.code
  const installCommand = example.packageName
    ? packageInstall(example.packageName, undefined, false, manager)
    : ""
  const source = getIconSource(icon.prefix, icon.variant)
  const svgBytes = new TextEncoder().encode(svgMarkup).byteLength
  const endpoints = [
    {
      id: "json-url",
      label: "Icon JSON",
      url: jsonUrl,
    },
    {
      id: "symbol-url",
      label: "SVG symbol",
      url: symbolUrl(icon.prefix, icon.slug),
    },
  ] as const

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    const unlockScroll = lockPageScroll()

    return () => {
      window.clearTimeout(copyTimeoutRef.current)
      unlockScroll()
      // Unmount removes the modal; calling close during StrictMode cleanup fires onClose.
    }
  }, [])

  React.useEffect(() => {
    const controller = new AbortController()
    void fetch(jsonUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Icon data is unavailable.")
        const original = parseElementData(await response.json())
        if (controller.signal.aborted) return
        if (!original.length) throw new Error("Icon data is unavailable.")
        // Keep source tuples untouched; SVG export alone uses the converted view.
        const data = elementDataToIcon(original)
        setLoaded({ key: loadKey, data, original })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoaded({
            key: loadKey,
            error: "Unable to load icon data. Please retry.",
          })
      })
    return () => controller.abort()
  }, [jsonUrl, loadKey])

  async function copyText(value: string, target: CopyTarget) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setActionError("")
      setCopyFeedback({ key: copyKey, target })
      window.clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = window.setTimeout(
        () => setCopyFeedback(undefined),
        1500
      )
    } catch {
      setCopyFeedback(undefined)
      setActionError(
        "Clipboard access is unavailable. Select and copy the text manually."
      )
    }
  }

  function downloadSvg() {
    if (!svgMarkup) return

    const url = URL.createObjectURL(
      new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `${icon.slug}.svg`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-slate-950 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:text-slate-100"
        aria-labelledby={titleId}
        onClose={onClose}
      >
        <div
          data-slot="icon-detail-overlay"
          className="h-full overflow-y-auto overscroll-y-contain"
        >
          <div
            className="flex min-h-full items-center justify-center p-4 sm:p-8"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDialog()
            }}
          >
            <div
              data-slot="icon-detail-content"
              className="relative w-full max-w-280 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7 dark:border-slate-700 dark:bg-slate-950"
            >
              <button
                type="button"
                className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={t("Close icon details")}
                onClick={closeDialog}
              >
                <Icon icon="tabler:x" size={18} />
              </button>

              <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
                <div className="grid aspect-square w-full max-w-72 place-items-center justify-self-center rounded-xl bg-slate-100 dark:bg-slate-900">
                  <span
                    className="transition-transform duration-200"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <IconConfig api={previewIconApi}>
                      <Icon
                        name={icon.name}
                        color={color}
                        size={size}
                        strokeWidth={strokeWidth || undefined}
                        style={
                          strokeWidth
                            ? undefined
                            : ({
                                "--icones-stroke-width": "initial",
                              } as React.CSSProperties)
                        }
                      />
                    </IconConfig>
                  </span>
                </div>

                <div className="min-w-0 pt-1 pr-8">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <h2
                      className="min-w-0 truncate text-2xl font-semibold tracking-tight sm:text-3xl"
                      id={titleId}
                    >
                      {icon.name}
                    </h2>
                    <button
                      type="button"
                      className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-label={t("Copy {name}", { name: icon.name })}
                      onClick={() => void copyText(icon.name, "name")}
                    >
                      <Icon
                        icon={
                          copiedTarget === "name"
                            ? "tabler:check"
                            : "tabler:copy"
                        }
                        size={18}
                      />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {icon.prefix} · {icon.category}
                    </span>
                    <code className="text-xs text-slate-500 dark:text-slate-400">
                      {icon.slug}
                    </code>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <PreviewSelect
                      label={t("Stroke")}
                      value={strokeWidth}
                      onValueChange={setStrokeWidth}
                      options={[
                        { value: 0, label: t("Original") },
                        ...iconDetailStrokeWidths.map((value) => ({
                          value,
                          label: `${value}px`,
                        })),
                      ]}
                    />

                    <PreviewSelect
                      label={t("Size")}
                      value={size}
                      onValueChange={setSize}
                      options={iconDetailSizes.map((value) => ({
                        value,
                        label: `${value}px`,
                      }))}
                    />

                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("Color")}
                      </span>
                      <span className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900">
                        <input
                          type="color"
                          className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                          value={color}
                          aria-label={t("Icon color")}
                          onChange={(event) => setColor(event.target.value)}
                        />
                        <code className="truncate text-xs uppercase">
                          {color}
                        </code>
                      </span>
                    </label>

                    <PreviewSelect
                      label={t("Rotate")}
                      value={rotation}
                      onValueChange={setRotation}
                      options={iconDetailRotations.map((value) => ({
                        value,
                        label: `${value}°`,
                      }))}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                      disabled={!svgMarkup}
                      onClick={downloadSvg}
                    >
                      <Icon icon="tabler:download" size={19} />
                      {t("Download SVG")}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                      disabled={!svgMarkup}
                      onClick={() => void copyText(svgMarkup, "svg")}
                    >
                      <Icon
                        icon={
                          copiedTarget === "svg"
                            ? "tabler:check"
                            : "tabler:copy"
                        }
                        size={19}
                      />
                      {copiedTarget === "svg" ? t("SVG copied") : t("Copy SVG")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{t("Use this icon")}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {t(
                      "Choose your stack. Code follows the current preview; JSON preserves the original element tuples."
                    )}
                  </p>
                </div>
                <Link
                  to={
                    tab === "Vanilla"
                      ? guideHref("getting-started", "vanilla", elementMode)
                      : paths.guide
                  }
                  className="rounded text-xs font-medium text-primary underline underline-offset-4"
                >
                  {t("Full setup guide →")}
                </Link>
              </div>
              <div
                className="mt-4 flex gap-2 overflow-x-auto pb-1"
                role="tablist"
                aria-label={t("Icon code format")}
                onKeyDown={(event) => {
                  const index = iconCodeFormats.indexOf(tab)
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % iconCodeFormats.length
                      : event.key === "ArrowLeft"
                        ? (index - 1 + iconCodeFormats.length) %
                          iconCodeFormats.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? iconCodeFormats.length - 1
                            : undefined
                  if (next === undefined) return
                  event.preventDefault()
                  setTab(iconCodeFormats[next]!)
                  event.currentTarget
                    .querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    [next]?.focus()
                }}
              >
                {iconCodeFormats.map((value) => (
                  <button
                    type="button"
                    role="tab"
                    className={cn(
                      "h-11 min-w-20 flex-1 shrink-0 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                      tab === value
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/70 dark:text-blue-300"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                    )}
                    aria-selected={tab === value}
                    id={`${tabsId}-${value}`}
                    aria-controls={`${tabsId}-panel`}
                    tabIndex={tab === value ? 0 : -1}
                    key={value}
                    onClick={() => setTab(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div
                role="tabpanel"
                id={`${tabsId}-panel`}
                aria-labelledby={`${tabsId}-${tab}`}
                tabIndex={0}
                className="mt-3 rounded-xl focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {installCommand && (
                  <div className="@container/install mb-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex">
                      <PackageManagerPicker
                        value={manager}
                        onChange={setManager}
                        panelId={`${tabsId}-install`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <HighlightedCode
                        id={`${tabsId}-install`}
                        role="tabpanel"
                        aria-labelledby={`${tabsId}-install-${manager}`}
                        tabIndex={0}
                        className="min-w-0 overflow-x-auto text-xs focus-visible:outline-2 focus-visible:outline-primary"
                        code={installCommand}
                        filename="Terminal"
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium dark:bg-slate-800"
                        aria-label={t("Copy install command")}
                        onClick={() => void copyText(installCommand, "install")}
                      >
                        {copiedTarget === "install" ? t("Copied") : t("Copy")}
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {t(packageInstallNote(undefined, manager))}
                    </p>
                  </div>
                )}
                {tab === "Vanilla" && (
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{t("Element")}</span>
                    <Select<VanillaElementMode>
                      aria-label={t("Vanilla element")}
                      value={elementMode}
                      options={[
                        {
                          value: "web",
                          label: t("Web Component (<icones-icon>)"),
                        },
                        {
                          value: "standard",
                          label: t("Standard element (<i>)"),
                        },
                      ]}
                      onValueChange={(value) => {
                        if (value) setElementMode(value)
                      }}
                      className="group/element inline-flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-950 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      panelClassName="p-1 text-slate-950 dark:text-slate-100 [&_button]:rounded-md [&_ul]:space-y-1"
                      renderValue={(option) => (
                        <>
                          {option?.label}
                          <span aria-hidden="true">
                            <Chevron className="size-3.5 transition-transform group-aria-expanded/element:rotate-180" />
                          </span>
                        </>
                      )}
                    />
                  </div>
                )}
                <p className="mb-3 text-xs leading-5 text-slate-500">
                  {t(example.description)}
                </p>
                <div className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 pr-14 text-xs text-slate-500 dark:border-slate-700">
                    <span className="font-mono">{example.filename}</span>
                    {example.packageName && (
                      <div
                        role="group"
                        aria-label={t("Example mode")}
                        className="inline-flex rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800"
                      >
                        {(["compact", "full"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            aria-label={
                              mode === "compact"
                                ? t("Compact example")
                                : t("Full example")
                            }
                            aria-pressed={exampleMode === mode}
                            onClick={() => setExampleMode(mode)}
                            className="rounded-md px-3 py-1 text-xs font-medium transition hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-primary aria-pressed:bg-white aria-pressed:text-slate-950 aria-pressed:shadow-sm dark:hover:text-white dark:aria-pressed:bg-slate-700 dark:aria-pressed:text-white"
                          >
                            {mode === "compact" ? t("Compact") : t("Full")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <pre
                    key={tab + "/" + exampleMode + "/" + elementMode}
                    tabIndex={0}
                    aria-label={t("{format} code", { format: tab })}
                    className="m-0 max-h-72 min-h-40 max-w-full overflow-auto font-mono text-xs leading-5 text-slate-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300"
                  >
                    <HighlightedCode
                      className="block w-max min-w-full p-5"
                      code={activeCode || t(loadError || "Loading icon data…")}
                      filename={activeCode ? example.filename : "loading.txt"}
                    />
                  </pre>
                  <button
                    type="button"
                    className="absolute top-1 right-2 grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                    aria-label={t("Copy {format} code", { format: tab })}
                    disabled={!activeCode}
                    onClick={() => void copyText(activeCode, "code")}
                  >
                    <Icon
                      icon={
                        copiedTarget === "code"
                          ? "tabler:check"
                          : "tabler:clipboard-copy"
                      }
                      size={17}
                    />
                  </button>
                </div>
              </div>

              <p className="sr-only" role="status">
                {copiedTarget ? t("Copied to clipboard.") : ""}
              </p>
              {actionError && (
                <p
                  className="mt-3 text-xs text-rose-600 dark:text-rose-400"
                  role="alert"
                >
                  {t(actionError)}
                </p>
              )}
              {loadError && (
                <p
                  className="mt-3 text-xs text-rose-600 dark:text-rose-400"
                  role="status"
                >
                  {t(loadError)}{" "}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => {
                      setRevision((value) => value + 1)
                    }}
                  >
                    {t("Retry")}
                  </button>
                </p>
              )}

              <div className="mt-7 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-2 dark:border-slate-700">
                <section aria-label={t("Icon information")} className="min-w-0">
                  <h3 className="font-semibold">{t("Icon information")}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    {[
                      [
                        "Original canvas",
                        data
                          ? `${data.width ?? 16} × ${data.height ?? 16}`
                          : "Loading…",
                      ],
                      ["Export canvas", `${size} × ${size} px`],
                      [
                        "SVG size",
                        svgMarkup
                          ? t("{count} bytes", {
                              count: svgBytes.toLocaleString(language),
                            })
                          : "Loading…",
                      ],
                      ["Rotation", `${rotation}°`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-slate-500">{t(label!)}</dt>
                        <dd className="mt-1 font-medium">{t(value!)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 space-y-3">
                    {endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">
                            {t(endpoint.label)}
                          </span>
                          <Button
                            className="h-8 min-w-24 shrink-0 justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-0 text-xs text-slate-600 shadow-xs hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-primary data-[copied=true]:border-emerald-200 data-[copied=true]:bg-emerald-50 data-[copied=true]:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary/40 dark:hover:bg-primary/10 dark:hover:text-primary dark:data-[copied=true]:border-emerald-800 dark:data-[copied=true]:bg-emerald-950 dark:data-[copied=true]:text-emerald-300"
                            data-copied={copiedTarget === endpoint.id}
                            aria-label={t("Copy {endpoint} URL", {
                              endpoint: t(endpoint.label),
                            })}
                            onClick={() =>
                              void copyText(
                                new URL(endpoint.url, window.location.href)
                                  .href,
                                endpoint.id
                              )
                            }
                          >
                            <Icon
                              icon={
                                copiedTarget === endpoint.id
                                  ? "tabler:check"
                                  : "tabler:copy"
                              }
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                              className="shrink-0"
                            />
                            <span>
                              {copiedTarget === endpoint.id
                                ? t("Copied")
                                : t("Copy URL")}
                            </span>
                          </Button>
                        </div>
                        <code className="mt-1 block text-xs leading-5 break-all text-slate-500">
                          {endpoint.url}
                        </code>
                      </div>
                    ))}
                    <p className="text-xs leading-5 text-slate-500">
                      {t(
                        "Endpoints serve original artwork, not your preview settings. External SVG symbols require a same-origin URL."
                      )}
                    </p>
                  </div>
                </section>
                <section
                  aria-label={t("Source and license")}
                  className="min-w-0"
                >
                  <h3 className="font-semibold">{t("Source & license")}</h3>
                  {source ? (
                    <>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded font-medium text-primary underline underline-offset-4"
                        >
                          {t("Original collection ↗")}
                        </a>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800">
                          {source.licenseName}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {t("Imported ")}
                        {source.importedAt} ·{" "}
                        <span title={source.revision}>
                          {t("Revision ")}
                          {source.revision.slice(0, 12)}
                        </span>
                      </p>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {t(
                          "Artwork belongs to its original authors. The bundled notice below applies to this imported collection."
                        )}
                      </p>
                      {source.notice && (
                        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          {source.notice}
                        </p>
                      )}
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={(event) =>
                          setNotice({ source, trigger: event.currentTarget })
                        }
                        className="mt-4 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-700 dark:hover:bg-slate-900"
                      >
                        <Icon
                          name="tabler:file-description"
                          size={18}
                          aria-hidden="true"
                        />
                        {t("Read license notice")}
                      </button>
                    </>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {t(
                        "Source metadata is unavailable for this collection. Check with the original author before reuse."
                      )}
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      </dialog>
      {notice && (
        <LicenseNoticeDialog
          source={notice.source}
          trigger={notice.trigger}
          onClose={() => setNotice(undefined)}
        />
      )}
    </>
  )
}
