import {
  isDevelopmentBuild,
  packageInstall,
  packageInstallFilename,
  type InstallExample,
} from "../../shared/integrations/package-install.ts"
import { getIconConfigArticle } from "./icon-config.ts"
import { getRenderingArticle } from "./rendering.ts"
import {
  vanillaIconAttribute,
  vanillaIconExample,
  type VanillaElementMode,
} from "../../shared/integrations/vanilla-example.ts"
import {
  getVanillaOverview,
  getVanillaTypeScript,
  vanillaGuideTracks,
} from "./vanilla.ts"

import {
  guideFrameworks,
  type GuideFramework,
} from "../../shared/integrations/frameworks.ts"
export {
  guideFrameworks,
  type GuideFramework,
} from "../../shared/integrations/frameworks.ts"

import { isSharedGuidePage, type GuidePageId } from "./routing.ts"
import type { CodeExample } from "../../shared/code/code-example.ts"
export {
  guideGroups,
  guidePages,
  guideHref,
  readGuideLocation,
  readGuidePath,
  type GuidePageId,
} from "./routing.ts"
export type GuideExample = CodeExample & {
  filename: string
  install?: InstallExample
}
export type GuideSection = {
  id: string
  title: string
  paragraphs: string[]
  examples?: GuideExample[]
  bullets?: string[]
  note?: string
  /** A concrete result the reader can verify after this step. */
  checkpoint?: string
  /** Keep reference material out of the main learning path. */
  optional?: boolean
  links?: {
    page: GuidePageId
    label: string
    framework?: GuideFramework
    element?: VanillaElementMode
  }[]
  preview?: "color" | "color-styles" | "sizing" | "stroke-width" | "fill"
  table?: { headings: string[]; rows: string[][] }
}
export type GuideArticle = {
  title: string
  description: string
  tutorial?: {
    before: string
    prerequisite?: { page: GuidePageId; label: string }
    outcome: string
  }
  sections: GuideSection[]
}

/** Small, framework-native snippets: no providers or configuration wrappers. */
export function guideIconExample(
  framework: GuideFramework,
  props: Record<string, string | number | boolean> = {
    name: "tabler:star",
    size: 24,
  },
  element: VanillaElementMode = "web"
): GuideExample {
  const adapter = guideFrameworks.find((item) => item.id === framework)!
  const packageName = "@icones/" + framework
  const entries = Object.entries(props)
  if (framework === "vanilla") {
    return {
      filename: adapter.filename,
      code: vanillaIconExample(props, true, element),
    }
  }
  const attributes = entries.map(([key, value]) => {
    const name = framework === "react" && key === "class" ? "className" : key
    if (typeof value === "string") return name + "=" + JSON.stringify(value)
    return framework === "vue"
      ? ":" +
          name.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()) +
          '="' +
          value +
          '"'
      : name + "={" + value + "}"
  })
  const icon = "<Icon\n  " + attributes.join("\n  ") + "\n/>"
  const imports = 'import { Icon } from "' + packageName + '"'
  const code =
    framework === "vue"
      ? '<script setup lang="ts">\n' +
        imports +
        "\n</script>\n\n<template>\n" +
        icon
          .split("\n")
          .map((line) => "  " + line)
          .join("\n") +
        "\n</template>"
      : framework === "svelte"
        ? '<script lang="ts">\n  ' + imports + "\n</script>\n\n" + icon
        : framework === "astro"
          ? "---\n" + imports + "\n---\n\n" + icon
          : imports +
            "\n\nexport const IconExample = () => (\n" +
            icon
              .split("\n")
              .map((line) => "  " + line)
              .join("\n") +
            "\n)"
  return { filename: adapter.filename, code }
}

