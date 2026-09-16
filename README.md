# Icones

面向 React、Vue、Svelte、SolidJS、Astro 和原生 DOM 的图标组件与静态资源工具。组件共享同一套轻量 Core 运行时，支持类型安全的图标名称、Vite 静态收集、按需远程加载和 SSR。

[在线图标库](https://icones.go-slim.dev) · [使用指南](https://icones.go-slim.dev/guide) · [源码](https://github.com/tint/icones)

## 快速开始

以 React 为例：

```sh
npm install @icones/react
```

```tsx
import { Icon, IconConfig } from "@icones/react"

export function Toolbar() {
  return (
    <IconConfig defaultSize="md" strokeWidth={1.5}>
      <Icon name="tabler:search" aria-label="搜索" />
      <Icon name="brand:github" size={24} />
      <Icon name="tabler:star" altName="tabler:star-filled" showAlt />
    </IconConfig>
  )
}
```

未被本地数据或 Vite 构建结果满足的 `set:name`，默认按需请求 Icones 静态服务。例如 `tabler:star` 对应：

```text
https://tabler.icones.go-slim.dev/data/star.json
```

本地 `sources`、显式 `loader` 和自定义 `api` 的优先级更高；使用 `api={false}` 可以完全关闭网络回退。

## 框架支持

| 环境          | 安装包                                | 指南                                                                                  |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| React         | `npm install @icones/react`           | [React](https://icones.go-slim.dev/guide/react/getting-started)                       |
| Vue           | `npm install @icones/vue`             | [Vue](https://icones.go-slim.dev/guide/vue/getting-started)                           |
| Svelte        | `npm install @icones/svelte`          | [Svelte](https://icones.go-slim.dev/guide/svelte/getting-started)                     |
| SolidJS       | `npm install @icones/solidjs`         | [SolidJS](https://icones.go-slim.dev/guide/solidjs/getting-started)                   |
| Astro         | `npm install @icones/astro`           | [Astro](https://icones.go-slim.dev/guide/astro/getting-started)                       |
| Web Component | `npm install @icones/vanilla`         | [Web Component](https://icones.go-slim.dev/guide/vanilla/web/getting-started)         |
| 普通 DOM      | `npm install @icones/vanilla`         | [Standard Element](https://icones.go-slim.dev/guide/vanilla/standard/getting-started) |
| Vite          | `npm install --save-dev @icones/vite` | [静态收集与加载](https://icones.go-slim.dev/guide/loading)                            |

各适配器使用框架原生组件和生命周期，并共享尺寸、颜色、线宽、旋转、镜像、备用图标、缓存及加载规则。预设尺寸为 `xs=12`、`sm=16`、`md=20`、`lg=24`、`xl=28`，也可以传入数值或 CSS 长度。

当前资源包含 Tabler、Brand、Bootstrap、Ant Design、Phosphor、Lucide、Flag 和 Huge。除 Flag 的形状/比例分类外，其余集合统一使用 `outline` / `solid` 分类，并保留上游样式名称作为显示别名。

## Vite 静态收集

`@icones/vite` 会识别各框架组件和 Vanilla API 中的静态图标名称，默认将所有已收集图标合并为可自动分块的 SVG Sprite：

```sh
npm install --save-dev @icones/vite
```

```ts
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { icones } from "@icones/vite"

export default defineConfig({
  plugins: [react(), icones()],
})
```

静态资源按 `dataDir` → `@icones/icons` → `icons` / `iconSets` → `loadIcon` 或构建期 API 的顺序查找。默认的 `mode: "sprite"` 输出 `<assetsDir>/sprite.svg`，超过 256 KiB 时自动拆分为 `sprite-1.svg`、`sprite-2.svg` 等文件；可通过 `spriteMaxBytes` 调整上限。设置 `spriteGroupBy: "set"` 可改为按图标集输出 `<assetsDir>/<set>/sprite.svg`，超限时在各图标集内继续分块。`mode: "symbol"` 为每个图标输出独立 SVG；`mode: "svg"` 将图标数据写入 JavaScript 并内联渲染。动态表达式默认由运行时加载器处理；已知的完整集合可通过 `import("virtual:icones/set/tabler")` 显式懒加载并注册到 Sprite。`emitData` 可以控制是否额外输出本地或已收集的 JSON。

完整配置见 [`@icones/vite`](packages/vite/README.md)。

## 数据加载与 SSR

使用自己的静态资源时，可将默认服务替换为 `<set>/data/<name>.json` 目录：

```tsx
import { Icon, IconConfig, createStaticIconLoader } from "@icones/react"

export function AppIcon() {
  return (
    <IconConfig api={createStaticIconLoader("/icons")}>
      <Icon name="tabler:star" />
    </IconConfig>
  )
}
```

SSR 应为每个请求创建独立 store、预加载图标，并用框架提供的安全序列化方式将 `store.snapshot()` 传给客户端。Vue、Svelte 和 SolidJS 的服务端渲染不会主动启动网络请求；Astro 组件可以等待异步加载结果。

默认服务、自建静态目录、自定义函数加载器及可选第三方 SDK 接入见 [Core 运行时数据说明](packages/core/RUNTIME.md)。

## 名称类型与原始资源

框架适配器会重新导出图标名称类型，也可以单独安装不包含图形数据的 `@icones/names`：

```sh
npm install --save-dev @icones/names
```

```ts
import type { IconName, IconSetName } from "@icones/names"

const name = "tabler:star" satisfies IconName
const flag = "flag:us-circle" satisfies IconName<"flag">
const set = "huge" satisfies IconSetName
```

需要直接读取 JSON、SVG symbol、manifest 或原始许可证时，安装无运行时依赖的资源包：

```sh
npm install @icones/icons
```

```ts
import star from "@icones/icons/tabler/data/star.json" with { type: "json" }
```

不同图标集遵循各自的许可证。重新分发资源时，应保留 `@icones/icons/<set>/license.txt` 中的原始版权与许可文本。

## MCP

`@icones/mcp-server` 提供只读 stdio MCP 服务，可搜索图标、读取 JSON/SVG、查看许可证和获取框架指南：

```sh
npx --yes @icones/mcp-server
```

它默认读取已安装的 `@icones/icons`，不启动 HTTP 服务。客户端配置和工具列表见 [MCP Server 使用说明](packages/mcp-server/README.md)。

## 公开包

| 包                   | 用途                                           |
| -------------------- | ---------------------------------------------- |
| `@icones/react`      | React 组件与配置上下文                         |
| `@icones/vue`        | Vue 组件、fallback slot 与 SSR                 |
| `@icones/svelte`     | Svelte 5 runes 组件与 Snippet fallback         |
| `@icones/solidjs`    | SolidJS 响应式组件及 DOM/SSR 入口              |
| `@icones/astro`      | Astro 服务端组件                               |
| `@icones/vanilla`    | Web Component、普通元素和手动 DOM API          |
| `@icones/core`       | 框架无关运行时、store、渲染和基础数据/SVG 工具 |
| `@icones/vite`       | Vite 静态收集、资源输出和构建期 tooling        |
| `@icones/names`      | 无运行时数据的图标名称声明                     |
| `@icones/icons`      | 无依赖的 JSON、SVG、manifest 和许可证资源      |
| `@icones/mcp-server` | 本地只读 stdio MCP 服务                        |

## 更多文档

- [渲染与组件属性](https://icones.go-slim.dev/guide/rendering)
- [Vite 和 API 加载](https://icones.go-slim.dev/guide/loading)
- [LLM 文档索引](https://icones.go-slim.dev/llms.txt)
- [各 package 的独立使用说明](packages/)

## 许可证

Icones 自有代码和文档采用 [MIT License](LICENSE)。`@icones/icons` 中的图标作品不因此统一变为 MIT；每个集合仍遵循其目录内 `license.txt` 记录的上游许可证。

仓库开发、测试、发布和静态部署说明见 [维护指南](MAINTAINING.md)。