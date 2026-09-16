import type { GuideArticle } from "../content.ts"

export const article: GuideArticle = {
  title: "Rendering methods",
  description:
    "Understand icon data, external symbols and source selection before choosing a framework integration.",
  sections: [
    {
      id: "rendering-paths",
      title: "Two rendering results: data or symbol",
      paragraphs: [
        "Both paths render an SVG element. The difference is what is inside it: data renders the actual paths in the page; symbol renders a use element that references an external SVG file. Symbol is not an image tag, and it does not mean all appearance props are disabled.",
        'Here, data means inline rendering, not only the data prop. It can come from data/altData, local sources, a fetch API, or Vite mode: "svg". A symbol reference can come from Vite mode: "sprite" or "symbol", or api.type: "symbol".',
        "These simplified output shapes show the distinction; the real renderer also supplies sizing, stroke configuration, accessibility and transforms.",
      ],
      examples: [
        {
          filename: "data.svg",
          code: '<svg viewBox="0 0 24 24" width="24" height="24">\n  <path d="M4 12h16" fill="none" stroke="currentColor" />\n</svg>',
        },
        {
          filename: "symbol.svg",
          code: '<svg viewBox="0 0 24 24" width="24" height="24">\n  <use href="/icons/tabler/star.svg#icon" width="24" height="24" />\n</svg>',
        },
      ],
      note: "To identify the path, inspect the rendered SVG: actual drawing nodes such as path/circle mean data; a use element with an external href means symbol. Do not infer it from the Vite setting alone.",
    },
    {
      id: "data-formats",
      title: "Supply a single icon’s data",
      paragraphs: [
        "Icones accepts an element tuple array or an icon object with an SVG body and viewport dimensions. These are data formats, not a third rendering mode. Both produce inline SVG nodes; a whole collection belongs in sources, not the data prop.",
        "This small arrow is self-contained. The first example is the tuple form; the second represents the same drawing as an icon object. Use one form at a time. For imported JSON, validate tuples with your adapter’s parseElementData export rather than wrapping the array in a body property.",
      ],
      examples: [
        {
          filename: "icon-data.js",
          code: 'export const arrowData = [\n  [\n    "path",\n    {\n      "d": "M20 12H4m6-6-6 6 6 6",\n      "fill": "none",\n      "stroke": "currentColor",\n      "strokeWidth": 2,\n      "strokeLinecap": "round",\n      "strokeLinejoin": "round"\n    }\n  ]\n]\n',
        },
        {
          filename: "icon-object.js",
          code: 'export const arrowData = {\n  width: 24,\n  height: 24,\n  body: \'<path d="M20 12H4m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\',\n}\n',
        },
      ],
      note: "Anonymous data uses shared/default appearance settings. Register data under a name such as custom:arrow in sources if it needs per-set defaults. Do not supply name and data together just to attach a set name.",
    },
    {
      id: "source-resolution",
      title: "Separate static collection from runtime loading",
      paragraphs: [
        "Within the selected group, data wins over name and altData wins over altName. Supplying both in either group logs console.error, including an inactive alternative group. showAlt selects the alternative group only when one is provided; otherwise the primary remains selected.",
        "Think about the selected source first, then its representation. A literal name in a supported Icon call can be collected at build time, including altName even when showAlt starts as false. Computed names are not automatically enumerated from application state.",
      ],
      bullets: [
        "Direct data or altData: render inline without a name lookup. Do not add a name just to associate anonymous data with a collection.",
        "A name already registered by a loaded Vite-generated module: use that compiled svg, Sprite or per-icon symbol representation. This also applies when a dynamic value happens to match the registered name.",
        "Other names: resolve through the icon’s store, local sources and configured API. A fetch API returns data to render inline; a symbol API supplies an external reference. These runtime API choices are separate from Vite mode.",
        "An explicit per-icon loader bypasses compiled-name resolution. Local sources can still resolve the name before that loader; supplying a loader does not stop Vite from collecting a literal name at build time.",
      ],
      note: "Changing IconConfig sources or api alone does not replace artwork already resolved from Vite’s compiled registry. Changing showAlt selects another source; a primary symbol and alternative inline data can coexist in one component.",
      links: [
        {
          page: "loading",
          label: "Local data and runtime APIs",
        },
      ],
      examples: [
        {
          filename: "icon-options.js",
          code: 'import { arrowData } from "./icon-data.js"\n\nexport const iconOptions = {\n  name: "tabler:arrow-right",\n  altData: arrowData,\n  showAlt: true,\n  size: 24,\n}\n',
        },
      ],
      checkpoint:
        "These are options to pass to your adapter, not a standalone renderer. With showAlt: true, the inline arrowData is selected even if the primary name was compiled as a symbol. Change showAlt to false to return to the named icon.",
    },
  ],
}
