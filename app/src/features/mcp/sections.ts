import { paths } from "../../shared/routing/paths.ts"
import type { ContentSectionData } from "../../shared/content/types.ts"

export const mcpAvailability = {
  id: "mcp-availability",
  title: "Choose how your assistant works with icons.",
  description:
    "Use MCP when your assistant needs to search and read icon data. Use a plain-text guide when it only needs API documentation.",
  items: [
    {
      title: "Read-only local collections",
      description:
        "Your assistant can search and read the included collections or a directory you provide. It cannot download or change your icon files. Reconnect after adding icons to a custom collection.",
    },
    {
      title: "Stdio, not an HTTP endpoint",
      description:
        "Your client launches the CLI as a local process. There is no MCP listener at /icons and no remote HTTP transport in this package. Logs go to stderr; stdout is reserved for protocol messages.",
    },
    {
      title: "For assistants: framework documentation",
      description:
        "Give your assistant a framework-specific llms.txt or llms-full.txt file, then supply exact icon names from the catalog. No MCP connection is needed for this workflow.",
      link: { href: paths.llms, label: "Get AI documentation →" },
    },
  ],
} satisfies ContentSectionData
