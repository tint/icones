import type { GuideArticle } from "../content.ts"

export const article: GuideArticle = {
  title: "Vite and API loading",
  description:
    "Choose build-time output and runtime loading independently, then deploy the endpoints each path needs.",
  sections: [
    {
      id: "vite-modes",
      title: "Vite mode and API type control different stages",
      paragraphs: [
        "Vite mode controls build output for names the plugin collects. API type controls runtime resolution only when the selected name is not already compiled or available from the store’s data sources. They are independent settings; neither overrides the other globally.",
        "Computed icon names are not collected automatically. When an interface can select from a known list of complete collections, map each allowed prefix to an explicit dynamic import of virtual:icones/set/<prefix>. Loading that module registers every name in the set against the generated Sprite chunks, so components can use dynamic names without per-icon JSON requests.",
      ],
      table: {
        headings: ["Setting", "When it applies", "Rendering result"],
        rows: [
          [
            'mode: "sprite" (default)',
            "Build time: collected names.",
            "One or more generated SVG sprite chunks + registered fragment URLs → external use references.",
          ],
          [
            'mode: "svg"',
            "Build time: collected names.",
            "Data in the JavaScript module → inline SVG nodes.",
          ],
          [
            'mode: "symbol"',
            "Build time: collected names.",
            "One generated SVG per icon + registered URL → external use reference.",
          ],
          [
            'api: { type: "fetch" }',
            "Runtime: a name not resolved by compiled artwork or local sources.",
            "JavaScript requests JSON → data → inline SVG nodes.",
          ],
          [
            'api: { type: "symbol" }',
            "Runtime: a name not resolved by compiled artwork or local sources.",
            "Build a URL → external use reference; the browser loads the SVG.",
          ],
        ],
      },
      examples: [
        {
          filename: "vite.config.ts",
          codeMessages: ["// Keep your existing framework plugin here."],
          code: 'import { defineConfig } from "vite"\nimport { icones } from "@icones/vite"\n\nexport default defineConfig({\n  plugins: [\n    // Keep your existing framework plugin here.\n    icones({\n      mode: "sprite",\n      spriteGroupBy: "set",\n      dataDir: "./icons",\n      emitData: false,\n      fallbackToApi: false,\n    }),\n  ],\n})',
        },
        {
          filename: "icon-sets.ts",
          code: 'const sets = {\n  tabler: () => import("virtual:icones/set/tabler"),\n  lucide: () => import("virtual:icones/set/lucide"),\n}\n\nexport const loadIconSet = (selectedSet: keyof typeof sets) =>\n  sets[selectedSet]()',
        },
      ],
      note: 'Vite defaults to mode: "sprite" and spriteGroupBy: "all". It emits one <assetsDir>/sprite.svg while the generated SVG is at most 256 KiB, then automatically emits numbered chunks such as sprite-1.svg. Set spriteGroupBy: "set" to emit <assetsDir>/<set>/sprite.svg and apply the size limit independently within each set. Configure the raw-byte limit with spriteMaxBytes or set it to false to disable size chunking. Use mode: "symbol" for one SVG per icon or mode: "svg" for inline data; there is no mode: "data" or mode: "inline". A normal API options object defaults to type: "fetch". Omitting api uses the parent/application loader, whose root default is https://<set>.icones.go-slim.dev/data/<name>.json, so omission is not an offline setting. emitData only controls emitted JSON files, not the rendering path. fallbackToApi: false disables the plugin’s build-time fallback, not the runtime service; use IconConfig api: false for offline runtime behavior.',
    },
    {
      id: "api-types",
      title: "Combine mode and type: what actually renders?",
      paragraphs: [
        "Read each column separately. “Collected name” means its Vite-generated module has loaded; “runtime-only name” means it is absent from compiled artwork, the store cache and local sources. The table assumes no per-icon loader override.",
        "The examples are shared configuration objects, not code that starts requests by itself. Pass one to the configuration API of your chosen adapter. Choose your framework in the sidebar for the provider or initialization syntax; the loading rules here do not change.",
      ],
      table: {
        headings: [
          "Vite mode",
          "API type",
          "Collected name",
          "Runtime-only name",
        ],
        rows: [
          [
            "sprite",
            "fetch",
            "Symbol: reference the generated sprite.",
            "Data: after a JSON request.",
          ],
          [
            "sprite",
            "symbol",
            "Symbol: reference the generated sprite.",
            "Symbol: reference the API’s SVG URL.",
          ],
          [
            "svg",
            "fetch",
            "Data: from the bundle.",
            "Data: after a JSON request.",
          ],
          [
            "svg",
            "symbol",
            "Data: from the bundle.",
            "Symbol: reference the API’s SVG URL.",
          ],
          [
            "symbol",
            "fetch",
            "Symbol: reference a generated asset.",
            "Data: after a JSON request.",
          ],
          [
            "symbol",
            "symbol",
            "Symbol: reference a generated asset.",
            "Symbol: reference the API’s SVG URL.",
          ],
        ],
      },
      bullets: [
        "Direct data / altData and data resolved from sources always render inline, including when Vite or the runtime API uses symbols. A name alone does not tell you which path is used.",
        "With api: false, unresolved runtime names have no API fallback. Already compiled data/symbols and local data still work; a compiled Sprite or per-icon symbol still requires its SVG asset to be served.",
        'With baseUrl: "/icons", fetch requests /icons/tabler.json?icons=star and reads JSON. Symbol references /icons/tabler/star.svg#icon. These are different endpoints; changing type does not convert a JSON service into a symbol service.',
        "For symbol, no JavaScript JSON fetch does not mean no network request: the browser loads the external SVG. Serve it from the page’s origin with the matching symbol ID; configuring api does not create these files or a server.",
      ],
      examples: [
        {
          filename: "icon-api.js",
          code: 'export const fetchConfig = {\n  api: { type: "fetch", baseUrl: "/icons" },\n}\n\nexport const symbolConfig = {\n  api: { type: "symbol", baseUrl: "/icons" },\n}\n',
        },
      ],
      note: "Choose one configuration for your application, not both. A runtime symbol is marked referenced when its URL is ready, not when the browser successfully loads it. Missing external SVG files are not reported as the JSON loader’s missing/error state; check the browser Network panel. Data fetches, by contrast, can report loading, missing and error through the store.",
      links: [],
    },
    {
      id: "api-endpoints",
      title: "Connect and verify your endpoints",
      paragraphs: [
        "Setting an API URL does not create a server. The default fetch protocol expects a collection JSON endpoint; if your deployment serves one JSON file per icon instead, provide url. That response must contain supported icon data, such as the tuple array from Rendering methods.",
        "A custom symbol URL must include the fragment ID of a real symbol. Serve the SVG from the same origin as the page and make viewBox match that symbol. A JSON URL is not a substitute for an SVG URL.",
      ],
      examples: [
        {
          filename: "custom-fetch-api.js",
          code: 'export const config = {\n  api: {\n    type: "fetch",\n    url: (name) => `/icon-data/${encodeURIComponent(name)}.json`,\n  },\n}\n',
        },
        {
          filename: "custom-symbol-api.js",
          code: 'export const config = {\n  api: {\n    type: "symbol",\n    url: (name) => `/icon-symbols/${encodeURIComponent(name)}.svg#icon`,\n    viewBox: "0 0 24 24",\n  },\n}\n',
        },
      ],
      bullets: [
        "For fetch, inspect the requested JSON, HTTP status and response shape. Use transform only to unwrap your own response envelope; use fetch/requestInit for request options. Never embed server secrets in browser configuration.",
        "For symbol, inspect the SVG request and its symbol ID. There is no JavaScript JSON response to transform, and symbol configuration does not accept fetch/requestInit. A ready reference is not a confirmed download.",
        "Deploy the Vite-generated Sprite or per-icon symbol assets together with the app. Deploy runtime API endpoints separately when needed. Test a collected name, a runtime-only name and direct data so all configured paths are covered.",
      ],
      links: [
        {
          page: "rendering",
          label: "Review accepted data formats",
        },
        {
          page: "prop-support",
          label: "Check property behavior after loading",
        },
      ],
    },
  ],
}
