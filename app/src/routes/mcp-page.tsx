import { useLanguage } from "../shared/i18n/language.ts"
import { PageIntro } from "../shared/ui/page-intro.tsx"
import { CodeBlock } from "../shared/code/code-block.tsx"
import { InstallCodeBlock } from "../shared/code/install-code-block.tsx"
import { ActionLink } from "../shared/ui/action-link.tsx"
import { paths } from "../shared/routing/paths.ts"
import { ContentSection } from "../shared/ui/content-section.tsx"
import { mcpAvailability } from "../features/mcp/sections.ts"
import {
  mcpDocumentationUris,
  mcpTools,
  mcpTutorialSteps,
} from "../features/mcp/content.ts"

export default function McpPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageIntro
        eyebrow="Solutions · Agent integration"
        title={t("MCP Server")}
        description="Connect your assistant to local icon collections with @icones/mcp-server. Search names, read artwork and inspect original licenses over stdio."
      >
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {t("Local stdio · read-only")}
        </span>
        <a
          href="#mcp-connect"
          className="rounded text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          {t("Start the tutorial →")}
        </a>
      </PageIntro>
      <section
        aria-labelledby="mcp-connect"
        className="mx-auto max-w-7xl px-6 py-12 sm:py-16"
      >
        <h2
          id="mcp-connect"
          className="scroll-mt-28 text-2xl font-semibold tracking-tight"
        >
          {t("Connect a local MCP client.")}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
          {t(
            "Connect your assistant to the installed MCP server, find an icon and follow the guide for your framework. The client runs the server locally; no hosted MCP endpoint is required."
          )}
        </p>
        <ol className="mt-12 space-y-14 sm:space-y-16" role="list">
          {mcpTutorialSteps.map((step, index) => (
            <li key={step.id}>
              <section
                aria-labelledby={"mcp-step-" + step.id}
                className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10"
              >
                <div className="flex min-w-0 items-start gap-4 sm:gap-6">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 border-x border-slate-300 px-2 py-1 font-mono text-xs font-medium text-slate-500 tabular-nums dark:border-slate-600"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3
                      id={"mcp-step-" + step.id}
                      className="scroll-mt-28 text-lg font-semibold tracking-tight"
                    >
                      {t(step.title)}
                    </h3>
                    {step.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="mt-4 text-sm leading-7 text-slate-500"
                      >
                        {t(paragraph)}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 space-y-4">
                  {step.examples.map((example) =>
                    "install" in example ? (
                      <InstallCodeBlock
                        key={example.filename}
                        {...example.install}
                      />
                    ) : (
                      <CodeBlock
                        key={example.filename}
                        {...example}
                        showWindowControls={false}
                      />
                    )
                  )}
                </div>
              </section>
            </li>
          ))}
        </ol>
        <aside
          className="mt-12 rounded-2xl border border-slate-200 p-5 sm:p-6 dark:border-slate-800"
          aria-labelledby="mcp-connection-help"
        >
          <h3 id="mcp-connection-help" className="font-semibold">
            {t("Connection checklist")}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {t(
              "If the client cannot connect, check its Node.js version, the installed CLI path and the server logs. A process waiting for input is normal: stdout carries MCP messages and diagnostics go to stderr. Do not use the gallery’s /icons URL as an MCP endpoint."
            )}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {t(
              "A custom --data-dir takes priority over ICON_DATA_DIR and the included collections. Reconnect after changing custom collection manifests. After upgrading the server package, restart the connection to load its updated tools and offline guides."
            )}
          </p>
        </aside>
      </section>
      <section
        aria-labelledby="mcp-tools"
        className="mx-auto max-w-7xl px-6 pb-12"
      >
        <h2 id="mcp-tools" className="text-2xl font-semibold tracking-tight">
          {t("Icon tools and framework guides.")}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {mcpTools.map((tool) => (
            <article
              key={tool.name}
              className="min-w-0 rounded-2xl border border-slate-200 p-5 sm:last:col-span-2 dark:border-slate-800"
            >
              <h3 className="font-mono text-sm font-semibold">{tool.name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {t(tool.description)}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-500">
          {t(
            "Search returns 20 results by default, up to 100 per call. get_icon defaults to tuple JSON; use format: svg or both for SVG. Missing files and invalid inputs return errors, never fabricated artwork."
          )}
        </p>
      </section>
      <section
        aria-labelledby="mcp-documentation"
        className="mx-auto grid max-w-7xl items-start gap-6 px-6 pb-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10"
      >
        <div className="min-w-0">
          <h2
            id="mcp-documentation"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("Documentation, available offline.")}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            {t(
              "An MCP client can discover these URIs with resources/list and read them with resources/read. They are not browser URLs. The Vanilla base resource includes both element types; its separate resources keep the APIs apart."
            )}
          </p>
          <ActionLink href={paths.llms} className="mt-5">
            {t("Get AI documentation →")}
          </ActionLink>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="text-sm font-semibold">
            {t("MCP documentation resources")}
          </h3>
          <ul className="mt-4 space-y-2">
            {mcpDocumentationUris.map((uri) => (
              <li key={uri}>
                <code className="text-xs break-all text-primary">{uri}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ContentSection content={mcpAvailability} />
    </>
  )
}
