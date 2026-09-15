# Icones 维护指南

本文件面向仓库维护者。根 README 和 `packages/*/README.md` 面向 Icones 使用者，只说明安装、公开 API 和运行时行为。

## 本地运行

需要 Bun 1.3.5+ 和 Node.js 22.22+：

```sh
bun install
bun run dev
# http://127.0.0.1:5173
```

`dev` 会先构建公开包，再启动画廊。开发页面和图标数据接口由同一个 Vite 服务提供，不需要已部署的集合域名。

常用命令：

```sh
bun run build             # 公开包、网站和集合部署目录
bun run build:local       # 包含完整图标资源的同源离线预览
bun run start             # 提供 dist/client，默认端口 3000
bun run start:mcp         # 启动工作区 MCP stdio 服务
bun run check             # 格式、lint 和类型检查
bun run test              # 全部测试
```

本地预览服务支持 `PORT`、`HOST`、`ICON_DATA_DIR`、`ICON_SYMBOLS_DIR`、`ICON_PREVIEW_DIR` 和 `ICON_API_PATH`。相对路径以仓库根目录为基准。

## 项目边界

| 位置                       | 职责                                           |
| -------------------------- | ---------------------------------------------- |
| `app/`                     | 网站、目录搜索、指南、SSG 和本地静态预览服务   |
| `packages/core/`           | CSR/SSR 共用运行时与无状态数据/SVG 工具        |
| `packages/<framework>/`    | 各框架适配器                                   |
| `packages/vite/`           | Vite 插件、构建转换和开发期资源服务            |
| `packages/mcp-server/`     | MCP 协议和只读文件访问                         |
| `packages/icons/`          | 生成后的纯图标资源                             |
| `packages/names/`          | 生成后的名称声明                               |
| `scripts/icon-builder/`    | 上游下载、转换、名称/symbol 生成和集合静态部署 |
| `scripts/package-builder/` | npm 发布目录、tarball 和依赖版本改写           |
| `scripts/verify/`          | 跨包契约、发布产物消费和静态部署验证           |

Core 与适配器不能反向依赖网站、Vite、MCP、文件 I/O 或 `@iconify/*`。详细边界见 [Packages 维护说明](packages/MAINTAINING.md) 和 [Core 维护说明](packages/core/MAINTAINING.md)。

## 网站构建

画廊使用 React Router Framework Mode，`app/react-router.config.ts` 配置 `ssr: false` 和预渲染路径。英文页面不带语言前缀，简体中文使用 `/zh-CN`。构建输出包括预渲染 HTML、`.data` 文件、客户端资源和 `__spa-fallback.html`，生产环境不需要 React SSR、应用 Worker 或图标 HTTP handler。

```text
dist/
  client/                 # icones.go-slim.dev
    icons/catalog.json
    __spa-fallback.html
    locales/
    assets/
  icons/<set>/            # <set>.icones.go-slim.dev
    wrangler.jsonc
    build-report.json
    public/
      index.html
      data/
      symbols/
      manifest.json
      license.txt
  server/                 # 预渲染中间产物，不部署
```

`ICONES_BUILD_DIRECTORY` 可修改构建根目录。默认生产网站读取同源 `/icons/catalog.json`，再从 `https://<set>.icones.go-slim.dev` 加载集合资源。`VITE_ICON_COLLECTION_URL`、`VITE_ICON_DATA_BASE_URL` 和 `VITE_ICON_CATALOG_BASE_URL` 可以覆盖这些地址。

静态托管必须支持目录 `index.html`。如需覆盖未预渲染的客户端路由，只将页面请求回退到 `__spa-fallback.html`；不能把缺失的 `.data`、JS、JSON 或 SVG 回退为 HTML。

## LLM 文档与 MCP 快照

网站构建会生成全部框架以及单框架的 `llms.txt` / `llms-full.txt`。单框架路径为 `/llms/<framework>/llms.txt`；Vanilla 另外提供 `/llms/vanilla/standard/` 和 `/llms/vanilla/web/`。

MCP Server 将网站指南作为构建时快照内联。修改 Guide 后运行：

```sh
bun run --cwd packages/mcp-server build
bun run --cwd packages/mcp-server check:docs
```

不要手动编辑 `packages/mcp-server/src/generated/documentation.json`。

## npm 发布

`packages/<name>/package.json` 是源码工作区清单，包含 workspace 协议、源码条件和开发脚本，不能直接发布。发布构建会生成没有 workspace 协议和源码入口的最终目录，并按目标包版本改写内部依赖：

```sh
bun run build:release
bun run pack:packages
bun run publish:packages --dry-run
bun run publish:packages --all
```

默认使用各源码包自己的版本，也可以通过 `--version <semver>` 临时统一版本。正式发布前必须完成 dry-run；npm 发布不是事务操作。完整规则和依赖顺序见 [Package Builder](scripts/package-builder/README.md)。

## 图标资源与部署

图标资源和名称声明由私有 icon-builder 维护：

```sh
bun run download:icons --set tabler,lucide --force
bun run download:api --icons tabler:search,tabler:star
bun run generate:symbols
bun run generate:names
bun run check:names
```

`packages/icons/` 只保存 JSON、SVG symbol、manifest 和原始许可证；`packages/names/` 只保存名称声明。不要在这两个公开包中添加生成脚本或手动维护可推导内容。导入规则见 [Icon Builder](scripts/icon-builder/README.md)。

网站和每个集合分别作为纯静态项目部署。先部署资源，再部署引用它们的网站：

```sh
bun run deploy:icons --all --dry-run
bun run deploy:app --dry-run

bun run deploy:icons --all
bun run deploy:app
```

正式命令会修改 Cloudflare 线上状态。集合筛选、限制、域名和验证步骤见 [Cloudflare 静态部署](scripts/icon-builder/DEPLOYMENT.md)。

## 测试

```sh
bun run test:packages
bun run test:app
bun run test:integration
bun run test:frameworks
bun run typecheck
```

包测试跟随实际包，跨包契约和发布产物验证位于 `scripts/verify/`。部分框架浏览器测试需要本机 Chrome。详细归属和单独运行方式见 [测试说明](scripts/verify/README.md)。