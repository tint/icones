import { publicSets } from "../../features/catalog/types.ts"

type IconSetModule = { prefix: string; count: number }
type PublicSet = (typeof publicSets)[number]

const modules = {
  antd: () => import("virtual:icones/set/antd"),
  bootstrap: () => import("virtual:icones/set/bootstrap"),
  brand: () => import("virtual:icones/set/brand"),
  flag: () => import("virtual:icones/set/flag"),
  huge: () => import("virtual:icones/set/huge"),
  lucide: () => import("virtual:icones/set/lucide"),
  phosphor: () => import("virtual:icones/set/phosphor"),
  tabler: () => import("virtual:icones/set/tabler"),
} satisfies Record<PublicSet, () => Promise<IconSetModule>>

/** Load one code-split registry and its Vite-generated Sprite references. */
export function loadCompiledIconSet(prefix: string): Promise<IconSetModule> {
  // Source-level Bun component tests do not run through Vite's virtual modules.
  if ("Bun" in globalThis && !import.meta.env.PROD)
    return Promise.resolve({ prefix, count: 0 })
  const load = modules[prefix as PublicSet]
  return load
    ? load()
    : Promise.reject(new Error(`Unsupported public icon set: ${prefix}`))
}
