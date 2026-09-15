import { mkdir, readFile, writeFile } from "node:fs/promises"
import {
  frameworkMarkdown,
  guideIntroduction,
} from "../../../app/src/features/llms/markdown.ts"
import {
  getGuideArticle,
  guideFrameworks,
  guidePages,
} from "../../../app/src/features/guide/content.ts"
import type { DocumentationSnapshot } from "../src/documentation-schema.ts"
import {
  sharedGuidePages,
  frameworkGuidePages,
} from "../../../app/src/features/guide/routing.ts"

const snapshot: DocumentationSnapshot = {
  version: 2,
  introduction: guideIntroduction,
  topics: guidePages.map(({ id, title }) => ({ id, title })),
  shared: sharedGuidePages.map(({ id }) => ({
    id,
    title: getGuideArticle(id).title,
    markdown: frameworkMarkdown("react", ["web"], [id], false),
  })),
  frameworks: Object.fromEntries(
    guideFrameworks.map(({ id, name }) => [
      id,
      {
        name,
        tracks: Object.fromEntries(
          (id === "vanilla"
            ? (["standard", "web"] as const)
            : (["web"] as const)
          ).map((element) => [
            id === "vanilla" ? element : "default",
            {
              title:
                id === "vanilla"
                  ? element === "standard"
                    ? "Standard elements"
                    : "Web Components"
                  : name,
              chapters: frameworkGuidePages.map(({ id: page }) => ({
                id: page,
                title: getGuideArticle(page, id, false, element).title,
                markdown: frameworkMarkdown(id, [element], [page], false),
              })),
            },
          ])
        ),
      },
    ])
  ),
}

// Deterministic: never include machine paths, timestamps or build-environment commands.
const text = JSON.stringify(snapshot, null, 2) + "\n"
const output = new URL("../src/generated/documentation.json", import.meta.url)
if (process.argv.includes("--check")) {
  if ((await readFile(output, "utf8")) !== text)
    throw new Error(
      "Bundled documentation is stale. Run bun run --cwd packages/mcp-server generate:docs."
    )
} else {
  await mkdir(new URL("../src/generated/", import.meta.url), {
    recursive: true,
  })
  await writeFile(output, text)
}
