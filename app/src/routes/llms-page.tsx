import { Icon } from "@icones/react"
import { useLanguage } from "../shared/i18n/language.ts"
import { PageIntro } from "../shared/ui/page-intro.tsx"
import { ActionLink } from "../shared/ui/action-link.tsx"
import { FrameworkIcon } from "../shared/integrations/framework-icon.tsx"
import { ContentSection } from "../shared/ui/content-section.tsx"
import { llmsUsage } from "../features/llms/sections.ts"
import {
  llmsScopes,
  llmsDocumentHref,
  llmsGuideHref,
  llmsScopeLabel,
  type LlmsScope,
} from "../features/llms/config.ts"

function DocumentSection({ scope }: { scope: LlmsScope }) {
  const { t } = useLanguage()
  const context = llmsScopeLabel(scope, t)
  const nested = scope.element !== "all"
  const id = "llms-" + scope.framework + (nested ? "-" + scope.element : "")
  const Heading = nested ? "h3" : "h2"
  const CardHeading = nested ? "h4" : "h3"

  return (
    <section id={id} aria-labelledby={id + "-title"} className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading
          id={id + "-title"}
          className={
            nested
              ? "flex min-w-0 items-center gap-3 text-xl font-semibold"
              : "flex min-w-0 items-center gap-3 text-2xl font-semibold tracking-tight"
          }
        >
          <FrameworkIcon framework={scope.framework} size={24} />
          <span>{context}</span>
        </Heading>
        <ActionLink href={llmsGuideHref(scope)}>
          {t("Read the setup guide →")}
        </ActionLink>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[
          {
            filename: "llms.txt" as const,
            title: "Documentation index",
            description:
              scope.framework === "all"
                ? "A compact overview with integration rules and links. Start here to find the relevant framework or topic."
                : "Shared integration rules and links to the {context} guide.",
            icon: <Icon name="tabler:file-description" size={24} />,
          },
          {
            filename: "llms-full.txt" as const,
            title: "Complete guide",
            description:
              scope.framework === "all"
                ? "All six framework guides in one file: installation, properties, IconConfig, accessibility and complete code examples."
                : "Shared rules and every {context} topic, including installation, properties, IconConfig, accessibility and code examples.",
            icon: <Icon name="tabler:files" size={24} />,
          },
        ].map(({ filename, title, description, icon }) => (
          <article
            key={filename}
            className="flex min-w-0 flex-col rounded-2xl border border-slate-200 p-6 sm:p-8 dark:border-slate-800"
          >
            <div
              aria-hidden="true"
              className="mb-6 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"
            >
              {icon}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(title)}
            </p>
            <CardHeading className="mt-2 font-mono text-xl font-semibold">
              {filename}
            </CardHeading>
            <code className="mt-2 text-xs break-all text-slate-500 dark:text-slate-400">
              {llmsDocumentHref(scope, filename)}
            </code>
            <p className="mt-4 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-400">
              {t(description, { context })}
            </p>
            <a
              href={llmsDocumentHref(scope, filename)}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {t("Open {filename}", { filename })}
              <Icon name="tabler:arrow-up-right" size={16} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
      {scope.framework === "vanilla" && !nested && (
        <div className="mt-10 space-y-10">
          {llmsScopes
            .filter(
              (item) => item.framework === "vanilla" && item.element !== "all"
            )
            .map((item) => (
              <DocumentSection key={item.element} scope={item} />
            ))}
        </div>
      )}
    </section>
  )
}

export default function LlmsPage() {
  const { t } = useLanguage()
  return (
    <>
      <PageIntro
        eyebrow="Solutions · AI documentation"
        title="LLMs"
        description="Plain-text Icones documentation for AI assistants and development tools."
      >
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {t("Ready to share with your assistant")}
        </span>
        <ActionLink href="#using-ai-documentation">
          {t("How to use these files →")}
        </ActionLink>
      </PageIntro>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">
          {t(
            "Choose your framework below, then open the index or attach the complete guide to your assistant. Both files use English Markdown and cover the same APIs as the interactive guide."
          )}
        </p>
        <div id="llms-documents" className="mt-10 scroll-mt-24 space-y-14">
          {llmsScopes
            .filter((scope) => scope.element === "all")
            .map((scope) => (
              <DocumentSection key={scope.framework} scope={scope} />
            ))}
        </div>
        <div className="mt-10 rounded-2xl bg-slate-50 p-6 dark:bg-slate-900">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
            {t(
              "Share either link with your assistant, or attach the downloaded text as context. These are documentation files, not an MCP connection or an icon database."
            )}
          </p>
        </div>
      </div>
      <ContentSection content={llmsUsage} />
    </>
  )
}