function inlineAlternativeExample(framework: GuideFramework): GuideExample {
  const data =
    'const primary = { body: \'<circle cx="12" cy="12" r="8"/>\' }\n' +
    'const alternative = { body: \'<path d="M5 12l4 4 10-10" fill="none" stroke="currentColor"/>\' }'
  if (framework === "vanilla")
    return {
      filename: "main.ts",
      codeMessages: ["// Call icon.destroy() when the owner is removed."],
      code:
        'import { createIcon } from "@icones/vanilla"\n\n' +
        data +
        "\n\nconst icon = createIcon({ data: primary, altData: alternative })\ndocument.body.append(icon.element)\n\nicon.update({ data: primary, altData: alternative, showAlt: true })\n// Call icon.destroy() when the owner is removed.",
    }
  const imports = 'import { Icon } from "@icones/' + framework + '"\n\n' + data
  const icon =
    framework === "vue"
      ? '<Icon :data="primary" :alt-data="alternative" :show-alt="true" />'
      : "<Icon data={primary} altData={alternative} showAlt={true} />"
  return {
    filename: guideFrameworks.find((item) => item.id === framework)!.filename,
    code:
      framework === "vue"
        ? '<script setup lang="ts">\n' +
          imports +
          "\n</script>\n\n<template>\n  " +
          icon +
          "\n</template>"
        : framework === "svelte"
          ? '<script lang="ts">\n' + imports + "\n</script>\n\n" + icon
          : framework === "astro"
            ? "---\n" + imports + "\n---\n\n" + icon
            : imports +
              "\n\nexport const IconExample = () => (\n  " +
              icon +
              "\n)",
  }
}

