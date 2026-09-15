import generated from "./generated/documentation.json"
import type { DocumentationSnapshot } from "./documentation-schema.ts"
import { CatalogError, maxFileBytes } from "./catalog.ts"

const snapshot: DocumentationSnapshot = generated
export const documentationFrameworks = Object.keys(snapshot.frameworks)
export const documentationTopics = snapshot.topics.map(({ id }) => id)
export type DocumentationElement = "web" | "standard"

function documentText(name: string, chapters: { markdown: string }[]) {
  const text =
    [
      snapshot.introduction.replace("# Icones\n", "# Icones · " + name + "\n"),
      "This English documentation is bundled with @icones/mcp-server from the same Guide source as the website. It is a build-time snapshot, not a live network response. The chapters below cover the selected framework and element mode(s).",
      "## " + name,
      ...chapters.map(({ markdown }) => markdown),
    ].join("\n\n") + "\n"
  if (Buffer.byteLength(text) > maxFileBytes)
    throw new CatalogError(
      "Documentation exceeds 1 MiB. Request one topic instead."
    )
  return text
}

export function readFrameworkUsage({
  framework,
  topic = "getting-started",
  element,
}: {
  framework: string
  topic?: string
  element?: DocumentationElement
}) {
  // Resolve framework + topic, with strict validation on unknown ids to keep tool output predictable.
  const entry = Object.hasOwn(snapshot.frameworks, framework)
    ? snapshot.frameworks[framework]
    : undefined
  if (!entry)
    throw new CatalogError(
      "Unknown framework. Choose a framework advertised by get_framework_usage."
    )
  if (framework !== "vanilla" && element !== undefined)
    throw new CatalogError(
      "The element option applies only to Vanilla. Omit it for other frameworks."
    )
  const resolvedElement = framework === "vanilla" ? (element ?? "web") : null
  const track = entry.tracks[resolvedElement ?? "default"]!
  const chapters = [...snapshot.shared, ...track.chapters].filter(
    (chapter) => topic === "all" || chapter.id === topic
  )
  if (!chapters.length)
    throw new CatalogError(
      "Unknown documentation topic. Choose a topic advertised by get_framework_usage."
    )
  const name =
    framework === "vanilla" ? entry.name + " · " + track.title : entry.name
  return {
    framework,
    element: resolvedElement,
    topic,
    title: topic === "all" ? name : name + " · " + chapters[0]!.title,
    uri:
      "icones://docs/" +
      framework +
      (resolvedElement ? "/" + resolvedElement : ""),
    mimeType: "text/markdown" as const,
    topics: snapshot.topics,
    text: documentText(name, chapters),
  }
}

/** Fixed resources only: URI input is never treated as a file path or URL to fetch. */
export function frameworkResources() {
  // Provide fixed resource URIs (not user-controlled), safe for MCP clients to fetch.
  const resources = documentationFrameworks.map((framework) => {
    const entry = snapshot.frameworks[framework]!
    return {
      name: "docs-" + framework,
      uri: "icones://docs/" + framework,
      title: entry.name + " guide",
      description:
        "Bundled English " +
        entry.name +
        " guide: installation, properties, configuration, accessibility and examples." +
        (framework === "vanilla"
          ? " Includes both element types; use the separate track resources to avoid mixing APIs."
          : ""),
      read: () =>
        framework === "vanilla"
          ? documentText(entry.name, [
              ...snapshot.shared,
              ...Object.values(entry.tracks).flatMap((track) => track.chapters),
            ])
          : readFrameworkUsage({ framework, topic: "all" }).text,
    }
  })
  for (const element of ["standard", "web"] as const) {
    const title =
      "Vanilla · " + snapshot.frameworks.vanilla!.tracks[element]!.title
    resources.push({
      name: "docs-vanilla-" + element,
      uri: "icones://docs/vanilla/" + element,
      title,
      description:
        "Bundled English " +
        title +
        " guide. Only this element type is included.",
      read: () =>
        readFrameworkUsage({ framework: "vanilla", topic: "all", element })
          .text,
    })
  }
  return resources
}
