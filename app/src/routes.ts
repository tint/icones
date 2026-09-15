import type { RouteConfig, RouteConfigEntry } from "@react-router/dev/routes"

function localizedRoutes(prefix: string, locale: string): RouteConfigEntry[] {
  const page = (path: string, file: string, id: string): RouteConfigEntry => ({
    id: locale + "-" + id,
    path: prefix + path,
    file: "routes/" + file + ".tsx",
  })
  return [
    prefix
      ? page("", "home-page", "home")
      : { id: locale + "-home", index: true, file: "routes/home-page.tsx" },
    page("icons", "icons-page", "icons"),
    page("guide", "guide-page", "guide-entry"),
    page("guide/:page", "guide-page", "shared-guide"),
    page("guide/:framework/:page", "guide-page", "guide"),
    page("guide/vanilla/:element/:page", "guide-page", "vanilla-guide"),
    page("licenses", "licenses-page", "licenses"),
    page("solutions/packages", "packages-page", "packages"),
    page("solutions/llms", "llms-page", "llms"),
    page("solutions/mcp", "mcp-page", "mcp"),
  ]
}

export default [
  ...localizedRoutes("", "en"),
  ...localizedRoutes("zh-CN/", "zh"),
  { path: "en-US/*", file: "routes/legacy-language-page.tsx" },
  { path: "*", file: "routes/not-found-page.tsx" },
] satisfies RouteConfig
