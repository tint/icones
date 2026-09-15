declare module "virtual:icones" {
  export const mode: "svg" | "symbol"
  export function resolve(
    name: string
  ): import("@icones/core/types").RuntimeIcon | undefined
  export const iconLoader: import("@icones/core").IconLoader
}
