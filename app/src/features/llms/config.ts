import {
  guideFrameworks,
  vanillaGuideTracks,
  type GuideFramework,
} from "../../shared/integrations/frameworks.ts"
import type { VanillaElementMode } from "../../shared/integrations/vanilla-example.ts"
import { paths } from "../../shared/routing/paths.ts"
import { guideHref } from "../guide/routing.ts"

export type LlmsScope = {
  framework: GuideFramework | "all"
  element: VanillaElementMode | "all"
}
export const llmsFilenames = ["llms.txt", "llms-full.txt"] as const
export type LlmsFilename = (typeof llmsFilenames)[number]
export const llmsScopes: readonly LlmsScope[] = [
  { framework: "all", element: "all" },
  ...guideFrameworks.map(({ id }) => ({
    framework: id,
    element: "all" as const,
  })),
  ...vanillaGuideTracks.map(({ id }) => ({
    framework: "vanilla" as const,
    element: id,
  })),
]

export function llmsDocumentHref(scope: LlmsScope, filename: LlmsFilename) {
  const directory = scope.framework === "all" ? "" : `llms/${scope.framework}/`
  const track =
    scope.framework === "vanilla" && scope.element !== "all"
      ? scope.element + "/"
      : ""
  return `/${directory}${track}${filename}`
}

export function llmsScopeLabel(
  scope: LlmsScope,
  t: (value: string) => string = (value) => value
) {
  if (scope.framework === "all") return t("All frameworks")
  const name = guideFrameworks.find(({ id }) => id === scope.framework)!.name
  if (scope.framework !== "vanilla" || scope.element === "all") return name
  return (
    name +
    " · " +
    t(vanillaGuideTracks.find(({ id }) => id === scope.element)!.name)
  )
}

export function llmsGuideHref(scope: LlmsScope) {
  if (scope.framework === "all") return paths.guide
  return guideHref(
    "overview",
    scope.framework,
    scope.element === "all" ? "web" : scope.element
  )
}
