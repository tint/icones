import { useId } from "react"
import { CopyCodeButton } from "./code-block.tsx"
import { PackageManagerPicker } from "../integrations/package-manager-select.tsx"
import { cn } from "../lib/cn.ts"
import { usePackageManager } from "../integrations/package-manager.ts"
import { useLanguage } from "../i18n/language.ts"
import { HighlightedCode } from "./highlighted-code.tsx"
import {
  isDevelopmentBuild,
  packageInstall,
  packageInstallNote,
  type InstallDependency,
} from "../integrations/package-install.ts"

export function InstallCodeBlock({
  dependencies,
  development = isDevelopmentBuild,
  className,
  showNote = true,
}: {
  dependencies: readonly InstallDependency[]
  development?: boolean
  className?: string
  showNote?: boolean
}) {
  const { manager, setManager } = usePackageManager()
  const panelId = useId()
  const code = dependencies
    .map(({ name, dev }) => packageInstall(name, development, dev, manager))
    .join("\n")
  return (
    <div className={cn("@container/install min-w-0", className)}>
      <div className="rounded-xl border border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <div className="flex min-h-12 items-center gap-3 border-b border-slate-200 px-3 py-1 text-xs dark:border-slate-800">
          <PackageManagerPicker
            value={manager}
            onChange={setManager}
            panelId={panelId}
          />
          <CopyCodeButton
            code={code}
            className="border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          />
        </div>
        <pre
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${panelId}-${manager}`}
          tabIndex={0}
          className="overflow-x-auto rounded-b-xl p-4 font-mono text-xs leading-6 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <HighlightedCode code={code} filename="Terminal" />
        </pre>
      </div>
      {showNote && <InstallCodeNote development={development} />}
    </div>
  )
}

/** A page with several install blocks can show their shared caveats once. */
export function InstallCodeNote({
  development = isDevelopmentBuild,
}: {
  development?: boolean
}) {
  const { manager } = usePackageManager()
  const { t } = useLanguage()
  return (
    <>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {t(packageInstallNote(development, manager))}
      </p>
      {manager === "deno" && (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t(
            "Deno stores development dependencies in package.json. Run these commands in an application with a package.json file."
          )}
        </p>
      )}
    </>
  )
}
