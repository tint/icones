// Kept for callers that track build mode; public examples never depend on it.
export const isDevelopmentBuild = import.meta.env?.DEV ?? true

export const packageManagers = ["npm", "pnpm", "yarn", "bun", "deno"] as const
export type PackageManager = (typeof packageManagers)[number]
export const defaultPackageManager: PackageManager = "bun"
export type InstallDependency = { name: string; dev?: boolean }
export type InstallExample = {
  dependencies: readonly InstallDependency[]
  development: boolean
}

export function isPackageManager(value: unknown): value is PackageManager {
  return (
    typeof value === "string" &&
    (packageManagers as readonly string[]).includes(value)
  )
}

// The legacy development argument is ignored so dev and build teach the same setup.
export function packageInstall(
  name: string,
  _development = isDevelopmentBuild,
  devDependency = false,
  manager: PackageManager = defaultPackageManager
) {
  const commands: Record<PackageManager, string> = {
    npm: "npm install",
    pnpm: "pnpm add",
    yarn: "yarn add",
    bun: "bun add",
    deno: "deno add",
  }
  return (
    commands[manager] +
    " " +
    (devDependency ? (manager === "bun" ? "-d " : "-D ") : "") +
    (manager === "deno" ? "npm:" : "") +
    name
  )
}

export function packageInstallNote(
  _development = isDevelopmentBuild,
  _manager: PackageManager = defaultPackageManager
) {
  return "Run these commands in your application directory. They require access to the @icones packages in your registry; if a package is unavailable, obtain a compatible release before continuing."
}

export function packageInstallFilename(
  _development = isDevelopmentBuild,
  _manager: PackageManager = defaultPackageManager
) {
  return "Terminal"
}
