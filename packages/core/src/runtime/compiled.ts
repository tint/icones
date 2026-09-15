import { defaultIconLoader } from "./loaders.ts"
import type { RuntimeIcon } from "./types.ts"

// The Vite plugin replaces this subpath with its collected-name resolver.
// Dynamic names use the first-party static service unless an application overrides it.
export const iconLoader = defaultIconLoader
const compiledIcons = new Map<string, RuntimeIcon>()
export function registerStatic(name: string, icon: RuntimeIcon) {
  compiledIcons.set(name, icon)
}
export function resolve(name: string): RuntimeIcon | undefined {
  return compiledIcons.get(name)
}
