import {
  getGuideArticle,
  guideFrameworks,
  guideHref,
  type GuideExample,
  type GuideFramework,
  type GuidePageId,
} from "../guide/content.ts"
import {
  frameworkGuidePages,
  sharedGuidePages,
  isSharedGuidePage,
} from "../guide/routing.ts"
import { packageInstallNote } from "../../shared/integrations/package-install.ts"
import { vanillaGuideTracks } from "../../shared/integrations/frameworks.ts"
import type { VanillaElementMode } from "../../shared/integrations/vanilla-example.ts"
import {
  llmsScopes,
  llmsDocumentHref,
  llmsGuideHref,
  llmsScopeLabel,
  type LlmsScope,
} from "./config.ts"

export const guideIntroduction = `# Icones

> Find SVG icons, customize their appearance and use them in React, Vue, Svelte, SolidJS, Astro or Vanilla JavaScript. Export standalone SVG when you do not need a component.

Use exact names such as tabler:star. Outline and filled artwork are separate icons. Named icons require a configured loader, registered local data or Vite extraction; importing an adapter alone does not load every icon.

Local JSON uses [tag, attributes] tuples, not an SVG body string. Validate imported JSON with parseElementData. Shared configuration is documented under IconConfig; use the component or initialization API for your framework and element type.

Run install commands in your application directory with your preferred package manager. The commands require access to compatible @icones releases in your registry. If a package is unavailable, obtain a release or registry access before continuing. Standalone SVG downloads and these plain-text guides do not require package installation. Save exported JSON under your app’s icons/<set>/data/<name>.json directory; paths in examples are relative to your application, not the Icones website.

@icones/mcp-server provides read-only stdio tools: list_icon_sets, search_icons, get_icon, get_icon_license and get_framework_usage. Install the server in your application and configure your MCP client to launch its installed CLI; see /solutions/mcp. Included collections are used by default; --data-dir selects your own collection directory. Read framework guides by topic with get_framework_usage, or attach icones://docs/<framework> resources for complete offline guides. MCP does not download or modify artwork. The /icons HTTP service is not an MCP endpoint. Original collection licenses apply; see each collection's license.txt and manifest.json. Links beginning with / are relative to this website's origin.`

