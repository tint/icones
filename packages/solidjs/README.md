# @icones/solidjs

SolidJS 图标组件，支持响应式 props、嵌套配置、异步来源和 SSR。

```sh
npm install @icones/solidjs
```

```tsx
import { createSignal } from "solid-js"
import { Icon, IconConfig } from "@icones/solidjs"

export function Favorite() {
  const [selected, setSelected] = createSignal(false)
  return (
    <IconConfig defaultSize="lg">
      <Icon
        name="tabler:star"
        altName="tabler:heart"
        showAlt={selected()}
        aria-label="收藏"
        onClick={() => setSelected(!selected())}
        fallback={<span>加载中</span>}
      />
    </IconConfig>
  )
}
```

未配置 `api` 时，明确的 `set:name` 会从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。Vite 静态收集和本地 `sources` 优先；使用 `api={false}` 可关闭网络回退，也可通过 `api` 覆盖为自建数据或 symbol 服务。

`IconProvider` 是 `IconConfig` 的别名。`useIconScope()` 返回响应式 accessor，也可以给单个 Icon 显式传入 `scope`。`fallback` 接受 JSX；未提供时保留空 SVG 和 `data-state`。

发布产物包含三种入口：`solid` 条件下使用可再次编译的 JSX，`node` 条件下使用 SSR 版本，默认使用 DOM 版本。使用 `vite-plugin-solid` 的项目会选择 JSX 入口；服务端不会导入浏览器 DOM 实现。

SSR 使用内联数据、静态提取、symbol 或每请求预加载的 store。客户端必须使用相同初始数据进行 hydration。完整配置见 [SolidJS 使用指南](https://icones.go-slim.dev/guide/solidjs/getting-started)。