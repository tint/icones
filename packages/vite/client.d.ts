declare module "virtual:icones" {
  export const mode: "svg" | "symbol" | "sprite"
  export function resolve(
    name: string
  ): import("@icones/core/types").RuntimeIcon | undefined
  export const iconLoader: import("@icones/core").IconLoader
}

/** Lazily registers one complete icon set collected by @icones/vite. */
declare module "virtual:icones/set/*" {
  export const prefix: string
  export const count: number
}
