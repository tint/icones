import type { GuideArticle } from "./content.ts"
import {
  vanillaIconAttribute,
  vanillaIconExample,
  type VanillaElementMode,
} from "../../shared/integrations/vanilla-example.ts"

import { vanillaGuideTracks } from "../../shared/integrations/frameworks.ts"
export { vanillaGuideTracks } from "../../shared/integrations/frameworks.ts"

export function getVanillaOverview(mode: VanillaElementMode): GuideArticle {
  const standard = mode === "standard"
  const track = vanillaGuideTracks.find((item) => item.id === mode)!
  const attr = (prop: string) => vanillaIconAttribute(prop, mode)
  return {
    title: track.name + " overview",
    description: standard
      ? "Use ordinary i elements with icon-* attributes. This tutorial follows the standard-element entry from your first icon through configuration."
      : "Use the dedicated icones-icon tag. This tutorial follows the web-element entry from your first icon through configuration.",
    sections: [
      {
        id: "render-an-icon",
        title: "1. Start with this HTML",
        paragraphs: [
          standard
            ? "Write an i element with icon-name and import @icones/vanilla/standard-element once. The initializer finds those hosts and appends an SVG without replacing the original i."
            : "Write an icones-icon element with name and import @icones/vanilla/web-element once. The browser upgrades the tag and appends an SVG when it is connected.",
          "Both the import and artwork are required. Complete Getting started to connect Vite and your local JSON before running this example. The SVG lives in light DOM, without Shadow DOM.",
        ],
        examples: [
          {
            filename: "index.html",
            code: vanillaIconExample(
              { name: "tabler:star", size: 24 },
              true,
              mode
            ),
          },
        ],
        links: [
          {
            page: "getting-started",
            label: "Follow this path: install and display your first icon",
          },
        ],
      },
      {
        id: "shared-api",
        title: "2. Change attributes",
        paragraphs: [
          "Add only the attributes you need. Empty or true enables a boolean option; false disables it. Removing an attribute restores the configured default.",
          standard
            ? "Only i[icon-name] opts into rendering. Other tags, a bare icon attribute, and data-icon* aliases are not scanned. Native class, style and aria-* remain on the i; icon-class, icon-label and icon-role target its SVG."
            : "Only the dedicated tag opts into rendering. Native class, style and aria-* remain on the host; svg-class, label and svg-role target its SVG. Use decorative, not the native hidden attribute, for decorative icons.",
        ],
        table: {
          headings: ["HTML attribute", "Purpose"],
          rows: [
            [attr("name"), "Exact icon name, e.g. tabler:star"],
            [attr("size"), "A named size preset, pixel value or CSS length"],
            [attr("color"), "CSS color used by currentColor in the SVG"],
            [
              attr("strokeWidth"),
              "Outline weight; original preserves the source",
            ],
            [attr("rotate"), "Quarter turns: 1 = 90°"],
            [
              attr("altName"),
              "The exact name of an alternative icon; no suffix is inferred",
            ],
            [
              attr("showAlt"),
              "true selects altName; false keeps the primary icon",
            ],
            [attr("aria-label"), "Accessible label on the SVG"],
          ],
        },
        examples: [
          {
            filename: "index.html",
            code: vanillaIconExample(
              { name: "tabler:star", size: 32, color: "#7712f7" },
              true,
              mode
            ),
          },
        ],
        links: [
          { page: "rendering", label: "Compare prop support and Vite modes" },
        ],
      },
      {
        id: "runtime",
        title: "3. Let the element update",
        paragraphs: [
          standard
            ? 'Change an attribute with setAttribute("icon-size", "32"). A MutationObserver synchronizes the SVG; adding or removing matching i elements starts or stops rendering automatically.'
            : 'Change an attribute with setAttribute("size", "32"). The Web Component lifecycle synchronizes the SVG immediately; connecting or removing a tag starts or stops rendering automatically.',
          standard
            ? "For a custom root or shared defaults, replace the automatic import with bindIcons({ root, scope }). Its handle provides refresh(), load() and destroy(). Repeated initialization of one root and attrPrefix returns the existing handle; it does not replace its scope."
            : "For shared defaults, replace the automatic import with defineIconElement({ scope }). Register once per window; repeated registration does not change its defaults. A specific icon can use its own scope object through element.scope.",
        ],
        links: [
          { page: "icon-config", label: "Configure this element’s defaults" },
        ],
      },
      {
        id: "deferred-rendering",
        title: "4. Defer the first render",
        paragraphs: [
          "Add " +
            attr("defer") +
            '="intersect" to render when the host enters the viewport, or ' +
            attr("defer") +
            '="domready" to wait for DOMContentLoaded. If the document is already interactive or complete, domready renders immediately.',
          "No SVG or runtime data request starts before activation. After the first render, updates proceed normally. Removing a pending host cancels its wait; load() does not force activation.",
        ],
        examples: [
          {
            filename: "index.html",
            code:
              vanillaIconExample(
                { name: "tabler:star", size: 24, defer: "intersect" },
                false,
                mode
              ) +
              "\n\n" +
              vanillaIconExample(
                { name: "tabler:heart", size: 24, defer: "domready" },
                true,
                mode
              ),
          },
        ],
        note: "Without IntersectionObserver, intersect renders immediately. Reserve space with CSS if needed. Static Vite data is still bundled; deferred rendering is not code splitting.",
      },
      ...(standard
        ? [
            {
              id: "custom-attribute-prefix",
              title: "5. Customize the attribute prefix",
              paragraphs: [
                "If icon-* does not fit your app, replace the automatic standard-element import with explicit initialization. attrPrefix includes the trailing hyphen and changes every icon attribute, not just its name.",
                "Keep the same prefix in Vite’s attrPrefixes list so build-time collection can find your HTML names. That list replaces the default; use [icon-, ui-] only if you intentionally use both. Initializers are keyed by root and attrPrefix. Use one active name prefix per host.",
              ],
              examples: [
                {
                  filename: "index.html",
                  code: '<i ui-name="tabler:star" ui-size="24" ui-defer="intersect"></i>\n\n<script type="module">\n  import { bindIcons } from "@icones/vanilla"\n\n  bindIcons({ attrPrefix: "ui-" })\n</script>',
                },
                {
                  filename: "vite.config.ts",
                  code: 'import { defineConfig } from "vite"\nimport { icones } from "@icones/vite"\n\nexport default defineConfig({\n  plugins: [icones({\n    dataDir: "./icons",\n    attrPrefixes: ["ui-"],\n  })],\n})',
                },
              ],
              note: "Prefixes start with a lowercase letter, use lowercase letters/digits and hyphens, and end with a hyphen. There is no implicit fallback to icon-* or data-*.",
            },
          ]
        : []),
    ],
  }
}

