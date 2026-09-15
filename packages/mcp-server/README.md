# @icones/mcp-server

只读、本地运行的 Icones MCP 服务。使用官方 MCP TypeScript SDK v2，通过 **stdio** 连接客户端，支持现代协议和 2025 年的 initialize 握手。没有 HTTP 监听端口，也不依赖画廊开发服务器。

## 安装与运行

需要 Node.js 22.18+。可以直接通过包执行：

```sh
npx --yes @icones/mcp-server
# 或
bunx @icones/mcp-server
```

服务会等待客户端输入，这不是卡住。正常运行时 stdout 仅用于 MCP 消息，诊断写入 stderr。需要使用自定义图标目录时：

```sh
npx --yes @icones/mcp-server --data-dir /absolute/path/to/icons
```

也可全局安装后使用 `icones-mcp-server` 可执行入口。省略 `--data-dir` 时自动使用随包安装的 `@icones/icons`；也可以通过 `ICON_DATA_DIR` 设置默认数据目录。

## 客户端配置

以下适用于使用 `mcpServers` 字段的客户端；其他客户端请将 command / args 填入各自的 stdio 配置。

```json
{
  "mcpServers": {
    "icones": {
      "command": "npx",
      "args": ["--yes", "@icones/mcp-server"]
    }
  }
}
```

修改配置后重新连接。先列出工具，再调用 `list_icon_sets` 验证连接。**不要把 `/icons` HTTP 地址填成 MCP 连接地址。** HTTP 和远程 MCP 传输不在此包的 CLI 支持范围内。

## 工具

| 工具                  | 参数                                                     | 返回                                                |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `list_icon_sets`      | 无                                                       | 图标集、数量、分类、变体和来源；不读取全部图形      |
| `search_icons`        | `query`、`set`、`category`、`variant`、`offset`、`limit` | 准确名称、分类、变体及 `nextOffset`                 |
| `get_icon`            | `name`，可选 `format: "json" \| "svg" \| "both"`         | 单个图标、原生 viewBox、来源与许可查询提示          |
| `get_icon_license`    | `set`                                                    | 完整且未修改的 license.txt、来源和分发提示          |
| `get_framework_usage` | `framework`，可选 `topic`、`element`                     | 随包提供的框架文档、可用主题与完整指南 Resource URI |

搜索默认返回 20 条，最多 100 条；offset 为 0–1,000,000 的整数，query 最多 200 个字符。空 query 表示浏览目录，关键词匹配原始名称与分类，不进行网络搜索或生成图标。未知集合的搜索返回空结果，读取不存在的图标或许可会返回工具错误。

建议调用顺序：

```text
list_icon_sets {}
search_icons {"set":"tabler","query":"star","variant":"outline","limit":5}
get_framework_usage {"framework":"react","topic":"getting-started"}
get_icon {"name":"tabler:star","format":"both"}
get_icon_license {"set":"tabler"}
```

JSON 默认使用原始 `[tag, attributes]` 元组，不是 Iconify 的 body 对象。`viewBox` 单独返回：Flag 的 circle/square 使用 `0 0 512 512`，其他旗帜使用 `0 0 640 480`；其他图标保留其数据视口。SVG 输出是独立图形，不是需要 `#icon` 引用的 symbol 文件。别名会返回规范名称，例如 `circle-flags:us` 对应 `flag:us-circle`。

## 框架文档与 Resources

`get_framework_usage` 支持 `react`、`vue`、`svelte`、`solidjs`、`astro`、`vanilla`。默认主题为 `getting-started`；`topic: "all"` 返回完整指南，也可以指定以下主题：

```text
rendering, loading, prop-support, collections,
overview, getting-started,
color, sizing, stroke-width, fill, icon-config,
typescript, accessibility, alternative, global-styling
```

