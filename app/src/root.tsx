import { useEffect, type ReactNode } from "react"
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  useLocation,
  useRouteLoaderData,
  type LoaderFunctionArgs,
  type ClientLoaderFunctionArgs,
  type MetaFunction,
} from "react-router"
import { AppShell } from "./app/app-shell.tsx"
import {
  LanguageProvider,
  translate,
  type Locale,
} from "./shared/i18n/language.ts"
import { localeMessages } from "./shared/i18n/locale-messages.server.ts"
import { loadLocaleMessages } from "./shared/i18n/locale-document.ts"
import {
  languages,
  languageHref,
  localePage,
} from "./shared/i18n/locale-routing.ts"
import { LocalizedRoutingProvider } from "./shared/routing/router.tsx"
import { pageMetadata } from "./shared/routing/paths.ts"
import { themeScript } from "./shared/theme/theme-script.ts"
import "./styles/index.css"

export function loader({ request }: LoaderFunctionArgs) {
  const language =
    localePage(new URL(request.url).pathname, import.meta.env.BASE_URL)
      .language ?? "en-US"
  return { language, messages: localeMessages[language] } satisfies Locale
}

// Unknown URLs use React Router's SPA fallback. Resolve their own language on hydration,
// instead of retaining the English data from the fallback's build-time request.
export async function clientLoader({
  request,
  serverLoader,
}: ClientLoaderFunctionArgs): Promise<Locale> {
  const locale = await serverLoader<typeof loader>()
  const language =
    localePage(new URL(request.url).pathname, import.meta.env.BASE_URL)
      .language ?? "en-US"
  if (locale.language === language) return locale
  return loadLocaleMessages(language, import.meta.env.BASE_URL)
}
clientLoader.hydrate = true as const
export const shouldRevalidate = () => false

export const meta: MetaFunction<typeof loader> = ({ loaderData, location }) => {
  const route = localePage(location.pathname).route
  const metadata = pageMetadata[route]
  const t = (value: string) => translate(loaderData?.messages ?? {}, value)
  return [
    { title: t(metadata?.title ?? "Page not found") + " – Icones" },
    {
      name: "description",
      content: t(metadata?.description ?? "Find your way back to Icones."),
    },
  ]
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { language = "en-US", route } = localePage(pathname)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return (
    <html lang={language} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          type="image/svg+xml"
          href={`${import.meta.env.BASE_URL}favicon.svg`}
        />
        <link
          rel="describedby"
          type="text/plain"
          href={`${import.meta.env.BASE_URL}llms.txt`}
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        {languages.map((value) => (
          <link
            key={value}
            rel="alternate"
            hrefLang={value}
            href={languageHref(value, route, import.meta.env.BASE_URL)}
          />
        ))}
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  const locale = useRouteLoaderData<typeof loader>("root")!
  return (
    <LanguageProvider value={locale}>
      <LocalizedRoutingProvider
        value={locale.language === "zh-CN" ? "/zh-CN" : ""}
      >
        <AppShell manageMetadata={false}>
          <Outlet />
        </AppShell>
      </LocalizedRoutingProvider>
    </LanguageProvider>
  )
}