export function getVanillaTypeScript(mode: VanillaElementMode): GuideArticle {
  const standard = mode === "standard"
  return {
    title: "TypeScript",
    description:
      "Type-check the initialization and updates for your selected HTML element.",
    sections: [
      {
        id: "typed-props",
        title: "Type the initialization options",
        paragraphs: [
          standard
            ? "Use IconBindingOptions for the initializer, not IconProps on the HTML host. HTML icon-* attributes remain strings."
            : "Use DefineIconElementOptions for registration. The package also types the icones-icon tag in HTMLElementTagNameMap, so querySelector can return an IconElement.",
        ],
        examples: [
          {
            filename: "main.ts",
            code: standard
              ? 'import { bindIcons, type IconBindingOptions } from "@icones/vanilla"\n\nconst options = {\n  root: document,\n  attrPrefix: "icon-",\n} satisfies IconBindingOptions\n\nconst icons = bindIcons(options)'
              : 'import { defineIconElement, type DefineIconElementOptions } from "@icones/vanilla"\n\nconst options = {} satisfies DefineIconElementOptions\n\ndefineIconElement(options)',
          },
        ],
      },
      {
        id: "typed-updates",
        title: "Update the HTML attribute",
        paragraphs: [
          "IconName is provided by the lightweight @icones/names package and re-exported by the adapter. Validate a name with satisfies IconName before assigning it to an HTML attribute; native setAttribute and literal HTML attributes are still strings, not compile-time name checks.",
          standard
            ? "Keep native DOM types on i. The initializer’s handle waits for mounted icons; it does not force deferred hosts to activate."
            : "Query the dedicated tag to get its typed load() method. A scope is a JavaScript object property; do not serialize it into an HTML attribute.",
        ],
        examples: [
          {
            filename: "main.ts",
            code: standard
              ? 'import { bindIcons, type IconName } from "@icones/vanilla"\n\nconst name = "tabler:star" satisfies IconName\nconst icons = bindIcons()\nconst icon = document.querySelector("i[icon-name]")\nicon?.setAttribute("icon-name", name)\nicon?.setAttribute("icon-size", "32")\nawait icons?.load()'
              : 'import "@icones/vanilla/web-element"\nimport type { IconName } from "@icones/vanilla"\n\nconst name = "tabler:star" satisfies IconName\nconst icon = document.querySelector("icones-icon")\nicon?.setAttribute("name", name)\nicon?.setAttribute("size", "32")\nawait icon?.load()',
          },
        ],
      },
      {
        id: "local-json",
        title: "Validate local JSON",
        paragraphs: [
          "Use parseElementData to validate imported tuple JSON before adding it to a scope’s sources. HTML hosts do not have a JSON data attribute. The configuration chapter shows how to connect sources to this element.",
        ],
        examples: [
          {
            filename: "star-data.ts",
            code: 'import { parseElementData } from "@icones/vanilla"\nimport starJSON from "./icons/tabler/data/star.json"\n\nexport const star = parseElementData(starJSON)',
          },
        ],
        links: [
          {
            page: "icon-config",
            label: "Register local data for this element",
          },
        ],
      },
    ],
  }
}