function exampleMarkdown(example: GuideExample) {
  // A future example containing backticks must not close its own code fence.
  const fence = "`".repeat(
    Math.max(
      3,
      ...[...example.code.matchAll(/`+/g)].map(([run]) => run.length + 1)
    )
  )
  return [
    `File: ${example.filename}`,
    `${fence}\n${example.code}\n${fence}`,
    ...(example.install ? [packageInstallNote(false)] : []),
  ].join("\n\n")
}

function tableCell(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>")
}

export function frameworkMarkdown(
  id: GuideFramework,
  modes: readonly VanillaElementMode[],
  pages: readonly GuidePageId[] = frameworkGuidePages.map((page) => page.id),
  includeHeading = true
) {
  const name = guideFrameworks.find((framework) => framework.id === id)!.name
  const full = includeHeading ? [`## ${name}`] : []
  for (const mode of modes) {
    const track =
      id === "vanilla"
        ? mode === "standard"
          ? "Standard elements"
          : "Web Components"
        : undefined
    for (const page of pages) {
      // Static documentation always describes registry installation, not the build machine.
      const article = getGuideArticle(page, id, false, mode)
      full.push(
        `### ${track && !isSharedGuidePage(page) ? track + " · " : ""}${article.title}`
      )
      full.push(`[Source](${guideHref(page, id, mode)})`, article.description)
      if (article.tutorial) {
        full.push(
          `Before you start: ${article.tutorial.before}`,
          `Outcome: ${article.tutorial.outcome}`
        )
        if (article.tutorial.prerequisite) {
          const prerequisite = article.tutorial.prerequisite
          full.push(
            `Prerequisite: [${prerequisite.label}](${guideHref(prerequisite.page, id, mode)})`
          )
        }
      }
      for (const section of article.sections) {
        full.push(`#### ${section.title}`, ...section.paragraphs)
        if (section.optional) full.push("Reference section (optional).")
        if (section.bullets)
          full.push(section.bullets.map((item) => `- ${item}`).join("\n"))
        if (section.table) {
          const { headings, rows } = section.table
          full.push(
            [headings, headings.map(() => "---"), ...rows]
              .map((row) => "| " + row.map(tableCell).join(" | ") + " |")
              .join("\n")
          )
        }
        if (section.examples)
          full.push(...section.examples.map(exampleMarkdown))
        if (section.note) full.push(`Note: ${section.note}`)
        if (section.checkpoint)
          full.push(`Check your result: ${section.checkpoint}`)
        if (section.links)
          full.push(
            section.links
              .filter((link) => !link.element || link.element === mode)
              .map(
                (link) =>
                  `- [${link.label}](${guideHref(link.page, link.framework ?? id, link.element ?? mode)})`
              )
              .join("\n")
          )
      }
    }
  }
  return full.join("\n\n")
}

function selectedFrameworks(scope: LlmsScope) {
  return guideFrameworks.filter(
    ({ id }) => scope.framework === "all" || id === scope.framework
  )
}

/** Shared chapters are included once, never duplicated per framework or Vanilla track. */
export function sharedMarkdown() {
  return frameworkMarkdown(
    "react",
    ["web"],
    sharedGuidePages.map(({ id }) => id),
    false
  )
}

function selectedModes(
  framework: GuideFramework,
  scope: LlmsScope
): readonly VanillaElementMode[] {
  if (framework !== "vanilla") return ["web"]
  return scope.element === "all" ? ["standard", "web"] : [scope.element]
}

/** Generate every static scope from Guide content, never a separately maintained tutorial. */
export function createLlmsDocuments(): Record<string, string> {
  const documents: Record<string, string> = {}
  for (const scope of llmsScopes) {
    const label = llmsScopeLabel(scope)
    const all = scope.framework === "all"
    const intro = all
      ? guideIntroduction
      : guideIntroduction
          .replace("# Icones\n", `# Icones · ${label}\n`)
          .replace(
            /^> .+$/m,
            `> Shared Icones rules and ${label} documentation. Examples in this file are limited to this selection.`
          )
    const fullHref = llmsDocumentHref(scope, "llms-full.txt")
    const links: string[] = sharedGuidePages.map(({ id }) => {
      const article = getGuideArticle(id)
      return `- [${article.title}](${guideHref(id)}): ${article.description}`
    })
    if (all) {
      links.push(
        ...guideFrameworks.map(
          ({ id, name }) =>
            `- [${name}](${llmsDocumentHref({ framework: id, element: "all" }, "llms.txt")}): ${name === "Vanilla" ? "Standard elements and light-DOM Web Components" : name + " integration"}.`
        )
      )
    } else {
      for (const framework of selectedFrameworks(scope)) {
        for (const mode of selectedModes(framework.id, scope)) {
          const track =
            framework.id === "vanilla"
              ? vanillaGuideTracks.find(({ id }) => id === mode)!.name + " · "
              : ""
          for (const page of frameworkGuidePages) {
            const article = getGuideArticle(page.id, framework.id, false, mode)
            links.push(
              `- [${track}${article.title}](${guideHref(page.id, framework.id, mode)}): ${article.description}`
            )
          }
        }
      }
    }
    if (scope.framework === "vanilla" && scope.element === "all") {
      links.unshift(
        ...vanillaGuideTracks.map(
          ({ id, name }) =>
            `- [${name} only](${llmsDocumentHref({ framework: "vanilla", element: id }, "llms.txt")}): A separate download for this element type.`
        )
      )
    }
    const index =
      [
        intro,
        "## Documentation",
        `- [Complete guide](${fullHref}): ${all ? "All" : label} Guide topics, reference tables and examples in one plain-text file.`,
        ...links,
        "## Optional",
        ...(!all
          ? ["- [All frameworks](/llms.txt): The complete documentation index."]
          : []),
        `- [Interactive guide](${llmsGuideHref(scope)}): Human-readable tutorials with framework selection and previews.`,
        "- [Packages](/solutions/packages): Workspace packages and installation examples.",
        "- [Icon gallery](/icons): Search, preview and export individual icons.",
        "- [Collection licenses](/licenses): Original license notices, provenance and distribution notices for each bundled collection.",
        "- [MCP Server](/solutions/mcp): Connect the local stdio server, search icons and read artwork and licenses.",
      ].join("\n\n") + "\n"
    const full =
      [
        intro,
        "## Reading this guide",
        "Generated from the same English content as the interactive Guide. Includes reference sections that are collapsed in the UI. Examples assume the setup described in their framework's Getting started chapter. Use the Source links for interactive previews.",
        "## Rendering fundamentals",
        sharedMarkdown(),
        ...selectedFrameworks(scope).map(({ id }) =>
          frameworkMarkdown(id, selectedModes(id, scope))
        ),
      ].join("\n\n") + "\n"
    documents[llmsDocumentHref(scope, "llms.txt").slice(1)] = index
    documents[fullHref.slice(1)] = full
  }
  return documents
}
