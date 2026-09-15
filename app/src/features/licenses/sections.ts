import type { ContentSectionData } from "../../shared/content/types.ts"

export const licenseFiles = {
  id: "reading-source-notices",
  title: "Know what each source file tells you.",
  description:
    "Check the collection you actually use, including its import revision. A collection can combine artwork from more than one source.",
  items: [
    {
      title: "license.txt: the bundled notice",
      description:
        "Read the original terms shipped with the collection. Keep the applicable notices with copied artwork; the short license label on a card is not the full text.",
    },
    {
      title: "manifest.json: inventory and provenance",
      description:
        "Inspect the collection’s variants, categories and recorded sources. The imported revision identifies the snapshot bundled here, which may differ from the author’s latest release.",
    },
    {
      title: "Original collection: upstream context",
      description:
        "Follow the source link for the author’s documentation and updates. Brand marks may also have usage guidelines; the gallery does not grant additional rights to them.",
    },
  ],
} satisfies ContentSectionData
