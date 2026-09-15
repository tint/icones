export const mcpMessages: Readonly<Record<string, string>> = {
  "Install the MCP server": "安装 MCP 服务器",
  "You need Node.js 22.18+ and an MCP client that supports stdio. In your application directory, install @icones/mcp-server with your preferred package manager. The server is a development tool, not part of your browser bundle.":
    "准备好 Node.js 22.18+ 和支持 stdio 的 MCP 客户端。在应用目录中，使用你习惯的包管理器安装 @icones/mcp-server。它用于辅助开发，不会成为浏览器端代码的一部分。",
  "Use a registry that provides the package, or obtain a compatible release before continuing. The installed server includes icon collections and offline framework guides. You do not need to clone the Icones repository or run the gallery.":
    "请使用提供该包的仓库，或先获取兼容版本。安装后的服务器包含图标集和离线框架指南，无需克隆 Icones 仓库，也不必运行图标网站。",
  "Add this entry to your client’s MCP configuration, keeping any existing servers. Replace the example path with the absolute path to the installed CLI in your application. Clients with a different configuration format need the same command and args.":
    "将此条目添加到客户端的 MCP 配置，保留已有服务器。将示例路径替换为应用中已安装 CLI 的绝对路径。如果客户端使用其他配置格式，填入相同的 command 和 args 即可。",
  "The server uses its included collections by default. To use your own collection, append --data-dir and an absolute directory path to args; that directory must contain <set>/manifest.json and <set>/data/. If the client cannot find node, use its executable’s absolute path for command.":
    "默认使用随包提供的图标集。使用自己的图标集时，在 args 中追加 --data-dir 和目录的绝对路径；目录需包含 <set>/manifest.json 和 <set>/data/。如果客户端找不到 node，请将 command 改为其可执行文件的绝对路径。",
  "Connect your assistant to the installed MCP server, find an icon and follow the guide for your framework. The client runs the server locally; no hosted MCP endpoint is required.":
    "将助手连接到已安装的 MCP 服务器，查找图标，再按照对应框架的指南使用。客户端在本地运行服务，无需托管 MCP 端点。",
  "If the client cannot connect, check its Node.js version, the installed CLI path and the server logs. A process waiting for input is normal: stdout carries MCP messages and diagnostics go to stderr. Do not use the gallery’s /icons URL as an MCP endpoint.":
    "如果无法连接，请检查客户端使用的 Node.js 版本、已安装 CLI 的路径及服务日志。进程等待输入属于正常状态：stdout 用于 MCP 消息，诊断写入 stderr。不要将图标网站的 /icons 地址用作 MCP 端点。",
  "A custom --data-dir takes priority over ICON_DATA_DIR and the included collections. Reconnect after changing custom collection manifests. After upgrading the server package, restart the connection to load its updated tools and offline guides.":
    "自定义 --data-dir 的优先级高于 ICON_DATA_DIR 和随包图标集。修改自定义图标集的 manifest 后请重新连接；升级服务器包后，重启连接以加载更新后的工具和离线指南。",
  "After installing the server, replace the example path with the installed CLI’s absolute path. Your MCP client launches it over stdio. It reads the included icon collections by default; no separate HTTP service is needed.":
    "安装后，将示例路径替换为已安装 CLI 的绝对路径。MCP 客户端通过 stdio 启动服务，默认读取随包图标集，无需另外运行 HTTP 服务。",
  "Start the tutorial →": "开始教程 →",
  "Add Icones to your MCP client": "将 Icones 添加到 MCP 客户端",
  "Point --data-dir at the collection root containing <set>/manifest.json and <set>/data/. If your client cannot find node, set command to the absolute path of your Node.js executable.":
    "将 --data-dir 指向包含 <set>/manifest.json 和 <set>/data/ 的图标集根目录。如果客户端找不到 node，请将 command 改为 Node.js 可执行文件的绝对路径。",
  "Reconnect and check the connection": "重新连接并验证结果",
  "Save the configuration and reconnect or restart your MCP client. It launches the CLI over stdio. Ask your assistant to list the available Icones collections; you should see set IDs, counts and source metadata.":
    "保存配置，重新连接或重启 MCP 客户端。客户端通过 stdio 启动 CLI。让助手列出可用的 Icones 图标集，结果应包含图标集标识、数量和来源元数据。",
  "The tools/call examples below show request parameters for a client’s tool inspector or SDK. They are not terminal commands; the MCP client handles the protocol messages. If the result is empty, check your data directory and its manifests.":
    "下方 tools/call 示例是供客户端工具调试器或 SDK 使用的请求参数，不是终端命令；MCP 客户端负责处理协议消息。如果结果为空，请检查数据目录及其中的 manifest 文件。",
  "Find an exact icon name": "查找准确的图标名称",
  "Choose a set returned by list_icon_sets, then search by name or category. This example looks for outline stars in Tabler. Use a name from the results rather than guessing an icon or variant.":
    "从 list_icon_sets 的结果中选择图标集，再按名称或分类搜索。示例查找 Tabler 中的线框星形图标。请使用搜索结果中的完整名称，不要猜测图标或变体名称。",
  "Search returns metadata, not artwork. To continue a longer result list, pass nextOffset back as offset with the same filters.":
    "搜索返回元数据，不包含图形。需要继续翻页时，保持筛选条件不变，将返回的 nextOffset 作为下一次请求的 offset。",
  "Read the artwork and its license": "读取图形与许可",
  "Retrieve a name from the search results with get_icon. This example uses tabler:adjustments-star and requests both original tuple JSON and standalone SVG, including the native viewBox. Keep the returned dimensions when using the artwork.":
    "使用 get_icon 读取搜索结果中的图标。示例请求 tabler:adjustments-star，同时获取原始元组 JSON、独立 SVG 和原生 viewBox。使用图形时请保留返回的尺寸信息。",
  "Call get_icon_license for the same set before reusing its icons. Read the original notices and keep the applicable attribution with your project; the MCP server does not grant a new license.":
    "复用前，调用 get_icon_license 读取同一图标集的许可。查看原始声明，并在项目中保留适用的署名信息；MCP 服务器不提供新的授权。",
  "Use the icon in your framework": "在框架中使用图标",
  "Before writing application code, ask get_framework_usage for your framework’s setup guide. Follow its installation and data-loading instructions with the exact icon name you selected. An adapter import alone does not load icon data.":
    "编写应用代码前，通过 get_framework_usage 读取对应框架的接入指南。按照指南安装依赖、配置数据加载，并使用已选定的完整图标名称。仅导入适配器不会加载图标数据。",
  "Use topic: all for the complete guide, or choose a topic such as color or icon-config. For Vanilla, select element: standard or element: web; omit element for other frameworks. These English docs are bundled and work offline.":
    "使用 topic: all 获取完整指南，也可指定 color、icon-config 等主题。Vanilla 需选择 element: standard 或 element: web，其他框架请省略 element。这些英文文档随包提供，支持离线读取。",
  "Connection checklist": "连接排查清单",
  "Connect your assistant to local icon collections with @icones/mcp-server. Search names, read artwork and inspect original licenses over stdio.":
    "通过 @icones/mcp-server 将助手连接到本地图标集，使用 stdio 搜索名称、读取图形并查看原始许可。",
  "Local stdio · read-only": "本地 stdio · 只读",
  "Connect a local MCP client.": "连接本地 MCP 客户端。",
  "--data-dir takes priority over ICON_DATA_DIR. With neither set, the CLI reads the installed @icones/icons collection. Registry installation requires a published version.":
    "--data-dir 优先于 ICON_DATA_DIR；两者均未设置时，CLI 读取已安装的 @icones/icons 图标集。从包仓库安装需要存在已发布版本。",
  "Icon tools and framework guides.": "图标工具与框架指南。",
  "Read bundled framework documentation by topic, including installation, properties and examples. Defaults to getting-started; Vanilla defaults to Web Components.":
    "按主题读取随包提供的框架文档，包含安装、属性与示例。默认返回 getting-started；Vanilla 默认使用 Web Components。",
  "Documentation, available offline.": "离线可读的文档。",
  "Search for an exact icon name, then call get_framework_usage for your framework before writing code. Choose a topic such as installation, color or icon-config, or use all for the complete guide. These are bundled English docs, generated from the same Guide source as the website.":
    "先搜索准确的图标名称，再调用 get_framework_usage 读取对应框架的用法，然后编写代码。可指定 installation、color、icon-config 等主题，或用 all 获取完整指南。文档为随包提供的英文内容，与网站共用 Guide 数据源。",
  "MCP documentation resources": "MCP 文档资源",
  "An MCP client can discover these URIs with resources/list and read them with resources/read. They are not browser URLs. The Vanilla base resource includes both element types; its separate resources keep the APIs apart.":
    "MCP 客户端可通过 resources/list 发现这些 URI，再用 resources/read 读取；它们不是浏览器网址。Vanilla 的基础资源包含两种元素类型，也可读取各自的独立资源，避免混用 API。",
  "List local collections, counts, categories, variants and source metadata.":
    "列出本地图标集、数量、分类、变体与来源元数据。",
  "Search exact names and categories. Filter by set or variant; follow nextOffset for more results.":
    "搜索原始名称与分类，按图标集或变体筛选，使用 nextOffset 继续读取下一页。",
  "Read one named icon as original JSON, standalone SVG or both, with its native viewBox and provenance.":
    "按完整名称读取单个图标的原始 JSON、独立 SVG 或两者，并返回原生 viewBox 与来源。",
  "Read unchanged collection license text and original source notices before reusing artwork.":
    "复用图形前，读取未经修改的图标集许可原文与原始来源声明。",
  "Search returns 20 results by default, up to 100 per call. get_icon defaults to tuple JSON; use format: svg or both for SVG. Missing files and invalid inputs return errors, never fabricated artwork.":
    "搜索默认返回 20 条，每次最多 100 条。get_icon 默认返回元组 JSON；需要 SVG 时，将 format 设为 svg 或 both。文件缺失或参数无效时返回错误，不会生成虚构图形。",
  "Optional: the gallery’s HTTP API.": "可选：画廊 HTTP API。",
  "These endpoints belong to the gallery’s HTTP service, not the MCP transport. The stdio server reads local files directly and does not require this service to be running.":
    "这些端点属于画廊的 HTTP 服务，并非 MCP 传输。stdio 服务器直接读取本地文件，不要求此服务处于运行状态。",
  "Use HTTP for an application’s runtime loader, or stdio MCP for an assistant launched by a local client. Neither path changes the artwork’s original license. Remote MCP hosting and authentication are not included in this package.":
    "应用的运行时加载器可以使用 HTTP，本地客户端启动的助手可以使用 stdio MCP。两种方式都不改变图形的原始许可。此包不包含远程 MCP 托管和身份验证。",
  "Read-only local collections": "只读本地图标集",
  "Stdio, not an HTTP endpoint": "stdio，而非 HTTP 端点",
  "Your client launches the CLI as a local process. There is no MCP listener at /icons and no remote HTTP transport in this package. Logs go to stderr; stdout is reserved for protocol messages.":
    "客户端将 CLI 作为本地进程启动。/icons 不是 MCP 监听地址，此包也不提供远程 HTTP 传输。日志写入 stderr，stdout 仅用于协议消息。",
  "Agent integration": "助手集成",
  "Read-only stdio tools for searching local icons, reading licenses and consulting bundled framework guides.":
    "通过只读 stdio 工具搜索本地图标、阅读许可并查询随包提供的框架指南。",
  "Connect @icones/mcp-server over stdio to search local icons, retrieve artwork and read original licenses.":
    "通过 stdio 连接 @icones/mcp-server，搜索本地图标、获取图形并阅读原始许可。",
}