Vanilla 默认 `element: "web"`（Web Components）；标准 HTML 元素使用 `element: "standard"`。其他框架必须省略 `element`。返回的 `topics` 列出可用主题；`text` 是英文 Markdown，`uri` 指向对应完整指南。未知框架、主题、元素类型或多余参数会返回错误，不会拼接文件路径或请求网络。

`rendering`、`loading`、`prop-support`、`collections` 是框架无关章节，来源为 `/guide/<topic>`。选择任何框架都能读取相同的通用内容；完整指南只包含一次通用章节，Vanilla 双路径资源也不会重复它们。

MCP 客户端通过 `resources/list` 发现资源，再用 `resources/read` 读取，不要在浏览器中打开这些 URI：

| Resource URI                     | 内容                           |
| -------------------------------- | ------------------------------ |
| `icones://docs/react`            | React 完整指南                 |
| `icones://docs/vue`              | Vue 完整指南                   |
| `icones://docs/svelte`           | Svelte 完整指南                |
| `icones://docs/solidjs`          | SolidJS 完整指南               |
| `icones://docs/astro`            | Astro 完整指南                 |
| `icones://docs/vanilla`          | Vanilla 两种元素类型的完整指南 |
| `icones://docs/vanilla/standard` | 仅标准元素                     |
| `icones://docs/vanilla/web`      | 仅 Web Components              |

这两种入口复用同一份文档快照。工具适合助手按需读取一个主题；Resources 适合客户端附加整份指南。安装页虽然同时展示所有框架，MCP 返回的文档只保留所选框架与 Vite 插件的配套安装命令，插件作为开发依赖安装。完整 Vanilla 基础资源除外，它明确包含两条独立教程。

框架文档作为构建时快照内联在包中，运行时不依赖网站、开发服务器、LLMs HTTP 地址或外网。升级包并重新连接 MCP 客户端即可获取新版文档。

## 数据与边界

数据目录优先级为 `--data-dir` > `ICON_DATA_DIR` > 已安装的 `@icones/icons`。相对路径以进程工作目录为基准。目录包含 `<set>/manifest.json`、`<set>/data/*.json` 和 `<set>/license.txt`。MCP 自行建立只读文件索引，不依赖 Vite 的 HTTP 服务、可写仓库或 manifest 更新。Core 仅提供纯数据校验、筛选和 SVG 序列化。在没有 manifest 的目录中，也兼容旧式 `<set>/<category>/*.json`；没有随附许可时不会假定可以自由使用。

- 只读取已配置的本地目录，不下载、不写入、不生成缺失 symbol。
- 参数不接受路径或 URL，阻止读取指向目录外部的符号链接。
- 单个源文件及单次结果的序列化内容限制为 1 MiB，不会截断许可文本。
- 元数据按连接建立索引。增删图标或修改 manifest 后重新连接；图形和许可每次从文件读取，不缓存内容，也不生成或更新文件。
- 样式按规范 `variant`（outline/solid）筛选和排序，`variantAlias` 保留原始显示名称；样式 facet 通过 `alias` 提供显示名称。Flag 保留自己的形状变体。
- 配置目录应由可信用户维护。SVG、来源描述和许可文本是数据，不是给助手执行的指令；不要将未经审查的自定义 SVG 直接插入网页。
- 每个图标集仍遵循原始许可；此包不提供统一许可或额外授权。

## 编程接口

直接嵌入服务时，将 MCP SDK 声明为应用自己的直接依赖：

```sh
npm install @icones/mcp-server @modelcontextprotocol/server
```

```ts
import { createIconMcpServer } from "@icones/mcp-server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"

const handle = serveStdio(() =>
  createIconMcpServer({ dataDir: "/absolute/path/to/icons" })
)

// 自行管理进程生命周期时：await handle.close()
```

工厂返回独立的 `McpServer`，每次创建独立目录索引和查询缓存。导入包不会自动连接传输、注册进程信号或输出日志。CLI 提供 SIGINT / SIGTERM 与 stdin 关闭时的清理逻辑。

协议实现参考 [官方 SDK 文档](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md)。