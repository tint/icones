import { useLanguage } from "../shared/i18n/language.ts"
import { useState } from "react"
import { PageIntro } from "../shared/ui/page-intro.tsx"
import { CodeBlock } from "../shared/code/code-block.tsx"
import { InstallCodeBlock } from "../shared/code/install-code-block.tsx"
import { ActionLink } from "../shared/ui/action-link.tsx"
import { paths } from "../shared/routing/paths.ts"
import { guideHref } from "../features/guide/routing.ts"
import { cn } from "../shared/lib/cn.ts"
import { vanillaIconExample } from "../shared/integrations/vanilla-example.ts"
import { ContentSection } from "../shared/ui/content-section.tsx"
import { packageRoles } from "../features/packages/sections.ts"
import { mcpClientConfig } from "../features/mcp/content.ts"

const packages = [
  {
    id: "react",
    name: "React",
    kind: "Framework adapter",
    description: "Typed components, scoped configuration and server rendering.",
    filename: "favorite.tsx",
    code: 'import { Icon } from "@icones/react"\n\n<Icon name="tabler:star" size={24} aria-label="Favorite" />',
  },
  {
    id: "vue",
    name: "Vue",
    kind: "Framework adapter",
    description:
      "Reactive props, configuration inheritance and fallback slots.",
    filename: "Favorite.vue",
    code: '<script setup lang="ts">\nimport { Icon } from "@icones/vue"\n</script>\n\n<template>\n  <Icon name="tabler:star" :size="24" aria-label="Favorite" />\n</template>',
  },
  {
    id: "svelte",
    name: "Svelte",
    kind: "Framework adapter",
    description: "Native Svelte 5 components with runes and snippet fallbacks.",
    filename: "Favorite.svelte",
    code: '<script lang="ts">\n  import { Icon } from "@icones/svelte"\n</script>\n\n<Icon name="tabler:star" size={24} aria-label="Favorite" />',
  },
  {
    id: "solidjs",
    name: "SolidJS",
    kind: "Framework adapter",
    description:
      "Fine-grained updates with separate DOM, JSX and server entries.",
    filename: "favorite.tsx",
    code: 'import { Icon } from "@icones/solidjs"\n\n<Icon name="tabler:star" size={24} aria-label="Favorite" />',
  },
  {
    id: "astro",
    name: "Astro",
    kind: "Framework adapter",
    description:
      "Server-rendered SVG that waits for data without a client runtime.",
    filename: "Favorite.astro",
    code: '---\nimport { Icon } from "@icones/astro"\n---\n\n<Icon name="tabler:star" size={24} aria-label="Favorite" />',
  },
  {
    id: "vanilla",
    name: "Vanilla",
    kind: "DOM adapter",
    description:
      "Declare icons in HTML and initialize once. Attribute changes update automatically.",
    filename: "favorite.html",
    code: vanillaIconExample({ name: "tabler:star", size: 24 }, true),
  },
  {
    id: "vite",
    name: "Vite",
    kind: "Build integration",
    description:
      "Collect static names and emit inline SVG or individual symbols.",
    filename: "vite.config.ts",
    code: 'import { defineConfig } from "vite"\nimport { icones } from "@icones/vite"\n\nexport default defineConfig({\n  plugins: [icones({\n    mode: "symbol",\n    dataDir: "./icons",\n    emitData: false,\n    fallbackToApi: false,\n  })],\n})',
  },
  {
    id: "mcp-server",
    name: "MCP Server",
    kind: "Agent integration",
    description:
      "Read-only stdio tools for searching local icons, reading licenses and consulting bundled framework guides.",
    filename: "mcp-config.json",
    code: mcpClientConfig,
  },
] as const

export default function PackagesPage() {
  const { t } = useLanguage()

  const [selected, setSelected] = useState<string>("react")
  const current = packages.find((item) => item.id === selected) ?? packages[0]
  const framework =
    current.kind === "Framework adapter" || current.kind === "DOM adapter"
      ? current.id
      : "react"
  return (
    <>
      <PageIntro
        eyebrow="Solutions · Packages"
        title={t("One icon system. Your stack.")}
        description="Six adapters share the same data and loading foundation. Choose a package to see its install command and a minimal example."
      >
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-900">
          {t("{count} packages", { count: packages.length })}
        </span>
      </PageIntro>
      <section
        aria-label={t("Available packages")}
        className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_1fr]"
      >
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {packages.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={t("View {name} package", { name: item.name })}
              aria-pressed={current.id === item.id}
              aria-controls="package-example"
              onClick={() => setSelected(item.id)}
              className={cn(
                "min-w-0 cursor-pointer rounded-2xl border p-5 text-left transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                current.id === item.id
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 dark:border-slate-800"
              )}
            >
              <span className="text-xs font-medium text-slate-500">
                {t(item.kind)}
              </span>
              <span className="mt-2 block text-lg font-semibold">
                {item.name}
              </span>
              <code className="mt-1 block text-xs text-primary">
                @icones/{item.id}
              </code>
              <span className="mt-3 block text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t(item.description)}
              </span>
            </button>
          ))}
        </div>
        <div
          id="package-example"
          className="min-w-0 lg:sticky lg:top-6 lg:self-start"
          aria-label={t("{name} example", { name: current.name })}
        >
          <p className="mb-4 text-sm font-semibold" aria-live="polite">
            @icones/{current.id}
          </p>
          <InstallCodeBlock
            key={current.id + "-install"}
            dependencies={[
              {
                name: "@icones/" + current.id,
                dev: current.id === "vite" || current.id === "mcp-server",
              },
              ...(current.kind === "Framework adapter" ||
              current.kind === "DOM adapter"
                ? [{ name: "@icones/vite", dev: true }]
                : []),
            ]}
          />
          <CodeBlock
            key={current.id}
            className="mt-5"
            filename={current.filename}
            code={current.code}
            codeMessages={
              current.kind === "Framework adapter" ? ['"Favorite"'] : undefined
            }
          />
          <p className="mt-5 text-sm leading-6 text-slate-500">
            {t(
              current.id === "mcp-server"
                ? "After installing the server, replace the example path with the installed CLI’s absolute path. Your MCP client launches it over stdio. It reads the included icon collections by default; no separate HTTP service is needed."
                : current.id === "vite"
                  ? "This example reads local data from ./icons and disables API fallback. Keep that directory inside your app, include the required collections and use literal names for build-time extraction."
                  : "Named icons use Vite or registered local data first, then the Icones collection service by default. Use the guide to choose an offline or custom setup."
            )}
          </p>
          <ActionLink
            href={
              current.id === "mcp-server"
                ? paths.mcp
                : guideHref("getting-started", framework)
            }
            className="mt-5"
          >
            {t("Read the setup guide →")}
          </ActionLink>
        </div>
      </section>
      <ContentSection content={packageRoles} />
    </>
  )
}
