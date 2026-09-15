import { useEffect, useId, useRef } from "react"
import { Icon } from "@icones/react"
import { useLanguage } from "../../../shared/i18n/language.ts"
import type { getCollectionSources } from "../sources.ts"
import { lockPageScroll } from "../../../shared/lib/scroll-lock.ts"

export function LicenseNoticeDialog({
  source,
  trigger,
  onClose,
}: {
  source: ReturnType<typeof getCollectionSources>[number]
  trigger: HTMLButtonElement
  onClose: () => void
}) {
  const { t } = useLanguage()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current!
    const unlockScroll = lockPageScroll()
    if (!dialog.open) dialog.showModal()
    dialog.querySelector("button")?.focus()

    return () => {
      unlockScroll()
      if (trigger.isConnected) trigger.focus({ preventScroll: true })
      // Unmount removes the modal; do not fire onClose during StrictMode cleanup.
    }
  }, [trigger])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-4 text-slate-950 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center dark:text-slate-100"
    >
      <div className="flex max-h-full w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-6 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold break-words">
              {source.id} · {t("License notice")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {source.licenseName}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("Close license notice")}
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-slate-800"
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="tabler:x" size={20} aria-hidden="true" />
          </button>
        </header>
        {/* Keep the scrollbar ends inside the panel's rounded corners. */}
        <div
          role="region"
          aria-label={t("License notice")}
          tabIndex={0}
          className="my-4 min-h-0 overflow-y-auto overscroll-contain px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:my-6 sm:px-6"
        >
          {source.notice && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              {source.notice}
            </p>
          )}
          <pre className="font-mono text-xs leading-6 wrap-anywhere whitespace-pre-wrap text-slate-600 dark:text-slate-400">
            {source.licenseText}
          </pre>
        </div>
      </div>
    </dialog>
  )
}
