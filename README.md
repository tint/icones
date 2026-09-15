# Icones

基于原 `packages/iconify` 拆分的独立图标工作区：框架无关的数据层、React / Vue / Svelte / SolidJS / Astro / vanilla 适配器、Vite 插件，以及可以直接运行的图标画廊。

官网：[icones.go-slim.dev](https://icones.go-slim.dev) · 源码：[github.com/tint/icones](https://github.com/tint/icones)

各适配器共享数据解析、缓存、加载器和 SVG 规则；保留各框架原生的组件与生命周期。`@icones/icons` 提供原始图标资源，`@icones/names` 独立提供名称声明，让 Core 无需依赖完整图标数据包。`@icones/mcp-server` 提供本地只读 MCP 工具，参见[客户端接入说明](packages/mcp-server/README.md)。

## 本地运行

使用 Bun 1.3.5+、Node.js 22.22+。

```sh
bun install
bun run dev
# 默认 http://127.0.0.1:5173

# 自定义端口
bun run dev --port 5174
```

`dev` 会先构建本地库，再启动画廊。开发页面和 `/icons` 数据接口由同一个 Vite 服务提供，无须启动原仓库或访问外部图标 API。

```sh
bun run build       # 库 + dist/client/ 网站 + dist/icons/<set>/ 集合部署
bun run build:local # 全部资源同源的离线预览构建
bun run start       # 同时服务 dist/client/ 和 packages/icons/，默认 3000 端口
bun run start:mcp   # stdio MCP：搜索和读取本地图标，不启动 HTTP 服务
bun run check       # 格式、lint、类型检查
bun run test        # 构建库，运行各包、网站、跨包及框架测试
bun run test:packages # 运行包与生成器测试（需先构建库）
bun run test:app    # 仅运行网站测试
bun run test:integration # 跨包、发布产物与静态部署检查
bun run test:frameworks # 仅运行适配器测试（需先构建库）
```

`packages/<name>/package.json` 是源码工作区清单，内部依赖必须保留 `workspace:*`，不能直接拿它发布；各包自己的 `dist/` 也只是编译中间产物。使用发布构建生成包含最终 `package.json` 和运行文件的独立目录：

```sh
bun run build:release
# dist/packages/<name>/：可直接发布的包目录

bun run pack:packages
# 额外生成 dist/packages/tarballs/*.tgz

bun run publish:packages --dry-run
# 检查全部 tarball，不上传

bun run publish:packages --all
# 按依赖顺序发布全部公开包
```

版本默认读取各个源码包的 `package.json`；需要临时统一覆盖所有公开包时，可附加 `--version 0.1.0`。发布构建会移除源码条件、开发脚本和开发依赖，并将内部 `workspace:*` 改写为被依赖包的目标版本；生成后还会逐项验证依赖版本及 exports/bin/types 文件。详细规则见 [npm 发布构建](scripts/package-builder/README.md)。发布不是事务操作，正式执行 `--all` 前应先完成 `--dry-run`；如发布预发行版本，应同时传入 `--tag next` 等非 `latest` 标签。

测试归属、类型检查与独立运行方式见 [测试说明](scripts/verify/README.md)。`icons`、`names` 的内容生成由私有的 `scripts/icon-builder` 管理，npm 发布产物由 `scripts/package-builder` 管理，跨包契约由 `scripts/verify` 验证；产物包自身不添加发布脚本。

本地预览服务支持 `PORT`、`HOST`、`ICON_DATA_DIR`、`ICON_SYMBOLS_DIR`、`ICON_PREVIEW_DIR`、`ICON_API_PATH`，路径默认相对于工作区根目录。默认构建将网站和 `catalog.json` 写入 `dist/client/`，各集合原始图标、manifest 和许可写入 `dist/icons/<set>/public/`，独立静态部署到集合子域名，不需要图标 HTTP handler 或 Worker 脚本。发布步骤见 [Cloudflare 静态部署](scripts/icon-builder/DEPLOYMENT.md)。

### React Router SSG 与语言路由

中英文由 URL 决定：默认美式英语不加前缀，例如 `/guide`、`/licenses`；简体中文使用 `/zh-CN/guide`、`/zh-CN/licenses`。语言菜单使用普通链接，整页加载对应入口，保留当前路径、查询参数和锚点，不读取或同步 localStorage 中的语言偏好。旧 `/en-US/...` 链接会跳转到对应的无前缀地址。

画廊使用 React Router Framework Mode。`app/react-router.config.ts` 配置 `ssr: false` 和 `prerender`，`src/routes.ts` 定义路由模块。`react-router build` 在构建时运行 loader 并渲染首页、指南、许可证和 Solutions 正文，生成中英文 HTML 与 `.data` 文件；不需要线上 React SSR 服务。浏览器通过 `HydratedRouter` 和 `hydrateRoot` 接续交互，不再使用空 HTML 壳和 `createRoot`。

指南使用独立路径，如 `/guide/svelte/stroke-width` 和 `/zh-CN/guide/vanilla/standard/icon-config`。每页的标题、描述、`lang`、语言链接和正文在 HTML 中已就绪，禁用 JavaScript 仍可阅读。图标目录搜索、弹窗和偏好切换在 hydration 后运行。根 loader 只带入当前语言词典；静态 `locales/<语言>.json` 用于未预渲染路径的语言回退。

```text
dist/client/
  index.html
  guide/index.html
  zh-CN/index.html
  zh-CN/guide/index.html
  guide/svelte/stroke-width/index.html
  guide/svelte/stroke-width.data
  __spa-fallback.html
  locales/en-US.json
  locales/zh-CN.json
  assets/...
```

部署目录为 `dist/client/`，静态托管需支持目录的 `index.html`，以便语言地址直接访问与刷新。已预渲染页面可直接托管；如需支持其他客户端页面路径，可在托管平台单独配置回退到 `__spa-fallback.html`，不要将缺失的 `.data`、JS、JSON 或 SVG 回退为 HTML。英文 LLM 文档保持原地址，旧语言前缀与查询式指南链接在客户端兼容跳转。`bun run --cwd app preview` 和 `bun run start` 保留本地预览服务。

### 按框架下载 LLM 文档

`/solutions/llms` 和 `/zh-CN/solutions/llms` 按框架使用独立的 `<section>` 直接展示文档，无需选择或切换。保留全部框架汇总，Vanilla 下同时展开标准元素与 Web Components 子区；可通过 `#llms-vue` 或 `#llms-vanilla-standard` 等锚点直达对应分区。每个分区都提供 `llms.txt`（索引）与 `llms-full.txt`（完整教程）：

- 全部框架：`/llms.txt`、`/llms-full.txt`。
- 单一框架：`/llms/<framework>/llms.txt`、`/llms/<framework>/llms-full.txt`，其中 framework 为 `react`、`vue`、`svelte`、`solidjs`、`astro` 或 `vanilla`。
- Vanilla 标准元素：`/llms/vanilla/standard/llms.txt`、`/llms/vanilla/standard/llms-full.txt`。
- Vanilla Web Component：`/llms/vanilla/web/llms.txt`、`/llms/vanilla/web/llms-full.txt`。

共 18 个英文 Markdown 纯文本文件，均由指南内容生成；单一框架文件仅包含通用规则与该框架的教程。`dev` 直接提供这些文本，`build` 在 `dist/client/` 下按上述路径生成独立静态文件，支持 Vite preview、本地生产服务及静态托管。它们是文档，不是 MCP 服务或图标数据库。

## 包结构

| 包                         | 内容                                                                      |
| -------------------------- | ------------------------------------------------------------------------- |
| `@icones/core`             | 框架无关运行时与数据/SVG 工具；资源查询和 manifest 通过独立子入口提供     |
| `@icones/vite/tooling`     | 构建期 SVG 解析、symbol 生成和集合生产预设；不初始化插件                  |
| `@icones/mcp-server`       | stdio MCP：图标查询、JSON/SVG、原始许可与随包框架指南（工具和 Resources） |
| `@icones/react`            | `Icon`、`IconConfig`、`IconProvider`、`useIconData`，并重新导出核心 API   |
| `@icones/vue`              | Vue 3.5+ 的 Icon、嵌套 IconConfig、fallback slot 与 SSR                   |
| `@icones/svelte`           | Svelte 5.20+ 原生 runes 组件、Snippet fallback 与 SSR                     |
| `@icones/solidjs`          | Solid 响应式组件，分别输出 JSX / DOM / SSR 入口                           |
| `@icones/vanilla`          | Web Component / 普通 i 元素，以及 createIcon / mountIcon 手动 DOM API     |
| `@icones/astro`            | Astro 7+ 服务端组件，等待异步数据并输出无客户端运行时的 SVG               |
| `@icones/vite`             | 所有适配器的静态图标名收集，内联 SVG 或独立 symbol 输出                   |
| `app/`                     | 分类、搜索、样式过滤、虚拟列表、图标详情、SVG 下载、SVG/React 代码复制    |
| `@icones/icons`            | `packages/icons/`：仅图标 JSON、SVG symbol、manifest 和原始许可           |
| `@icones/names`            | 无图形、无运行时依赖的名称声明；由 Core 和适配器重新导出                  |
| `scripts/icon-builder/`    | 图标导入、类型和 symbol 生成、基准测试及静态资源打包                      |
| `scripts/package-builder/` | npm 最终包清单、版本改写、tarball 及显式发布流程                          |
| `scripts/verify/`          | 私有跨包契约、生产声明、资源消费与静态部署验证                            |

浏览器入口不会导入 Node 文件系统代码或整套图标数据。工作区使用源码条件导出，生产消费者使用 `dist/` 和对应声明文件；无需访问原来的 `my-shadcn-ui` 目录。

代码按使用阶段和归属划分：`scripts/icon-builder` 管理资源生产，`scripts/package-builder` 管理 npm 发布快照；`app` 管理网站目录、路由和展示策略；`packages/vite` 管理插件、构建转换和开发期 HTTP 资源服务；`packages/mcp-server` 独立管理 MCP 协议及只读文件访问；Core 和框架适配器管理 CSR/SSR 组件运行时。底层数据算法已并入 [Core](packages/core/UTILITIES.md)。独立 utils、catalog、converter、server 包已撤销，转换由 [Vite tooling](packages/vite/TOOLING.md) 提供；网站本地预览和构建脚本使用 [Vite server 子入口](packages/vite/SERVER.md)，MCP 不依赖它。生产部署仍是纯静态 `dist/client/`，无需运行 server 或 Worker。

官网本地静态文件服务器位于 `app/server/`，通过 `bun run start` 启动。组件依赖链为适配器 → Core，不加载目录索引、manifest、Node I/O 或 XML 解析器。MCP、Vite 和资源脚本复用 Core 的无状态工具子入口，不通过根入口加载组件状态。网站的生产部署仍只需 `dist/client/`，无需 Worker。

各包提供独立的使用说明：[Vue](packages/vue/README.md)、[Svelte](packages/svelte/README.md)、[SolidJS](packages/solidjs/README.md)、[vanilla](packages/vanilla/README.md)、[Astro](packages/astro/README.md)。运行 `bun run --cwd packages/<包名> play` 打开示例。Vue、Svelte、Solid 的自动化测试使用本机 Chrome；Svelte 开发需要同时运行该包的 `dev` 监听打包。

完整名称类型由 [icon-builder](scripts/icon-builder/README.md) 根据 icons 的 manifest 生成到 [names](packages/names/README.md)，并由 Core 和适配器重新导出：

```ts
import type { IconName, IconSetName } from "@icones/names"

const name = "tabler:star" satisfies IconName
const flag = "flag:us-circle" satisfies IconName<"flag">
const set = "huge" satisfies IconSetName
```

`IconName` 严格限定为清单中存在的完整名称；`IconProps.name` 保留动态字符串和自定义 sources 支持，同时提供内置名称补全。需要校验拼写时，在 name 值后使用 `satisfies IconName`。类型导入不会引入图标运行时数据。

Vue / Svelte / Solid 的 `Icon` 支持 `scope` 显式配置，`IconConfig` 支持上下文继承。vanilla / Astro 使用 `createIconConfig`（即核心 `createIconScope`）显式传递配置。各包均重新导出核心 API。

## React 用法

```tsx
import { Icon, IconConfig } from "@icones/react"

export function Toolbar() {
  return (
    <IconConfig
      defaultSize="md"
      strokeWidth={1.5}
      api={{ type: "symbol", baseUrl: "/icons" }}
    >
      <Icon name="tabler:search" aria-label="搜索" />
      <Icon name="brand:github" size={24} />
      <Icon name="tabler:star" altName="tabler:star-filled" showAlt />
    </IconConfig>
  )
}
```

预设尺寸为 `xs=12`、`sm=16`、`md=20`、`lg=24`、`xl=28`。支持数值、CSS 长度、颜色、线宽、绝对线宽、旋转和镜像。`rotate` 按 90° 为单位。无标签的装饰图标默认 `aria-hidden`；有语义的图标可设置 `aria-label`。

也可以传入独立 Iconify 数据或元素元组，无须接口或插件：

主图标的 `name` / `data` 与备选图标的 `altName` / `altData` 是独立的两组来源；`showAlt` 决定显示哪组。`<Icon data={primary} altData={alternative} showAlt={selected} />` 可在两份内联数据间切换，也支持一组名称、另一组数据。同组同时传入名称和数据会输出 `console.error`，但仍优先使用 `data` / `altData`，不影响正常渲染；未显示的组也会检查。冲突提示按实例和组去重，解除后再次出现会重新提示。未提供备选来源时保持主图标，备选来源加载失败时则使用正常的加载/回退行为，不自动切回主图标。

该规则适用于全部框架组件及 Vanilla 的 `createIcon` / `mountIcon`。HTML 声明式入口不接收对象属性，应将数据注册到 `sources` 后按名称引用；整套图标集也推荐使用这种方式。

```tsx
import { Icon, IconConfig, type ElementData } from "@icones/react"

const arrow: ElementData = [
  ["path", { d: "M4 12h16m-6-6 6 6-6 6", stroke: "currentColor" }],
]

export function LocalIcon() {
  return (
    <IconConfig sources={{ Arrow: arrow }} api={false}>
      <Icon name="Arrow" />
      <Icon data={arrow} size="1.5rem" />
    </IconConfig>
  )
}
```

`set:name` 按精确名称解析。无前缀名称需要显式 `sources`；不会自动猜测图标集或填充样式。CSR/SSR 组件及其类型声明不依赖 `@iconify/*`。未由本地数据或 Vite 产物满足的名称默认请求 `https://<set>.icones.go-slim.dev/data/<name>.json`；显式 `sources`、`api` 或 `loader` 优先，`api={false}` 可关闭网络回退。

使用自建静态产物时可设置 `api: createStaticIconLoader("/icons")`，按 `<set>/data/<name>.json` 请求单个图标并覆盖默认服务。SSR 使用自建服务时请传绝对 URL，并按请求预加载。默认服务、自定义服务和可选第三方 SDK 接入见 [运行时数据接入](packages/core/RUNTIME.md)。

## Vite 集成

Vanilla 提供两个独立入口，可以任选一种，也可以同时导入；两种方式都不创建 Shadow DOM：

```html
<icones-icon name="tabler:star" size="24"></icones-icon>
<i icon-name="tabler:heart" icon-size="24"></i>

<script type="module">
  import "@icones/vanilla/web-element"
  import "@icones/vanilla/standard-element"
</script>
```

Vite HTML 入口里 `<icones-icon>` 的 `name` / `alt-name` 和 `<i>` 的 `icon-name` / `icon-alt-name` 静态名称都会被收集。后续修改属性或插入新元素会自动渲染，SVG 直接位于 Light DOM 中；运行时才出现的名称仍需 API 或本地 sources。更多属性、作用域和生命周期见 [Vanilla 文档](packages/vanilla/README.md)。

```ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { icones } from "@icones/vite"

export default defineConfig({
  plugins: [
    icones({
      mode: "symbol",
      dataDir: "./icons",
      assetsDir: "assets/icons",
      emitData: false,
      fallbackToApi: false,
    }),
    react(),
  ],
})
```

插件识别各框架包导入的 `Icon`，以及 vanilla 的 `createIcon` / `mountIcon`，支持别名导入、namespace 导入和备用图标。Vue 支持 `h` 与 `<script setup>` 模板；静态提取分析框架编译后的代码，跳过动态表达式、局部同名变量和被 spread 覆盖的名称。动态名称交给运行时加载器。`mode: "svg"` 将数据内联，`mode: "symbol"` 生成按内容哈希命名的独立 SVG。`dataDir` 相对于 Vite root，跨目录使用时建议传绝对路径。

静态图标优先读取 `dataDir`（默认 `./icons`），不存在时读取插件依赖的 `@icones/icons` 包，再尝试 `icons` / `iconSets` 和 `loadIcon` 或构建期 API。包内图标只读、按需提取，不复制到 `dataDir`，不整体打包进客户端；本地同名 JSON 可以覆盖包内图标。

`emitData: false` 需要独立数据服务来支持动态名称和目录查询；画廊已完成此配置。未禁用 `fallbackToApi` 时，插件可在构建期间下载缺失的静态图标。

`emitData: "used"` 仅输出静态使用的 JSON，`true` / `"all"` / 默认设置输出全部 `dataDir` JSON 加上本次收集的包内/新提取 JSON，不会自动输出整个 `@icones/icons` 包。静态提取默认最多 8 个并发任务，每个执行中的任务最多等待 15 秒；通过 `concurrency` / `timeout` 调整。自定义 `loadIcon(name, request)` 可将 `request?.signal` 传给请求以支持取消。详见 [Vite 配置](packages/vite/README.md)；可通过 `bun run benchmark:packages` 在当前数据集上运行本机基准。

## 缓存和 SSR

```tsx
import { createIconStore, Icon, IconConfig } from "@icones/react"

// 每个 SSR 请求分别创建 store，避免跨请求共享数据。
const store = createIconStore({
  api: { type: "fetch", baseUrl: "http://127.0.0.1:3000/icons" },
  concurrency: 6,
  maxEntries: 500,
})
await store.preload(["tabler:search"])
const initialData = store.snapshot()
const content = (
  <IconConfig store={store}>
    <Icon name="tabler:search" />
  </IconConfig>
)
```

将 `initialData` 通过框架提供的安全序列化方式传给客户端，再使用 `createIconStore({ initialData, api })`，即可复用 SSR 数据。不要直接将未经转义的 JSON 拼进 HTML。缓存支持请求去重、超时、取消、TTL、重试和父级来源继承；symbol 模式可直接输出 SSR 引用。

Vue / Svelte / Solid 同样支持传入预加载的 store；服务端渲染本身不启动网络请求。Astro 会等待加载结果，因此可以直接使用异步来源。所有直接传入的 SVG body 和元素数据均应来自可信图标源，它们不是任意用户 HTML 的安全过滤器。

## 数据接口

```text
GET /icons/catalog?set=tabler&q=search&offset=0&limit=50
GET /icons/tabler.json?icons=search,star
GET /icons/tabler/search.svg
GET /icons/tabler/data/star.json
GET /icons/tabler/symbols/star.svg
```

目录每页最多 100 条，返回图标元数据、计数和下一页偏移量。SVG 接口的 symbol ID 是 `icon`，可引用 `/icons/tabler/search.svg#icon`。图标 JSON 路径为 `<set>/data/<name>.json`，SVG 为 `<set>/symbols/<name>.svg`。分类与样式仅记录于集合的 `manifest.json`，不再影响路径；同一集合内文件名唯一。

默认生产图标地址为 `https://<set>.icones.go-slim.dev`，搜索索引仍为同源 `/icons/catalog.json`。可通过 `VITE_ICON_COLLECTION_URL` 覆盖集合根地址模板，或通过 `VITE_ICON_DATA_BASE_URL` 指向共享资源根目录；目录元数据独立使用 `VITE_ICON_CATALOG_BASE_URL`。跨源部署使用 Fetch 模式和数据服务的 CORS；浏览器对外部 SVG `<use>` 的跨源限制仍然适用。

## 图标维护

每个集合独立打包，目录不再包含分类层级：

```text
packages/icons/
  tabler/
    data/star.json
    data/star-filled.json
    symbols/star.svg
    symbols/star-filled.svg
    manifest.json
    license.txt
  brand/
  bootstrap/
  antd/
  flag/
  huge/
  lucide/
  phosphor/
  package.json
```

名称声明独立生成到 `packages/names/types/`，通过 `@icones/names` 或 `@icones/names/<set>` 导入。`icons` 仅保存资源且不含 scripts；维护命令集中在私有包 `@icones/icon-builder`。

本仓库根目录使用 `dataDir: "./packages/icons"`，画廊 app/ 使用 `../packages/icons`；外部应用静态收集时无需复制集合，插件会自动回退到 `@icones/icons`。需要自定义或覆盖图标时，再放入 `./icons`。清单仅保存文件名，不保存路径；JSON 保持 `[tag, attributes]` 元组格式。以下是清单节选：

```json
{
  "version": 1,
  "prefix": "tabler",
  "variants": {
    "outline": {
      "system": { "json": ["star.json"], "svg": ["star.svg"] }
    },
    "solid": {
      "system": { "json": ["star-filled.json"], "svg": ["star-filled.svg"] }
    }
  }
}
```

完整清单还包含 `sources` 来源信息及可选的旧命名空间 `aliases`。Flag 的 `circle`、`1x1`、`4x3` 共用一个集合，例如 `flag:us-circle`、`flag:us-square`、`flag:us`；`license.txt` 完整保留两个上游的许可。`huge:*` 是新前缀，本地图标服务与 Vite 仍能解析旧 `hugeicons:*`、`circle-flags:*` 名称；这些新前缀不是 Iconify 公共 API 的前缀。

页面通过 `/icons/catalog?set=flag&variant=circle&category=flags` 读取清单派生的分页数据；样式按钮、分类和计数均来自清单。也可以直接读取 `/icons/flag/manifest.json` 和 `/icons/flag/license.txt`。

下载和 Vite 静态提取会维护清单；外部应用只复制一个 JSON 时，保存为 `icons/tabler/data/star.json` 即可，Vite 会在首次静态引用时登记它并生成 symbol。完整复制集合时同时保留 `manifest.json` 和 `license.txt`。本仓库的数据位于 `packages/icons/`，维护脚本位于 `scripts/icon-builder/`。手动修改清单后运行 `bun run generate:types` 更新类型；构建会自动生成，类型检查会发现过期文件。

已迁入 8 个集合：Tabler、Brand、Bootstrap、Ant Design、Phosphor、Lucide、Flag（含 Circle Flags）、Huge，共 20,823 个图标。除 Flag 外，分类统一为 outline/solid，显示名由 alias 保留上游叫法。Bootstrap 有 2,078 个图标（保留原始名称，包括 `building-fill-add`）；Ant Design 有 698 个图标，仅导入 Outlined/Filled，不包含 TwoTone，例如 `antd:star` / `antd:star-filled`。Phosphor 仅保留 Regular/Fill，共 3,024 个图标。导入来源、固定 revision 和计数保存在各集合的 `manifest.json`。

```sh
bun run download:icons --set tabler,lucide --force
bun run download:icons --set bootstrap,antd --force
bun run download:api --icons tabler:search,tabler:star
bun run generate:symbols
```

修改 JSON 后运行 `generate:symbols`；它离线重建 SVG，并保留 JSON。官方集合替换使用可恢复备份，未选择的集合保持不变。重新导入图标后重启数据服务以刷新目录索引。

原始许可保留在 `packages/icons/<set>/license.txt`，各集合遵循各自的许可，不能统一视为 MIT。Bootstrap 与 Ant Design 都使用 MIT，分发时保留原始版权与许可文本。这里提供本地构建与部署资源准备，不自动发布或上传图标。

```sh
bun run build
```

根目录 `bun run build` 先构建依赖包，再由 app 生成 `dist/client/` 网站和 `dist/icons/<set>/` 集合部署。依赖包构建后，单独执行 `bun run --cwd app build` 也包含这两个步骤。`dist/server/` 是预渲染中间产物，不参与部署；所有 Wrangler 配置只有静态资源，没有 Worker 入口。

`ICONES_BUILD_DIRECTORY` 可指定独立构建根目录，页面写入其 `client/`、集合部署写入其 `icons/`，不修改默认 `dist/`。`app preview` 从构建目录提供页面，动态画廊读取配置的集合域名，不使用源码图标弥补缺失产物。域名未上线时用 `bun run build:local` 生成包含全部图标的同源产物进行离线预览。

公开集合原样复制至 `dist/icons/<set>/public/data/*.json` 和 `symbols/*.svg`，并保留 manifest、许可证和跨域响应头。目录搜索与筛选使用主站的 `icons/catalog.json`，在客户端完成。当前 8 个集合都参与静态构建；开发模式使用本地集合和实时清单更新。

每个图标对应一个 JSON 和一个 SVG。构建按集合检查文件数和单文件字节数，默认上限分别为 20,000 和 25 MiB；Cloudflare 可参考[官方限制](https://developers.cloudflare.com/workers/platform/limits/)。本构建不合并图标文件，也不会自动发布。执行 `bun run deploy:icons --set tabler --dry-run` 可检查单集合；去掉 `--dry-run` 才上传。完整顺序与域名设置见 [部署说明](scripts/icon-builder/DEPLOYMENT.md)。