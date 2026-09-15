export const paths = {
  home: "/",
  icons: "/icons",
  guide: "/guide",
  licenses: "/licenses",
  packages: "/solutions/packages",
  llms: "/solutions/llms",
  mcp: "/solutions/mcp",
} as const

export const solutionLinks = [
  { to: paths.packages, label: "All Packages" },
  { to: paths.llms, label: "LLMs" },
  { to: paths.mcp, label: "MCP Server" },
] as const

export const pageMetadata: Record<
  string,
  { title: string; description: string }
> = {
  [paths.home]: {
    title: "Beautiful SVG icons",
    description:
      "Independent icon collections for your next project. Discover Icones and choose your integration.",
  },
  [paths.icons]: {
    title: "Icons",
    description: "Browse, search and export independent icon collections.",
  },
  [paths.guide]: {
    title: "Developer guide",
    description:
      "Install Icones, configure Vite and render icons with local data or an API.",
  },
  [paths.licenses]: {
    title: "Licenses",
    description:
      "Original licenses and provenance for every bundled icon collection.",
  },
  [paths.packages]: {
    title: "All Packages",
    description:
      "Compare six framework adapters, the Vite plugin and the MCP server. Choose the packages and loading setup your application needs.",
  },
  [paths.llms]: {
    title: "LLMs",
    description:
      "Plain-text Icones documentation for AI assistants and development tools.",
  },
  [paths.mcp]: {
    title: "MCP Server",
    description:
      "Connect @icones/mcp-server over stdio to search local icons, retrieve artwork and read original licenses.",
  },
}
