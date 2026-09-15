import type { ContentSectionData } from "../../shared/content/types.ts"

export const llmsUsage = {
  id: "using-ai-documentation",
  title: "Give your assistant a focused starting point.",
  description:
    "Documentation explains the API. Your project supplies the framework, data paths and requirements that make an example usable.",
  items: [
    {
      title: "1. Choose a scope",
      description:
        "Use your framework’s section below. For Vanilla, choose standard elements or Web Components to match your markup. Use all frameworks only when comparing integrations.",
    },
    {
      title: "2. Choose the amount of context",
      description:
        "llms.txt is a short index for tools that can follow links. llms-full.txt contains the complete selected guide and is more useful as an attachment when the assistant cannot browse.",
    },
    {
      title: "3. Include your project constraints",
      description:
        "Share your framework, build tool, icon data directory and whether runtime requests are allowed. Ask for exact catalog names, then verify the result in your app.",
    },
  ],
} satisfies ContentSectionData
