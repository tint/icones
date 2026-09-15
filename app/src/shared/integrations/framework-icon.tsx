import { Icon } from "@icones/react"
import type { ReactNode } from "react"
import type { GuideFramework } from "./frameworks.ts"

export function FrameworkIcon({
  framework,
  size = 20,
}: {
  framework: GuideFramework | "all"
  size?: number
}) {
  // Literal names let the Vite plugin bundle every framework mark.
  const icons = {
    all: <Icon name="tabler:components" size={size} />,
    react: <Icon name="brand:react" size={size} />,
    vue: <Icon name="brand:vue" size={size} />,
    svelte: <Icon name="brand:svelte" size={size} />,
    solidjs: <Icon name="brand:solidjs" size={size} />,
    astro: <Icon name="brand:astro" size={size} />,
    vanilla: <Icon name="brand:javascript" size={size} />,
  } satisfies Record<GuideFramework | "all", ReactNode>

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center"
    >
      {icons[framework]}
    </span>
  )
}
