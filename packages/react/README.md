# @icones/react

基于 `@icones/core` 的 React 图标组件。支持直接数据、命名来源、异步加载、SVG/symbol、嵌套配置和 SSR。

```sh
npm install @icones/react
```

```tsx
import { Icon, IconConfig } from "@icones/react"

export function Example() {
  return (
    <IconConfig defaultSize="lg">
      <Icon name="tabler:search" aria-label="Search" />
      <Icon name="tabler:star" altName="tabler:star-filled" showAlt />
    </IconConfig>
  )
}
```

未配置 `api` 时，明确的 `set:name` 会从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。Vite 静态收集和本地 `sources` 优先；使用 `api={false}` 可关闭网络回退，也可通过 `api` 覆盖为自建数据或 symbol 服务。

通过 `IconConfig.sources` 注册无前缀名称；`Icon data={...}` 可直接渲染单个 Iconify 对象或元素元组。此包重新导出核心加载器、注册表和 store API。

主图标使用 `name` 或 `data`，备选图标使用 `altName` 或 `altData`，通过 `showAlt` 切换。例如 `<Icon data={primary} altData={alternative} showAlt={selected} />`，也可在两组中分别使用名称和数据。每组只传一种来源；同组同时传入会输出 `console.error`，并优先使用 `data` / `altData`。错误提示按实例和冲突组去重，冲突解除后重新出现会再次提示。备选图标加载失败不会自动回退主图标。

图标来源选择、默认外观及 SVG 渲染复用 `@icones/core`，与其他框架适配器保持一致。React 层负责 hooks、原生 SVG 属性、事件、ref 和 React 节点 fallback；自定义尺寸的模块扩展仍由 `@icones/react` 定义。仅更新原生属性或用户 style 时复用渲染结果，SVG body 未变化时保留内部 DOM。

`defaultSize`、`sizeValues`、`strokeWidth`、`absoluteStrokeWidth` 和 `api` 都支持单个共享配置，也支持按图标集配置。沿用已有图标加载配置，例如：

```tsx
<IconConfig
  defaultSize={{ tabler: "lg", default: "md" }}
  sizeValues={{ tabler: { lg: 28 }, default: { xl: 32 } }}
  strokeWidth={{ tabler: 2, default: 1.5 }}
  absoluteStrokeWidth={{ tabler: true, default: false }}
>
  <Icon name="tabler:star" /> {/* 28px，固定 2px 描边 */}
  <Icon name="lucide:star" /> {/* 20px */}
  <Icon name="tabler:heart" size={32} /> {/* 32px，单个图标优先 */}
</IconConfig>
```

映射键为 set 前缀，值支持命名尺寸、数值或 CSS 长度。未匹配时使用 `default`，未配置兜底时继承父级或使用内置 `md`（20px）。嵌套映射按键合并；子级传入单值会替换整个尺寸映射。匿名 JSON/元组使用兜底尺寸；图标集通过 `sources` 注册，再按名称中的 set 匹配，备用图标按当前显示的来源匹配。`data` / `altData` 不接受整个图标集或名称字符串。

`sizeValues` 在各 set 内按预设名称合并，并回退到共享预设和内置预设；原有的 `sizeValues={{ lg: 28 }}` 写法仍然有效。`api` 可写成 `api={{ tabler: { type: "fetch", baseUrl: "/icons" }, flag: { type: "symbol", baseUrl: "/icons" }, default: false }}`，分别选择加载方式。

支持通过模块扩展添加或禁用尺寸预设（同样适用于尺寸映射中的值）：

```ts
declare module "@icones/react" {
  interface CustomSize {
    "2xl": true
    xs: false
  }
}
```

然后使用 `<IconConfig sizeValues={{ "2xl": 32 }}>` 配置新增尺寸的值。

完整用法、静态收集和 SSR 示例见 [React 使用指南](https://icones.go-slim.dev/guide/react/getting-started)。