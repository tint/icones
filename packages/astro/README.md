# @icones/astro

Astro 7+ 的原生服务端图标组件，不向客户端发送框架运行时。

```astro
---
import { Icon, createIconConfig } from "@icones/astro"

const scope = createIconConfig({
  defaultSize: "lg",
})
---
<Icon name="tabler:star" {scope} aria-label="收藏" />
<Icon name="tabler:heart" {scope} size={32} />
```

未配置 `api` 时，明确的 `set:name` 会从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。Vite 静态收集和本地 `sources` 优先；使用 `api: false` 可关闭网络回退，也可通过 `api` 覆盖为自建数据或 symbol 服务。

也可从 `@icones/astro/Icon.astro` 默认导入组件。支持内联 `data`、`icon`、备用图标、尺寸、线宽、旋转、镜像和 SVG 属性。`fallback` 接受字符串。

Astro 没有客户端 Provider。使用显式 `scope` 在同一请求内共享缓存；`config` 可为单个 Icon 创建覆盖配置。不要将含用户专属来源的 scope 放在模块级全局变量中。

与交互式框架不同，Astro 会等待异步图标加载后再输出 HTML；加载失败或未找到时渲染 fallback，未提供 fallback 时保留空 SVG 和状态属性。服务端 Fetch API 需要绝对地址，离线渲染请使用本地数据或 Vite 静态提取。此组件不需要 `client:*` 指令；动态客户端交互请使用对应框架的 Icon 组件。

开发：`bun run --cwd packages/astro play`。测试：`bun run --cwd packages/astro test`，会构建示例并校验输出 HTML。完整 API 见[项目文档](../../README.md)。