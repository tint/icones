import { paths } from "../../shared/routing/paths.ts"
import { guideHref } from "../guide/routing.ts"
import type { ContentSectionData } from "../../shared/content/types.ts"

export const homeWorkflow = {
  id: "from-search-to-interface",
  title: "From finding an icon to using it.",
  description:
    "Start with the artwork. Add an integration only when your application needs one.",
  items: [
    {
      title: "Find a consistent style",
      description:
        "Choose a collection, narrow it by category and compare its available variants. Keep related interface icons in the same family for a more consistent result.",
      link: { href: paths.icons, label: "Explore the catalog →" },
    },
    {
      title: "Preview the details",
      description:
        "Open an icon to adjust size, color, stroke width and rotation. Fixed-color artwork keeps its original colors; a filled variant is a separate drawing, not a paint setting.",
      link: {
        href: guideHref("color", "react"),
        label: "Understand color and styles →",
      },
    },
    {
      title: "Choose your output",
      description:
        "Download a standalone SVG for direct use, copy component code for your framework, or keep the original JSON in your app. Component examples need an icon data source.",
      link: {
        href: guideHref("getting-started", "react"),
        label: "Render your first icon →",
      },
    },
  ],
} satisfies ContentSectionData

export const homeResources = {
  id: "beyond-the-gallery",
  title: "The resources behind your icons.",
  description:
    "Keep implementation details, assistant context and source notices close to your project.",
  items: [
    {
      title: "Choose the packages you need",
      description:
        "Pick one framework adapter, then decide whether Vite extraction, local data or an HTTP service fits your application. You do not need to install every package.",
      link: { href: paths.packages, label: "Compare packages →" },
    },
    {
      title: "Give your assistant the right context",
      description:
        "Give your assistant the guide for your framework so its examples match your application. Use the index for browsing or attach the complete guide when links cannot be opened.",
      link: { href: paths.llms, label: "Get AI documentation →" },
    },
    {
      title: "Keep track of the source",
      description:
        "Review the original author, imported revision and license for each collection. Exporting an icon does not replace its original terms.",
      link: { href: paths.licenses, label: "Review collection licenses →" },
    },
  ],
} satisfies ContentSectionData