export function getGuideArticle(
  page: GuidePageId,
  framework: GuideFramework = "react",
  development = isDevelopmentBuild,
  element: VanillaElementMode = "web"
): GuideArticle {
  if (isSharedGuidePage(page)) return getRenderingArticle(page)
  const adapter = guideFrameworks.find((item) => item.id === framework)!
  const example = (props: Record<string, string | number | boolean>) =>
    guideIconExample(framework, props, element)
  const standard = element === "standard"
  const track = vanillaGuideTracks.find((item) => item.id === element)!
  const attr = (name: string) =>
    framework === "vanilla" ? vanillaIconAttribute(name, element) : name
  const install: GuideExample = {
    install: {
      dependencies: [
        { name: "@icones/" + framework },
        { name: "@icones/vite", dev: true },
      ],
      development,
    },
    filename: packageInstallFilename(development),
    code:
      packageInstall("@icones/" + framework, development) +
      "\n" +
      packageInstall("@icones/vite", development, true),
  }
  const build: GuideExample = {
    filename: framework === "astro" ? "astro.config.mjs" : "vite.config.ts",
    codeMessages:
      framework === "astro"
        ? []
        : ["// Keep your existing framework plugin here."],
    code:
      framework === "astro"
        ? 'import { defineConfig } from "astro/config"\nimport { icones } from "@icones/vite"\n\nexport default defineConfig({\n  vite: {\n    plugins: [icones({\n      mode: "symbol",\n      dataDir: "./icons",\n      emitData: false,\n    })],\n  },\n})'
        : 'import { defineConfig } from "vite"\nimport { icones } from "@icones/vite"\n\nexport default defineConfig({\n  plugins: [\n    // Keep your existing framework plugin here.\n    icones({\n      mode: "symbol",\n      dataDir: "./icons",\n      emitData: false,\n    }),\n  ],\n})',
  }
  switch (page) {
    case "icon-config":
      return getIconConfigArticle(framework, element)
    case "overview":
      if (framework === "vanilla") return getVanillaOverview(element)
      return {
        title: adapter.name + " overview",
        description:
          "The same icon vocabulary, with an API that belongs in your " +
          adapter.name +
          " application.",
        sections: [
          {
            id: "render-an-icon",
            title: "Start with one icon",
            paragraphs: [
              "Use the exact set:name identifier from the catalog. The name selects the artwork; the remaining props control its presentation.",
            ],
            examples: [
              example({ name: "tabler:star", size: 24, color: "#7712f7" }),
            ],
            links: [
              {
                page: "getting-started",
                label: "Follow the first-icon tutorial",
              },
            ],
          },
          {
            id: "shared-api",
            title: "A shared set of props",
            paragraphs: [
              "Start with a name or inline data, then add only the props you need. Omitted values inherit the application’s defaults.",
            ],
            table: {
              headings: ["Prop", "Purpose"],
              rows: [
                ["name", "The exact set:name identifier of the primary icon"],
                ["data", "Inline primary icon data; takes priority over name"],
                [
                  "altName",
                  "The exact name of an alternative icon; no suffix is inferred",
                ],
                [
                  "altData",
                  "Inline alternative icon data; takes priority over altName",
                ],
                [
                  "showAlt",
                  "true selects the alternative group; false keeps the primary group",
                ],
                ["size", "A named size preset, pixel value or CSS length"],
                ["color", "CSS color used by currentColor in the SVG"],
                ["strokeWidth", "Outline weight on a 24-unit basis"],
                ["rotate", "Rotation in quarter turns: 1 = 90°"],
              ],
            },
            note: "Choose one source per group: name or data for the primary icon, altName or altData for the alternative. Providing both in either group logs console.error; data or altData still takes priority, even if that group is not currently shown.",
            links: [
              {
                page: "rendering",
                label: "Compare prop support and Vite modes",
              },
            ],
          },
          {
            id: "runtime",
            title: "Rendering and loading",
            paragraphs: [
              framework === "astro"
                ? "Astro renders on the server and waits for asynchronous icon data. Use local data or static extraction for offline output. Remote fetches need an absolute URL; the icon itself does not need a client:* directive."
                : "The component follows prop changes in your framework. For server rendering, use local data, static collection, symbol references or preloaded data. Keep the initial icon state consistent during hydration.",
            ],
          },
        ],
      }
    case "getting-started":
      return {
        title: "Getting started",
        description:
          "Display one " +
          (framework === "vanilla" ? track.name : adapter.name) +
          " icon, check that it works, then change its appearance. No shared configuration is needed yet.",
        tutorial: {
          before:
            framework === "astro"
              ? "Start with an existing Astro application. Run the commands from its root directory."
              : "Start with an existing " +
                adapter.name +
                " application using Vite. Run the commands from its root directory; this tutorial does not scaffold a new app.",
          outcome:
            "A visible star icon that you can resize and recolor with a single prop.",
        },
        sections: [
          {
            id: "add-the-adapter",
            title: "1. Install the packages",
            paragraphs: [
              "The adapter renders SVGs. The Vite plugin finds literal icon names in your code and includes their artwork in your build.",
              "Run these commands inside your application.",
            ],
            examples: [install],
            checkpoint:
              "Your app has both @icones/" +
              framework +
              " and @icones/vite in its dependencies.",
          },
          {
            id: "connect-icon-data",
            title: "2. Connect the artwork",
            paragraphs: [
              "Add icones to your existing plugin list; keep your framework’s other plugins. Set dataDir to the directory containing your icon JSON files. This example assumes icons is inside the application root.",
              "On the Icons page, find tabler:star, open its JSON tab and save the original JSON as icons/tabler/data/star.json in your application. Keep the collection’s license from the Licenses page with any artwork you use.",
              framework === "astro"
                ? "In Astro, update vite.plugins in astro.config.mjs. Do not create a separate Vite config."
                : "Update vite.config.ts, then restart your Vite development server so it reads the new plugin configuration.",
            ],
            examples: [
              build,
              {
                filename: "project-layout.txt",
                code:
                  "your-app/\n  icons/tabler/data/star.json\n  " +
                  (framework === "astro"
                    ? "astro.config.mjs"
                    : "vite.config.ts"),
              },
            ],
            checkpoint:
              "The file icons/tabler/data/star.json exists in your application. dataDir points to ./icons, the folder containing tabler/, not to the JSON file itself.",
            note: "Use the original tuple JSON from the JSON tab, not SVG markup. Save other icons with the same <set>/data/<name>.json layout. Set fallbackToApi: false to prevent build-time requests for missing icons.",
            links: [
              {
                page: "loading",
                label: "Vite and API loading",
              },
            ],
          },
          {
            id: "use-the-icon",
            title: "3. Display your first icon",
            paragraphs: [
              framework === "vanilla"
                ? standard
                  ? "Add this to index.html. Write an ordinary i with icon-name and import @icones/vanilla/standard-element once. The initializer scans matching hosts and appends an SVG directly inside each i. Keep the icon in HTML."
                  : "Add this to index.html. Write the dedicated icones-icon tag and import @icones/vanilla/web-element once. The browser upgrades the tag and appends an SVG directly inside it, without Shadow DOM. Keep the icon in HTML."
                : "Put this example in your " +
                  adapter.filename +
                  " component and render that component in your page. The literal name tabler:star matches the artwork from step 2.",
              "Run your app with its normal development command and open the page. Verify the star is visible before continuing.",
            ],
            examples: [example({ name: "tabler:star", size: 24 })],
            checkpoint:
              "You see one 24px star. In the DOM it contains an SVG; no IconConfig or runtime API setup is required.",
          },
          {
            id: "customize-the-icon",
            title: "4. Change one thing at a time",
            paragraphs: [
              "In the previous example, change " +
                attr("size") +
                " from 24 to 32. Once the star grows, add " +
                attr("color") +
                " to make it purple. Keep the name and loading setup unchanged.",
              "This complete replacement example combines those two changes. Remove " +
                attr("color") +
                " to follow the surrounding text color again.",
            ],
            examples: [
              example({ name: "tabler:star", size: 32, color: "#7712f7" }),
            ],
            checkpoint:
              "The same star is now 32px and purple. You changed its presentation, not its source JSON.",
            links: [
              { page: "color", label: "Next: color, sizing and stroke" },
              ...(framework === "vanilla"
                ? [
                    {
                      page: "overview" as const,
                      label:
                        "Then: " +
                        track.name +
                        " attributes and deferred rendering",
                    },
                  ]
                : []),
              {
                page: "icon-config",
                label: "Later: share defaults with IconConfig",
              },
            ],
          },
          {
            id: "troubleshooting",
            title: "If the icon does not appear",
            optional: true,
            paragraphs: [
              "Check these in order before adding configuration. Shared defaults cannot fix a missing import, an incorrect path or missing artwork.",
            ],
            bullets: [
              "Check the terminal for a missing-package or missing-icon error.",
              "Confirm the icon’s name is exactly tabler:star, and dataDir contains tabler/data/star.json.",
              "Restart the development server after changing its configuration.",
              framework === "vanilla"
                ? "Use a Vite-served page, not a file:// URL. Confirm the module script imports @icones/vanilla/" +
                  track.entry +
                  " and the host uses " +
                  (standard ? "i with icon-name." : "icones-icon with name.")
                : "Confirm your page actually renders the component containing Icon.",
              "Check that CSS is not hiding the SVG or giving it the same color as the background.",
              "Use a literal name for this lesson. Computed names need local data or a runtime loading setup; learn that after the first icon works.",
            ],
          },
        ],
      }
    case "color":
      return {
        title: "Color",
        description:
          "Let icons follow your text, or give a single icon its own color.",
        sections: [
          {
            id: "inherit-color",
            title: "Inherit text color",
            paragraphs: [
              "Monochrome icons use currentColor. When " +
                attr("color") +
                " is omitted, the drawing follows the surrounding text color, so it fits naturally inside links, buttons and status messages.",
            ],
            preview: "color",
            examples: [example({ name: "tabler:star", size: 24 })],
          },
          {
            id: "explicit-color",
            title: "Set an explicit color",
            paragraphs: [
              "The " +
                attr("color") +
                " option accepts a CSS color. Use a hex value, a named color, or a design token such as var(--accent-color).",
            ],
            examples: [
              example({ name: "tabler:star", color: "#7712f7", size: 24 }),
            ],
          },
          {
            id: "color-by-style",
            title: "Color in Outline, Filled and Solid icons",
            paragraphs: [
              "The SVG color value does not replace every fill or stroke. It affects only paint values that use currentColor. The artwork decides whether that color appears on an outline or a filled area.",
              "Outline, Filled and Solid describe the artwork, not color modes. Select the exact icon name to change styles; setting color or fill does not turn an outline drawing into its designed filled counterpart.",
            ],
            preview: "color-styles",
            table: {
              headings: ["Style", "What changes with color"],
              rows: [
                [
                  "Outline",
                  'Usually colors strokes (stroke="currentColor") while fill="none" keeps the center empty. Example: tabler:star.',
                ],
                [
                  "Filled",
                  'Usually colors the solid shape through fill="currentColor". Example: tabler:star-filled. It does not add a separate outline.',
                ],
                [
                  "Solid",
                  "The same color behavior as Filled, with the collection’s own naming. Example: bootstrap:star-fill.",
                ],
              ],
            },
            note: "Judge by the SVG paint values, not just the style label. For example, bootstrap:star draws a hollow outline with a filled path, while the bundled phosphor:star uses a currentColor stroke.",
            links: [
              {
                page: "collections",
                label: "Collection differences",
              },
            ],
          },
          {
            id: "multicolor",
            title: "Respect multicolor artwork",
            paragraphs: [
              "A drawing with fixed fill or stroke colors keeps those colors. currentColor only affects paths designed to inherit it; it does not recolor every path in a flag or brand mark.",
            ],
          },
        ],
      }
    case "sizing":
      return {
        title: "Sizing",
        description:
          "Use a shared size preset, a pixel value, or a CSS length.",
        sections: [
          {
            id: "size-presets",
            title: "Named presets",
            paragraphs: [
              "The built-in presets cover common interface sizes. Your application can override its defaults.",
            ],
            preview: "sizing",
            table: {
              headings: ["xs", "sm", "md", "lg", "xl"],
              rows: [["12px", "16px", "20px", "24px", "28px"]],
            },
            examples: [example({ name: "tabler:star", size: "lg" })],
          },
          {
            id: "custom-size",
            title: "Pixels and CSS lengths",
            paragraphs: [
              "A numeric " +
                attr("size") +
                " is measured in pixels. A CSS length, such as 1.5rem or 1em, lets the icon follow your type scale. It controls both dimensions.",
            ],
            examples: [example({ name: "tabler:star", size: "1.5rem" })],
          },
          {
            id: "canvas-and-output",
            title: "Canvas versus display size",
            paragraphs: [
              "The original viewBox describes the drawing’s coordinates, not its rendered pixel size. A 24 × 24 drawing can be displayed at 64px without rewriting the source data.",
              "To set separate " +
                attr("width") +
                " and " +
                attr("height") +
                " values, omit " +
                attr("size") +
                ". An explicit size takes priority over both.",
            ],
          },
        ],
      }
    case "stroke-width":
      return {
        title: "Stroke Width",
        description:
          "Adjust icons drawn with SVG strokes. Filled paths keep their original shape.",
        sections: [
          {
            id: "outline-weight",
            title: "Set the outline weight",
            paragraphs: [
              attr("strokeWidth") +
                " uses a normalized 24-unit basis. This makes the same value usable across collections with different source canvas dimensions.",
            ],
            preview: "stroke-width",
            examples: [
              example({ name: "tabler:star", size: 32, strokeWidth: 1.5 }),
            ],
          },
          {
            id: "absolute-stroke",
            title: "Keep a constant pixel weight",
            paragraphs: [
              "Set " +
                attr("absoluteStrokeWidth") +
                " with a numeric pixel size to keep the stroke’s rendered thickness steady as the icon gets larger.",
              "This calculation uses the resolved width and height, not a browser layout measurement. Numeric pixels and px strings work; relative CSS units or a later CSS size override do not guarantee a fixed pixel stroke.",
            ],
            examples: [
              example({
                name: "tabler:star",
                size: 48,
                strokeWidth: 2,
                absoluteStrokeWidth: true,
              }),
            ],
          },
          {
            id: "original-stroke",
            title: "Preserve the original drawing",
            paragraphs: [
              framework === "vanilla"
                ? "Use " +
                  attr("strokeWidth") +
                  '="original" to preserve the source width. Filled artwork does not gain an outline just because a stroke width is set.'
                : "Filled artwork does not gain an outline just because strokeWidth is set. The configured width takes priority over the source width.",
              "Multicolor artwork with fixed stroke colors is excluded from automatic path stroke rewriting.",
              "An Outline label does not guarantee editable strokes: bootstrap:star is a filled path. Phosphor Regular uses strokes that respond to strokeWidth, while Phosphor Fill uses filled shapes that keep their geometry.",
              'Omitting strokeWidth still uses the shared default of 1.5, in both svg and symbol modes. Component props accept a numeric width; there is no cross-framework strokeWidth="original" value. Set an explicit weight when you need a thinner or bolder drawing.',
            ],
            links: [
              {
                page: "prop-support",
                label: "Prop support",
              },
            ],
          },
        ],
      }
    case "fill":
      return {
        title: "Fill",
        description:
          "Choose artwork intentionally: outline and filled icons are independent drawings.",
        sections: [
          {
            id: "filled-artwork",
            title: "Choose the filled drawing",
            paragraphs: [
              "Use the exact filled icon name from the collection. For example, tabler:star and tabler:star-filled are two different icons.",
            ],
            preview: "fill",
            examples: [
              example({
                name: "tabler:star-filled",
                size: 24,
                color: "#7712f7",
              }),
            ],
          },
          {
            id: "svg-fill",
            title: "Understand SVG fill",
            paragraphs: [
              'The fill attribute is inherited by paths that do not set their own fill. It does not replace a path’s explicit fill="none", and it cannot turn an outline into a carefully designed filled variant.',
              "For custom tuple data, specify fill in the artwork. Inline rendering can supply a missing fill from the prop, but generated symbols bake missing root fills as none; the root SVG fill prop cannot override that explicit value.",
            ],
            note: "Do not guess a -filled name. Some collections use different names, or do not include a corresponding filled drawing.",
            links: [
              {
                page: "collections",
                label: "Collection differences",
              },
            ],
          },
          {
            id: "switch-artwork",
            title: "Switch between variants",
            paragraphs: [
              "Use " +
                attr("altName") +
                " and " +
                attr("showAlt") +
                " when an icon has two known states. The Alternative guide explains explicit variant selection.",
            ],
            examples: [
              example({
                name: "tabler:star",
                altName: "tabler:star-filled",
                showAlt: true,
                size: 24,
              }),
            ],
          },
        ],
      }
    case "typescript":
      if (framework === "vanilla") return getVanillaTypeScript(element)
      return {
        title: "TypeScript",
        description:
          "Keep icon props and local JSON data checked at the boundary.",
        sections: [
          {
            id: "typed-props",
            title: "Check your props",
            paragraphs: [
              "Each adapter exports IconProps. Use satisfies to check an object while retaining the specific values inferred by TypeScript.",
              'IconName is provided by the lightweight @icones/names package and re-exported by every adapter, without installing the icon artwork. Use satisfies IconName to validate an exact bundled name, including its style suffix. IconName<"tabler"> narrows suggestions to one set. Name and IconProps still accept dynamic strings and custom sources; they do not guarantee that a name exists in the local collection.',
            ],
            examples: [
              {
                filename: "icon-props.ts",
                code:
                  'import type { IconName, IconProps } from "@icones/' +
                  framework +
                  '"\n\nconst iconProps = {\n  name: "tabler:star" satisfies IconName,\n  size: 24,\n  color: "#7712f7",\n} satisfies IconProps',
              },
            ],
          },
          {
            id: "local-json",
            title: "Validate local JSON",
            paragraphs: [
              "JSON copied from the Icons page contains SVG node tuples. TypeScript infers JSON imports as ordinary arrays; parseElementData validates them and returns typed ElementData. Pass the result to the icon’s data prop.",
            ],
            examples: [
              {
                filename: "star-data.ts",
                code:
                  'import { parseElementData } from "@icones/' +
                  framework +
                  '"\nimport starJSON from "./icons/tabler/data/star.json"\n\nconst star = parseElementData(starJSON)',
              },
            ],
          },
          {
            id: "data-formats",
            title: "Know your data format",
            paragraphs: [
              "Use the format that matches your source: JSON from the Icons page contains [tag, attributes] tuples; an Iconify icon object contains width, height and body. Both are supported. Do not put a tuple array inside a body property or pass SVG markup to parseElementData.",
            ],
          },
        ],
      }
    case "accessibility":
      return {
        title: "Accessibility",
        description:
          "Decide whether the icon adds meaning or simply accompanies visible text.",
        sections: [
          {
            id: "decorative",
            title: "Decorative icons",
            paragraphs: [
              "Unlabelled icons are hidden from assistive technology by default. This is appropriate when adjacent text already explains the action, such as an icon next to the word Search.",
            ],
            examples: [example({ name: "tabler:search", size: 20 })],
          },
          {
            id: "meaningful",
            title: "Meaningful icons",
            paragraphs: [
              framework === "vanilla"
                ? "Use " +
                  attr("role") +
                  '="img" and ' +
                  attr("aria-label") +
                  " to label the generated SVG. Native role and aria-label remain on the host."
                : 'Give an icon that conveys information its own accessible label. role="img" identifies it as an image; aria-label provides the text alternative.',
            ],
            examples: [
              {
                ...example({
                  name: "tabler:check",
                  size: 20,
                  role: "img",
                  "aria-label": "Completed",
                }),
                codeMessages: ['"Completed"'],
              },
            ],
          },
          {
            id: "interactive",
            title: "Interactive controls",
            paragraphs: [
              "For an icon-only action, use a real button or link and label that control. Keep the icon decorative inside it. The SVG should not have to reproduce keyboard focus, activation and disabled behavior itself.",
              "Do not rely on color alone to communicate a state, and keep labels meaningful when switching to alternative artwork.",
            ],
          },
        ],
      }
    case "alternative":
      return {
        title: "Alternative",
        description:
          "Switch between primary and alternative artwork, using names or inline data.",
        sections: [
          {
            id: "define-alternative",
            title: "Define an alternative",
            paragraphs: [
              attr("altName") +
                " identifies the second icon. " +
                attr("showAlt") +
                " selects it; false or an omitted attribute keeps the primary name.",
            ],
            examples: [
              example({
                name: "tabler:star",
                altName: "tabler:star-filled",
                showAlt: true,
                size: 24,
              }),
            ],
          },
          {
            id: "inline-data",
            title: "Use inline data for either state",
            paragraphs: [
              "data and altData accept an individual Iconify data object or an element tuple array. You can use names for both states, data for both states, or a name in one group and data in the other.",
              "Do not pass a name string or an entire icon collection to data or altData. Register collections in sources, then select the primary and alternative icons with name and altName.",
              "Choose one source per group: name or data for the primary icon, altName or altData for the alternative. Providing both in either group logs console.error; data or altData still takes priority, even if that group is not currently shown.",
              "With showAlt enabled, altData takes priority over altName. Without an alternative source, the primary icon remains selected. A missing or failed alternative does not switch back to the primary icon.",
            ],
            examples: [inlineAlternativeExample(framework)],
            note:
              framework === "vanilla"
                ? "Object-valued data and altData belong to the JavaScript createIcon/mountIcon API, not HTML attributes. For standard elements and Web Components, register data in sources and use the name and alternative-name attributes."
                : "For a whole icon set, register it in sources and select icons by name or altName instead of passing the set alongside a name prop.",
          },
          {
            id: "state-changes",
            title: "Follow application state",
            paragraphs: [
              framework === "astro"
                ? "Set showAlt from your server-side state when rendering the page. For changes after page load, use a client framework component or the vanilla adapter."
                : framework === "vanilla"
                  ? "Keep " +
                    attr("name") +
                    " and " +
                    attr("altName") +
                    ' on the host, then use element.setAttribute("' +
                    attr("showAlt") +
                    '", "true") or "false". ' +
                    (standard
                      ? "The standard initializer observes the change."
                      : "The Web Component observes the change.")
                  : "Bind showAlt to your framework’s boolean state. When using names, keep them explicit so the Vite plugin can collect both drawings.",
            ],
          },
          {
            id: "not-a-fallback",
            title: "An alternative is not a fallback",
            paragraphs: [
              "Alternative selection is intentional, not an error recovery mechanism. If the active drawing cannot load, use fallback content or handle the loading state. The adapter does not invent a filled counterpart.",
            ],
          },
        ],
      }
    case "global-styling":
      return {
        title: "Global Styling",
        description:
          "Let icons share the colors and dimensions of your design system.",
        sections: [
          {
            id: "shared-class",
            title: "Use a shared class",
            paragraphs: [
              framework === "vanilla"
                ? "Use " +
                  attr("class") +
                  " to style the generated SVG directly; class and style remain on the " +
                  (standard ? "i" : "icones-icon") +
                  " host. Because there is no Shadow DOM, global CSS can also target " +
                  (standard ? "i[icon-name] > svg." : "icones-icon > svg.")
                : "Apply a class directly to the icon. The adapter forwards it to the root SVG, so your stylesheet works with both inline drawings and external symbols.",
            ],
            examples: [example({ name: "tabler:star", class: "product-icon" })],
          },
          {
            id: "design-tokens",
            title: "Connect design tokens",
            paragraphs: [
              "Use CSS to control the root SVG’s color and dimensions. Keep " +
                attr("strokeWidth") +
                " on the icon when you need a specific outline weight.",
            ],
            examples: [
              {
                filename: "app.css",
                code: ".product-icon {\n  color: var(--icon-color, currentColor);\n  inline-size: var(--icon-size, 1.25rem);\n  block-size: var(--icon-size, 1.25rem);\n  flex-shrink: 0;\n  vertical-align: -0.125em;\n}\n\n.toolbar {\n  --icon-color: #7712f7;\n  --icon-size: 1.5rem;\n}",
              },
            ],
          },
          {
            id: "style-boundaries",
            title: "Respect rendering boundaries",
            paragraphs: [
              "Prefer styling the root SVG. A selector aimed at an internal path cannot reach inside an external symbol document. Fixed colors and explicit fill values in the original artwork remain intentional.",
            ],
            links: [
              {
                page: "icon-config",
                label: "Share application defaults with IconConfig",
              },
            ],
          },
        ],
      }
  }
}
