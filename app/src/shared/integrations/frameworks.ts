/** Lightweight metadata shared by Guide navigation and documentation downloads. */
export const guideFrameworks = [
  { id: "react", name: "React", filename: "icon.tsx" },
  { id: "vue", name: "Vue", filename: "IconExample.vue" },
  { id: "svelte", name: "Svelte", filename: "IconExample.svelte" },
  { id: "solidjs", name: "SolidJS", filename: "icon.tsx" },
  { id: "astro", name: "Astro", filename: "IconExample.astro" },
  { id: "vanilla", name: "Vanilla", filename: "icon.html" },
] as const
export type GuideFramework = (typeof guideFrameworks)[number]["id"]

export const vanillaGuideTracks = [
  {
    id: "standard",
    name: "Standard elements",
    tag: "<i icon-name>",
    entry: "standard-element",
  },
  {
    id: "web",
    name: "Web Components",
    tag: "<icones-icon>",
    entry: "web-element",
  },
] as const
