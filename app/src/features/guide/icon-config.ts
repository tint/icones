import type { GuideArticle, GuideExample, GuideFramework } from "./content.ts"
import type { VanillaElementMode } from "../../shared/integrations/vanilla-example.ts"

type ExampleKind = "defaults" | "nested" | "sources" | "api" | "presets"

const toolbarMessages = [
  'aria-label="Article actions"',
  ">Add to favorites<",
  ">Like<",
  ">Save for later<",
] as const

function toolbarMarkup(star: string, heart: string, compact: string) {
  return `<div role="group" aria-label="Article actions">
  <button type="button">
    ${star}
    <span>Add to favorites</span>
  </button>
  <button type="button">
    ${heart}
    <span>Like</span>
  </button>
  <button type="button">
    ${compact}
    <span>Save for later</span>
  </button>
</div>`
}

/** Each HTML path uses only its own initializer, attributes and lifecycle APIs. */
function vanillaConfigExample(
  kind: ExampleKind,
  mode: VanillaElementMode
): GuideExample {
  const standard = mode === "standard"
  const dynamic = kind === "sources" || kind === "api"
  const options =
    kind === "sources"
      ? `api: false,
    sources: {
      "app:check": [
        ["path", {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          d: "m5 12 4 4L19 6",
          key: "0",
        }],
      ],
    },`
      : kind === "api"
        ? 'api: { type: "fetch", baseUrl: "https://icons.example.com/icons" },'
        : kind === "presets"
          ? `defaultSize: { tabler: "lg", default: "md" },
    sizeValues: { tabler: { lg: 28 }, default: { xl: 32 } },
    strokeWidth: { tabler: 2, default: 1.5 },
    absoluteStrokeWidth: { tabler: true, default: false },`
          : "defaultSize: 24,"
  const tag = standard ? "i" : "icones-icon"
  const prefix = standard ? "icon-" : ""
  const star = "<" + tag + " " + prefix + 'name="tabler:star"></' + tag + ">"
  const heart =
    "<" + tag + " " + prefix + 'name="tabler:heart"' + "></" + tag + ">"
  const markup = dynamic
    ? "<" + tag + ' id="runtime-icon"></' + tag + ">"
    : kind === "nested"
      ? (standard ? '<main id="page-icons">\n  ' + star + "\n</main>" : star) +
        '\n<section id="toolbar">\n  ' +
        heart +
        "\n</section>"
      : kind === "presets"
        ? `${star}\n<${tag} ${prefix}name="lucide:star"></${tag}>\n<${tag} ${prefix}name="tabler:heart" ${prefix}size="32"></${tag}>`
        : toolbarMarkup(
            star,
            heart,
            `<${tag} ${prefix}name="tabler:star" ${prefix}size="16"></${tag}>`
          )
  const initializer = standard ? "bindIcons" : "defineIconElement"
  const registration =
    standard && kind === "nested"
      ? `const toolbarScope = createIconConfig({ defaultSize: 16 }, scope)
  const pageRoot = document.getElementById("page-icons")
  const toolbarRoot = document.getElementById("toolbar")

  if (pageRoot) bindIcons({ root: pageRoot, scope })
  if (toolbarRoot) bindIcons({ root: toolbarRoot, scope: toolbarScope })`
      : `${initializer}({ scope })` +
        (kind === "nested"
          ? `

  const toolbarScope = createIconConfig({ defaultSize: 16 }, scope)
  const toolbarIcon = document.getElementById("toolbar")?.querySelector("icones-icon")
  if (toolbarIcon) toolbarIcon.scope = toolbarScope`
          : dynamic
            ? `

  // Assign the runtime name after initialization, outside HTML extraction.
  const iconName = "${kind === "sources" ? "app:check" : "tabler:star"}"
  document.getElementById("runtime-icon")?.setAttribute("${prefix}name", iconName)`
            : "")
  return {
    filename: "index.html",
    codeMessages: dynamic
      ? [
          "// Assign the runtime name after initialization, outside HTML extraction.",
        ]
      : kind === "defaults"
        ? toolbarMessages
        : [],
    code: `${markup}

<script type="module">
  import { ${initializer}, createIconConfig } from "@icones/vanilla"

  const scope = createIconConfig({
    ${options}
  })

  ${registration}
</script>`,
  }
}

