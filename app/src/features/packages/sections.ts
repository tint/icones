import { guideHref } from "../guide/routing.ts"
import type { ContentSectionData } from "../../shared/content/types.ts"

export const packageRoles = {
  id: "package-roles",
  title: "Three parts, different responsibilities.",
  description:
    "Rendering, artwork and build integration are separate choices. Start with the smallest setup that covers your use case.",
  items: [
    {
      title: "The adapter renders",
      description:
        "Choose React, Vue, Svelte, SolidJS, Astro or Vanilla to match your app. Adapters expose familiar props and share the same icon names; they do not bundle every drawing.",
      link: {
        href: guideHref("overview", "react"),
        label: "Explore the component API →",
      },
    },
    {
      title: "The collection supplies artwork",
      description:
        "@icones/icons contains per-icon data, SVG symbols, manifests, licenses and generated name types. A type import checks a name; it does not load the corresponding artwork.",
      link: {
        href: guideHref("typescript", "react"),
        label: "Understand names and data →",
      },
    },
    {
      title: "Vite collects known names",
      description:
        "@icones/vite handles literal names at build time. For names chosen at runtime, register local sources or configure a loader through your adapter.",
      link: {
        href: guideHref("icon-config", "react"),
        label: "Choose a loading setup →",
      },
    },
  ],
} satisfies ContentSectionData
