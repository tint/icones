import type { GuideArticle } from "../content.ts"

export const article: GuideArticle = {
  title: "Collection differences",
  description:
    "Choose artwork that responds to your intended color, stroke and size adjustments.",
  sections: [
    {
      id: "artwork",
      title: "Check the drawing, not just the collection name",
      paragraphs: [
        "IconProps has the same meaning across collections, but not every drawing can respond to every prop. size changes the SVG box; color only reaches currentColor; strokeWidth only changes actual SVG strokes. A hollow-looking shape may be a filled path with a hole, not a stroke.",
        "The following describes the collections currently available in this catalog. Individual icons and separately imported versions can differ. In the icon detail dialog, inspect the original JSON or exported SVG when an adjustment has no visible effect.",
      ],
      table: {
        headings: ["Collection", "Color behavior", "Stroke-width behavior"],
        rows: [
          [
            "Tabler",
            "Outline drawings use currentColor strokes; filled variants use currentColor fills.",
            "Changes outline strokes, e.g. tabler:star; does not reshape tabler:star-filled.",
          ],
          [
            "Lucide",
            "Primarily currentColor strokes.",
            "Changes strokes, e.g. lucide:star.",
          ],
          [
            "Huge",
            "Mostly currentColor outlines, with some filled details.",
            "Changes stroke-based parts; filled details keep their shape. Check each drawing.",
          ],
          [
            "Phosphor",
            "This catalog offers Regular and Fill. Regular uses currentColor strokes; Fill uses currentColor filled shapes.",
            "Changes Regular strokes, e.g. phosphor:star; does not reshape phosphor:star-fill.",
          ],
          [
            "Bootstrap",
            "Both outline and fill variants commonly use currentColor filled paths.",
            "Does not change the apparent line weight of bootstrap:star; its outline is a filled path.",
          ],
          [
            "Ant Design",
            "This catalog offers Outlined and Filled, both using currentColor filled paths. TwoTone is not included.",
            "Does not change the apparent line weight of antd:star; choose antd:star-filled for a solid silhouette.",
          ],
          [
            "Brand",
            "This catalog includes monochrome outline marks, such as brand:react; do not assume all brand artwork has fixed colors.",
            "Changes actual strokes in these outline marks. Other imported logos may be filled or multicolor.",
          ],
          [
            "Flag",
            "Fixed colors preserve the flag’s design; color is not a palette replacement.",
            "Not a general weight control for flags. Drawings containing fixed-color strokes skip automatic stroke-width rewriting.",
          ],
        ],
      },
      links: [],
    },
    {
      id: "drawing-types",
      title: "A hollow shape is not necessarily a stroke",
      paragraphs: [
        "These two squares look similar, but their geometry is different. The first is a stroked rectangle; the second is a filled path with a hole. strokeWidth changes the first one, not the second. This distinction survives both data and symbol rendering.",
      ],
      examples: [
        {
          filename: "stroke.svg",
          code: '<svg viewBox="0 0 24 24" width="48" height="48">\n  <rect x="3" y="3" width="18" height="18"\n    fill="none" stroke="currentColor" stroke-width="2" />\n</svg>',
        },
        {
          filename: "filled-path.svg",
          code: '<svg viewBox="0 0 24 24" width="48" height="48">\n  <path fill="currentColor" fill-rule="evenodd"\n    d="M2 2h20v20H2z M4 4v16h16V4z" />\n</svg>',
        },
      ],
      checkpoint:
        "Change the standalone SVG’s stroke-width from 2 to 4: only the stroked square gets heavier. In an Icones adapter, use strokeWidth for the same kind of adjustment. Choose a separately designed filled variant when you want a different silhouette.",
    },
    {
      id: "colors-and-viewports",
      title: "Preserve colors and source proportions",
      paragraphs: [
        "color changes currentColor paint, not a fixed palette. A brand mark or flag with explicit colors keeps them. size changes the display box, not the geometry: equal pixel sizes across collections can still look different in weight and occupied area.",
        "Keep the original viewport when importing data. Named Flag variants use their own coordinates; a 4:3 flag remains a 4:3 drawing inside a square display box. Select the square or circle variant when that is the artwork you need.",
      ],
      examples: [
        {
          filename: "fixed-and-inherited.svg",
          code: '<svg viewBox="0 0 48 24" width="96" height="48" color="#7c3aed">\n  <circle cx="12" cy="12" r="8" fill="currentColor" />\n  <circle cx="36" cy="12" r="8" fill="#ef4444" />\n</svg>',
        },
      ],
      checkpoint:
        "Changing color recolors the left circle; the right one stays red. The same rule applies to inline data and compatible external symbols. Inspect the original SVG or JSON before assuming a prop is broken.",
    },
  ],
}