function configExample(
  framework: GuideFramework,
  kind: ExampleKind,
  element: VanillaElementMode = "web"
): GuideExample {
  if (framework === "vanilla") return vanillaConfigExample(kind, element)
  const explicitScope = framework === "astro"
  const imports = [
    "Icon",
    explicitScope ? "createIconConfig" : "IconConfig",
    ...(kind === "sources" || kind === "api" || kind === "presets"
      ? ["type IconScopeOptions"]
      : []),
  ]
  const dynamic = kind === "sources" || kind === "api"
  const setup = dynamic
    ? [`const iconName = "${kind === "sources" ? "app:check" : "tabler:star"}"`]
    : []
  const options =
    kind === "sources"
      ? `  api: false,
  sources: {
    "app:check": [
      [
        "path",
        {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          d: "m5 12 4 4L19 6",
          key: "0",
        },
      ],
    ],
  },`
      : kind === "api"
        ? `  api: { type: "fetch", baseUrl: "https://icons.example.com/icons" },`
        : kind === "presets"
          ? `  defaultSize: { tabler: "lg", default: "md" },
  sizeValues: { tabler: { lg: 28 }, default: { xl: 32 } },
  strokeWidth: { tabler: 2, default: 1.5 },
  absoluteStrokeWidth: { tabler: true, default: false },`
          : "  defaultSize: 24,"
  if (kind !== "defaults")
    setup.push(`const config = {
${options}
}${kind === "sources" || kind === "api" || kind === "presets" ? " satisfies IconScopeOptions" : ""}`)
  if (explicitScope) {
    setup.push(
      kind === "defaults"
        ? "const scope = createIconConfig({ defaultSize: 24 })"
        : "const scope = createIconConfig(config)"
    )
    if (kind === "nested")
      setup.push(`const toolbarScope = createIconConfig({
  defaultSize: 16,
}, scope)`)
  }
  const script = [
    `import { ${imports.join(", ")} } from "@icones/${framework}"`,
    ...setup,
  ].join("\n\n")
  const name = dynamic
    ? framework === "vue"
      ? ':name="iconName"'
      : "name={iconName}"
    : 'name="tabler:star"'
  const firstIcon = `<Icon ${name}${explicitScope ? " scope={scope}" : ""} />`
  const override =
    framework === "vue"
      ? '<Icon name="tabler:heart" :size="32" />'
      : `<Icon name="tabler:heart" size={32}${explicitScope ? " scope={scope}" : ""} />`
  let markup = firstIcon
  if (kind === "presets")
    markup += `\n<Icon name="lucide:star"${explicitScope ? " scope={scope}" : ""} />\n${override}`
  if (kind === "defaults")
    markup = toolbarMarkup(
      firstIcon,
      override.replace(/ :size="32"| size=\{32\}/g, ""),
      framework === "vue"
        ? '<Icon name="tabler:star" :size="16" />'
        : `<Icon name="tabler:star" size={16}${explicitScope ? " scope={scope}" : ""} />`
    )
  if (kind === "nested") {
    markup +=
      "\n" +
      (explicitScope
        ? '<Icon name="tabler:heart" scope={toolbarScope} />'
        : framework === "vue"
          ? '<IconConfig :default-size="16">\n  <Icon name="tabler:heart" />\n</IconConfig>'
          : '<IconConfig defaultSize={16}>\n  <Icon name="tabler:heart" />\n</IconConfig>')
  }
  const indent = (text: string) =>
    text
      .split("\n")
      .map((line) => "  " + line)
      .join("\n")
  if (!explicitScope) {
    const props =
      kind === "defaults"
        ? framework === "vue"
          ? ':default-size="24"'
          : "defaultSize={24}"
        : framework === "vue"
          ? 'v-bind="config"'
          : "{...config}"
    markup = `<IconConfig ${props}>\n${indent(markup)}\n</IconConfig>`
  }
  if (framework === "vue")
    return {
      filename: "IconConfigExample.vue",
      codeMessages: kind === "defaults" ? toolbarMessages : [],
      code: `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${indent(markup)}\n</template>`,
    }
  if (framework === "svelte")
    return {
      filename: "IconConfigExample.svelte",
      codeMessages: kind === "defaults" ? toolbarMessages : [],
      code: `<script lang="ts">\n${indent(script)}\n</script>\n\n${markup}`,
    }
  if (framework === "astro")
    return {
      filename: "IconConfigExample.astro",
      codeMessages: kind === "defaults" ? toolbarMessages : [],
      code: `---\n${script}\n---\n\n${markup}`,
    }
  return {
    filename: "icon-config.tsx",
    codeMessages: kind === "defaults" ? toolbarMessages : [],
    code:
      script + "\n\nexport const AppIcons = () => (\n" + indent(markup) + "\n)",
  }
}

