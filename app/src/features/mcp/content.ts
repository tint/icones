import { guideFrameworks } from "../../shared/integrations/frameworks.ts"
import {
  packageInstall,
  type InstallExample,
} from "../../shared/integrations/package-install.ts"

/** Client configuration is illustrative: replace placeholders with absolute local paths. */
export const mcpClientConfig = JSON.stringify(
  {
    mcpServers: {
      icones: {
        command: "node",
        args: [
          "/absolute/path/your-app/node_modules/@icones/mcp-server/dist/cli.js",
        ],
      },
    },
  },
  null,
  2
)

export const mcpTools = [
  {
    name: "list_icon_sets",
    description:
      "List local collections, counts, categories, variants and source metadata.",
  },
  {
    name: "search_icons",
    description:
      "Search exact names and categories. Filter by set or variant; follow nextOffset for more results.",
  },
  {
    name: "get_icon",
    description:
      "Read one named icon as original JSON, standalone SVG or both, with its native viewBox and provenance.",
  },
  {
    name: "get_icon_license",
    description:
      "Read unchanged collection license text and original source notices before reusing artwork.",
  },
  {
    name: "get_framework_usage",
    description:
      "Read bundled framework documentation by topic, including installation, properties and examples. Defaults to getting-started; Vanilla defaults to Web Components.",
  },
] as const

function toolExample(
  name: (typeof mcpTools)[number]["name"],
  args: Record<string, string | number> = {}
) {
  return {
    filename: "tools/call · " + name,
    code: JSON.stringify({ name, arguments: args }, null, 2),
  }
}

/** Consumer setup and tools/call parameters, not a simulated protocol transcript. */
export const mcpTutorialSteps = [
  {
    id: "install",
    title: "Install the MCP server",
    paragraphs: [
      "You need Node.js 22.18+ and an MCP client that supports stdio. In your application directory, install @icones/mcp-server with your preferred package manager. The server is a development tool, not part of your browser bundle.",
      "Use a registry that provides the package, or obtain a compatible release before continuing. The installed server includes icon collections and offline framework guides. You do not need to clone the Icones repository or run the gallery.",
    ],
    examples: [
      {
        filename: "Terminal",
        code: packageInstall("@icones/mcp-server", false, true),
        install: {
          dependencies: [{ name: "@icones/mcp-server", dev: true }],
          development: false,
        } satisfies InstallExample,
      },
    ],
  },
  {
    id: "configure",
    title: "Add Icones to your MCP client",
    paragraphs: [
      "Add this entry to your client’s MCP configuration, keeping any existing servers. Replace the example path with the absolute path to the installed CLI in your application. Clients with a different configuration format need the same command and args.",
      "The server uses its included collections by default. To use your own collection, append --data-dir and an absolute directory path to args; that directory must contain <set>/manifest.json and <set>/data/. If the client cannot find node, use its executable’s absolute path for command.",
    ],
    examples: [{ filename: "mcp-config.json", code: mcpClientConfig }],
  },
  {
    id: "verify",
    title: "Reconnect and check the connection",
    paragraphs: [
      "Save the configuration and reconnect or restart your MCP client. It launches the CLI over stdio. Ask your assistant to list the available Icones collections; you should see set IDs, counts and source metadata.",
      "The tools/call examples below show request parameters for a client’s tool inspector or SDK. They are not terminal commands; the MCP client handles the protocol messages. If the result is empty, check your data directory and its manifests.",
    ],
    examples: [toolExample("list_icon_sets")],
  },
  {
    id: "search",
    title: "Find an exact icon name",
    paragraphs: [
      "Choose a set returned by list_icon_sets, then search by name or category. This example looks for outline stars in Tabler. Use a name from the results rather than guessing an icon or variant.",
      "Search returns metadata, not artwork. To continue a longer result list, pass nextOffset back as offset with the same filters.",
    ],
    examples: [
      toolExample("search_icons", {
        set: "tabler",
        query: "star",
        variant: "outline",
        limit: 5,
      }),
    ],
  },
  {
    id: "artwork",
    title: "Read the artwork and its license",
    paragraphs: [
      "Retrieve a name from the search results with get_icon. This example uses tabler:adjustments-star and requests both original tuple JSON and standalone SVG, including the native viewBox. Keep the returned dimensions when using the artwork.",
      "Call get_icon_license for the same set before reusing its icons. Read the original notices and keep the applicable attribution with your project; the MCP server does not grant a new license.",
    ],
    examples: [
      toolExample("get_icon", {
        name: "tabler:adjustments-star",
        format: "both",
      }),
      toolExample("get_icon_license", { set: "tabler" }),
    ],
  },
  {
    id: "framework",
    title: "Use the icon in your framework",
    paragraphs: [
      "Before writing application code, ask get_framework_usage for your framework’s setup guide. Follow its installation and data-loading instructions with the exact icon name you selected. An adapter import alone does not load icon data.",
      "Use topic: all for the complete guide, or choose a topic such as color or icon-config. For Vanilla, select element: standard or element: web; omit element for other frameworks. These English docs are bundled and work offline.",
    ],
    examples: [
      toolExample("get_framework_usage", {
        framework: "react",
        topic: "getting-started",
      }),
    ],
  },
] as const

export const mcpDocumentationUris = [
  ...guideFrameworks.map(({ id }) => "icones://docs/" + id),
  "icones://docs/vanilla/standard",
  "icones://docs/vanilla/web",
]