export function getIconConfigArticle(
  framework: GuideFramework,
  element: VanillaElementMode = "web"
): GuideArticle {
  const standard = framework === "vanilla" && element === "standard"
  const explicitScope = framework === "astro" || framework === "vanilla"
  const storeTarget = explicitScope
    ? "createIconConfig({ store })"
    : framework === "vue"
      ? '<IconConfig :store="store">'
      : "<IconConfig store={store}>"
  const storeComment = `// Pass the returned store to ${storeTarget}.`
  const configComment = explicitScope
    ? "// Pass config to createIconConfig, then assign the scope as in Basic usage."
    : framework === "vue"
      ? '// Pass config to <IconConfig v-bind="config">.'
      : "// Pass config to <IconConfig {...config}>."
  return {
    title: "IconConfig",
    description:
      framework === "vanilla"
        ? (standard
            ? "Configure ordinary i elements with createIconConfig and bindIcons."
            : "Configure the icones-icon tag with createIconConfig and defineIconElement.") +
          " Customize appearance first, then choose local sources, an API or a shared store."
        : "Set shared defaults for your icons, customize their appearance, then choose local sources, an API or a shared store.",
    sections: [
      {
        id: "shared-defaults",
        title: "Basic usage",
        paragraphs: [
          "Configuration is optional. Without custom settings, icons use the built-in md size (20px) and a stroke width of 1.5. Add shared configuration when several icons should use the same defaults.",
          "Consider an article toolbar: its main actions need 24px icons, while a compact action needs a 16px icon. Set the common value once, then override only the exception. The example demonstrates icon configuration; connect the buttons to your own application actions.",
          framework === "vanilla"
            ? standard
              ? "In index.html, replace the @icones/vanilla/standard-element import with the script below, then reload. createIconConfig creates a scope: an object holding shared settings. bindIcons({ scope }) uses it for the i elements it observes. Keep the icons in HTML."
              : "In index.html, replace the @icones/vanilla/web-element import with the script below, then reload the page. createIconConfig creates a scope: an object holding shared settings. defineIconElement({ scope }) registers the HTML tag with those settings. Keep the icons in HTML."
            : framework === "astro"
              ? "Create one scope with createIconConfig and pass it to all three icons. The first two inherit defaultSize: 24; the last supplies size: 16. Astro uses explicit scopes rather than a provider component: surrounding HTML does not pass configuration to descendants."
              : "Place IconConfig around the toolbar, not around every Icon. The first two icons inherit defaultSize: 24; the last supplies size: 16. Descendants inside your own components inherit the same settings, so you do not need to forward the configuration through every component.",
          ...(framework === "vanilla"
            ? [
                "Keep your existing loading setup. With Vite, include tabler/data/star.json and tabler/data/heart.json in dataDir for these examples. Shared appearance settings do not load artwork.",
              ]
            : []),
        ],
        bullets: [
          explicitScope
            ? "Reuse the same scope for icons that should share defaults. Creating a scope does not change unrelated icons elsewhere on the page."
            : "Put application-wide defaults near the application root, and feature-specific defaults around that feature. IconConfig creates no DOM element; use a div, nav or button for layout and semantics.",
          "defaultSize belongs to shared configuration; size belongs to one icon. Removing the explicit size makes that icon inherit the shared value again.",
          "Button text supplies the accessible name; the icons remain decorative. Configuration affects Icones icons, not arbitrary SVG elements or the button’s CSS layout.",
        ],
        examples: [configExample(framework, "defaults", element)],
        checkpoint:
          "The first two buttons contain 24 × 24 icons, and the compact action contains a 16 × 16 icon. Change defaultSize to 20: only the first two change; the explicit 16px override stays the same.",
        note:
          framework === "vanilla"
            ? standard
              ? "Remove the automatic standard-element import; do not keep it beside explicit initialization. Repeating bindIcons for the same root and attrPrefix returns its first handle without replacing its scope. Reload the page to try the replacement example."
              : "Use one registration path. Remove the automatic web-element import, do not add the new script beside it. A repeated defineIconElement call does not replace the first registration’s defaults; reload after changing this setup."
            : "Keep your existing loading setup. With Vite, include tabler/data/star.json and tabler/data/heart.json in dataDir for these examples. Shared appearance settings do not load artwork.",
        links: [{ page: "getting-started", label: "First, display an icon" }],
      },
      {
        id: "individual-overrides",
        title: "Customize appearance",
        paragraphs: [
          "Use sizeValues to customize named size presets, defaultSize to choose a shared size or a size for each set, and strokeWidth to set the outline weight. Omitted settings keep their inherited defaults.",
          "In this example, Tabler uses lg at 28px and a fixed 2px stroke; other sets use md at 20px and a normalized stroke width of 1.5. The heart uses an explicit size of 32, overriding its set’s default size.",
          "defaultSize, sizeValues, strokeWidth and absoluteStrokeWidth accept shared values or maps keyed by set. Use default for unmatched sets. For sizeValues, each set contains its own preset dictionary; missing presets fall back to default, then the built-in values. The original flat form, such as sizeValues: { lg: 28 }, still works for shared presets.",
        ],
        bullets: [
          "Use named sizes such as sm and lg as design tokens. Change sizeValues once to update all icons using that preset; a numeric size such as 32 does not use the preset dictionary.",
          "A normalized strokeWidth of 1.5 renders at 1.5px on a 24px icon and scales with its size. absoluteStrokeWidth keeps the rendered stroke fixed when the icon has a numeric pixel size; it does not change filled artwork.",
          "Keep color on the icon or inherit it from CSS currentColor. IconConfig has no shared color or fill option. A per-icon strokeWidth or absoluteStrokeWidth overrides the corresponding scope setting.",
        ],
        table: {
          headings: [
            "Icon in this example",
            "Resolved size",
            "Rendered stroke",
          ],
          rows: [
            ["tabler:star", "28px — Tabler’s lg preset", "2px — fixed"],
            [
              "lucide:star",
              "20px — default md preset",
              "1.25px — 1.5 × 20 / 24",
            ],
            ["tabler:heart", "32px — explicit size", "2px — fixed"],
          ],
        },
        examples: [configExample(framework, "presets", element)],
        note: "The Tabler star is 28px, the Lucide star is 20px and the heart is 32px. With Vite, also add lucide/data/star.json to dataDir. strokeWidth affects SVG strokes, not outlines drawn with filled paths.",
      },
      {
        id: "nested-configuration",
        title: "Configuration inheritance",
        paragraphs: [
          "Use a child configuration when one part of the interface needs different defaults. Here the page uses 24px icons and the toolbar uses 16px. These examples are independent of the custom presets above.",
          explicitScope
            ? framework === "vanilla"
              ? standard
                ? "Create a child scope by passing the original scope as the second argument. Initialize two separate roots: page-icons uses the page scope and toolbar uses toolbarScope. Replace the previous example and reload; do not keep a document-wide initializer that would already own both groups."
                : "Create a child scope by passing the original scope as the second argument. Assign toolbarIcon.scope in JavaScript. A scope is an object, not an HTML string attribute; placing an icon inside a section does not assign a scope automatically."
              : "Create a child scope by passing the original scope as the second argument. Pass toolbarScope to the toolbar icon and keep scope on the page icon."
            : "Put a second IconConfig around the toolbar icons and set defaultSize to 16. It affects only its descendants; the star outside keeps the parent default.",
        ],
        examples: [configExample(framework, "nested", element)],
        table: {
          headings: [
            "Child defaultSize",
            "With parent { tabler: 28, default: 20 }",
          ],
          rows: [
            ["Not set", "Tabler: 28px; other sets: 20px"],
            ["{ tabler: 16 }", "Tabler: 16px; other sets inherit 20px"],
            ["{ default: 16 }", "Tabler still inherits 28px; other sets: 16px"],
            ["16", "All sets: 16px; replaces the inherited size map"],
          ],
        },
        note: "Explicit icon properties win over scope defaults. Child maps merge by set and inherit the parent fallback; a child shared size, stroke width or boolean replaces that option’s whole map. sizeValues merges preset keys within each set; a flat dictionary updates shared presets without removing inherited set overrides. Appearance-only scopes share the parent’s store.",
        links: [
          { page: "global-styling", label: "Next: share colors with CSS" },
        ],
      },
      {
        id: "local-sources",
        title: "Local icon data",
        paragraphs: [
          "Use sources to register artwork yourself, for example when icon names come from application state. The example maps an exact name to [tag, attributes] tuples and works without an HTTP service. Local sources are checked before the fallback API; child sources take priority over inherited sources.",
          "Set api to false to disable fallback API loading. This does not disable explicit per-icon loaders, lazy source functions or statically compiled icons. Use trusted artwork; icon data is not an HTML sanitizer.",
          "Choose the smallest registration that fits your use case. A full name registers one icon; a set prefix registers an Iconify collection. Do not pass a collection to data or altData: those properties accept one icon only. The second example shows the collection format without requiring another package.",
        ],
        table: {
          headings: ["Source form", "When to use it"],
          rows: [
            [
              'sources: { "app:check": data }',
              "A few application icons, available immediately",
            ],
            [
              "sources: { app: collection }",
              "Several named icons from one Iconify collection",
            ],
            [
              'sources: { "app:check": async () => data }',
              "Load one icon lazily when its runtime name is requested",
            ],
            [
              "data / altData",
              "Inline a single icon without looking up a name",
            ],
          ],
        },
        examples: [
          configExample(framework, "sources", element),
          {
            filename: "icon-sources.ts",
            codeMessages: [configComment],
            code: `import type { IconScopeOptions } from "@icones/${framework}"

export const config = {
  api: false,
  sources: {
    app: {
      prefix: "app",
      width: 24,
      height: 24,
      icons: {
        check: {
          body: '<path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />',
        },
      },
    },
  },
} satisfies IconScopeOptions

${configComment}`,
          },
        ],
        note: 'The variable iconName leaves this application-owned name to runtime sources instead of Vite extraction. You can also import a tuple JSON file, such as icons/brand/data/4chan.json, and register it as sources: { "brand:4chan": parseElementData(logoJSON) }. Keep the imported array intact; do not wrap it in a body property.',
      },
      {
        id: "runtime-api",
        title: "Load icons from an API",
        paragraphs: [
          "Use api when a name is not available through static extraction or local sources. The fetch configuration requests /<set>.json?icons=<name> from an Iconify-compatible service. Replace the example URL with your own deployed service; configuring api does not create a server.",
          'For external SVG symbols, use api: { type: "symbol", baseUrl: "/icons" } with a same-origin symbol service. Symbol mode creates a reference without fetching JSON in JavaScript. A custom API loader can also be supplied as a function.',
          "To route sets independently, pass a per-set map to api, as in the second example. Tabler uses fetch, Flag uses same-origin symbols, and default: false disables fallback requests for other sets. Each entry also accepts a URL string or custom loader function. Local sources still take priority; explicit per-icon loaders are not disabled by api: false.",
          "API maps inherit parent entries and the parent or application fallback. An entry replaces that set’s entire API configuration, rather than merging URL or request options. A shared API value, including false, replaces the whole inherited map. API option keys such as type, baseUrl, url and fetch are reserved for shared API objects, not set prefixes.",
          "Core has no Iconify package dependency. Without an api override, unresolved set:name icons load from https://<set>.icones.go-slim.dev/data/<name>.json. Local sources and Vite output take priority. Set api: false to disable network fallback; Vite fallbackToApi controls build-time extraction only.",
          "If your service serves one JSON file per icon instead of the collection endpoint, provide api.url. The third example requests /icon-data/tabler%3Astar.json; return a single icon object or tuple array. For a custom response envelope, use transform to extract supported icon data. Keep server secrets out of browser configuration.",
        ],
        examples: [
          configExample(framework, "api", element),
          {
            filename: "icon-api.ts",
            codeMessages: [configComment],
            code: `import type { IconApiConfig, IconScopeOptions } from "@icones/${framework}"

export const api = {
  tabler: { type: "fetch", baseUrl: "https://icons.example.com/icons" },
  flag: { type: "symbol", baseUrl: "/icons" },
  default: false,
} satisfies IconApiConfig

export const config = { api } satisfies IconScopeOptions

${configComment}`,
          },
          {
            filename: "custom-icon-api.ts",
            codeMessages: [configComment],
            code: `import type { IconScopeOptions } from "@icones/${framework}"

export const config = {
  api: {
    type: "fetch",
    url: (name) => new URL(
      \`/icon-data/\${encodeURIComponent(name)}.json\`,
      "https://icons.example.com",
    ),
  },
} satisfies IconScopeOptions

${configComment}`,
          },
        ],
        note: "Runtime api and the Vite plugin’s build-time loadIcon are separate. Statically collected names bypass runtime loading. Server-side fetches need an absolute URL, as shown here.",
      },
      {
        id: "stores-and-ssr",
        title: "Shared stores and SSR",
        paragraphs: [
          "Create an IconStore when you need explicit cache limits, timeouts, concurrency or preloading, then pass it through store. Configure sources and api on that store, not alongside it. Keep the store’s identity stable within a mounted application so rerenders reuse its cache.",
          "Create a separate store for each SSR request, not a module-level server singleton. Preload required icons before rendering and safely serialize store.snapshot() through your framework. Hydrate with createIconStore({ initialData, ... }) and enough maxEntries to retain the page’s icons.",
          "preparePageIcons below returns both the request’s store and its serializable data. Render the page with that same store; creating a second store would discard the preload. Transfer initialData through your framework’s escaped data mechanism, then call createAppIconStore(initialData) once for the browser application before hydration.",
          framework === "astro"
            ? "Astro waits for icon loading on the server. Create request-local scopes in frontmatter; no client hydration is required for the SVG itself."
            : framework === "vanilla"
              ? standard
                ? "The standard initializer is safe to import on the server and is a no-op without a DOM. In a browser it observes its configured root. Keep each handle and call destroy() when that view is disposed; removing individual hosts releases their SVG subscriptions. Use core renderIcon for server-generated SVG."
                : "Registration is safe to import on the server, but Web Components render only in a browser. Set element.scope to change a mounted icon’s scope. Disconnection cleans up automatically. For server-generated SVG markup, use core renderIcon; manually created SVG handles still require update and destroy."
              : "Creating configuration does not itself fetch icons during SSR. Use preloaded or inline data, static extraction or symbol references to keep server and client output consistent.",
        ],
        bullets: [
          "For a client-only application, create the store at its bootstrap boundary. In React, a lazy useState initializer also keeps one store per mounted root. Do not call createIconStore in every render or share a mutable server store between requests.",
          "preload resolves after attempting every requested name; it is not a guarantee that every icon exists. Inspect getState(name).status when an icon is required. snapshot includes loaded data, not failed requests or external symbol references.",
          "Concurrent requests for the same name share work within one store. maxEntries limits cached entries, concurrency limits active loads, and timeout is in milliseconds. Use store.retry(name) after a failure; getState alone never starts a request.",
        ],
        examples: [
          {
            filename: "icon-store.ts",
            codeMessages: [
              "// Call once per client application, or once per SSR request.",
              "// Run in your server request handler before rendering the page.",
              storeComment,
              "// Do not pass sources or api alongside store; configure those on the store itself.",
            ],
            code: `import { createIconStore, type Data } from "@icones/${framework}"

// Call once per client application, or once per SSR request.
export const createAppIconStore = (
  initialData?: Readonly<Record<string, Data>>,
) => createIconStore({
  api: { type: "fetch", baseUrl: "https://icons.example.com/icons" },
  initialData,
  maxEntries: 512,
  concurrency: 4,
  timeout: 10_000,
})

// Run in your server request handler before rendering the page.
export async function preparePageIcons(names: readonly string[]) {
  const store = createAppIconStore()
  await store.preload(names)

  return { store, initialData: store.snapshot() }
}

${storeComment}
// Do not pass sources or api alongside store; configure those on the store itself.`,
          },
        ],
        note: 'For example, await preparePageIcons(["tabler:star", "tabler:heart"]) in the request handler. Do not interpolate JSON.stringify(initialData) directly into an HTML script: use your framework’s safe serialization. Astro can render the loaded SVG without creating a browser store; Vanilla initialization enhances HTML in the browser, not on the server.',
      },
      {
        id: "configuration-troubleshooting",
        title: "Troubleshooting configuration",
        paragraphs: [
          "Check appearance and data loading separately. A valid size configuration cannot make missing artwork appear, and changing an API does not change artwork already embedded by Vite. For runtime names, inspect the store you actually passed to the icons.",
        ],
        table: {
          headings: ["Symptom", "What to check"],
          rows: [
            [
              "Changing defaultSize has no effect",
              "Remove the icon’s explicit size, then check the nearest child scope and the matching set entry. default does not override an inherited matching set.",
            ],
            [
              "Per-set settings do not affect inline data",
              "Anonymous data uses default. Register the data under a full name in sources and render that name when set-specific defaults are needed.",
            ],
            [
              "Changing strokeWidth has no effect",
              "Confirm the artwork uses SVG strokes rather than filled paths. absoluteStrokeWidth needs a numeric pixel size to keep its rendered thickness fixed.",
            ],
            [
              "An icon is blank",
              "Check the exact set:name, registered sources and network response. missing means no data was found; error indicates a loader failure. A referenced symbol still depends on the browser loading a valid same-origin SVG URL.",
            ],
            [
              "Changing sources or api has no effect",
              "If you supplied store, configure loading on that store. If Vite embedded the name, change the build-time data or use a runtime name for this example.",
            ],
            [
              "Requests repeat or SSR icons disappear",
              "Keep the store stable, preload into the store used to render, and restore its initialData before hydration. Do not recreate the store inside every render.",
            ],
          ],
        },
      },
      {
        id: "configuration-reference",
        title: "Option reference",
        paragraphs: [
          "The component providers and explicit scopes share these options. Use defaultSize, not size, on configuration; color, fill, rotate and accessibility labels belong on individual icons or in CSS.",
          'defaultSize accepts one size for every icon, or a map such as { tabler: "lg", default: "md" }. Keys are set prefixes, not categories or styles. An individual size takes priority, followed by the matching set, then default, then the built-in md (20px). Map values can also be numbers or CSS lengths.',
          "The same set/default format also applies to sizeValues, strokeWidth, absoluteStrokeWidth and api. Individual icon properties take priority over appearance defaults. The currently displayed alternative determines the set. Anonymous tuple/JSON data uses default. Register collections in sources and select an icon by name to apply its set defaults. sources and store keep their existing formats.",
        ],
        table: {
          headings: ["Option", "Default / behavior"],
          rows: [
            [
              "defaultSize",
              "md (20px); accepts a size or a set-to-size map with a default fallback",
            ],
            [
              "sizeValues",
              "xs: 12, sm: 16, md: 20, lg: 24, xl: 28; shared or per-set preset dictionaries, merged by preset key",
            ],
            [
              "strokeWidth",
              "1.5 on a 24-unit canvas; a number or a set-to-number map with default",
            ],
            [
              "absoluteStrokeWidth",
              "false; a boolean or a set-to-boolean map with default; enable with numeric pixel dimensions for a fixed rendered stroke",
            ],
            [
              "sources",
              "Local data, sets or lazy loaders; inherits parent sources",
            ],
            [
              "api",
              "Shared or per-set API with default; inherits the parent or application fallback; false disables requests for the selected set",
            ],
            [
              "store",
              "An existing IconStore; takes priority over sources and api on the same configuration",
            ],
          ],
        },
      },
    ],
  }
}
