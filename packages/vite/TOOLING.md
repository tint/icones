# 构建与导入工具

`@icones/vite/tooling` 是不初始化 Vite 插件的独立入口，供 icon-builder 等 Node/Bun 工具复用。组件运行时不依赖它。

```ts
import {
  svgToElementData,
  createIconSymbolDocument,
} from "@icones/vite/tooling"

const data = svgToElementData(
  '<svg viewBox="0 0 24 24"><path d="M2 12h20"/></svg>'
)
const symbol = createIconSymbolDocument(data)
```

- `/tooling/elements`：SVG/Iconify 到 tuple 的转换；XML 解析器仅从这个模块进入依赖图。
- `/tooling/symbol`：生成可静态托管的 SVG symbol；不加载 XML 解析器。
- `/tooling/collections`：资源生产预设，包括上游名称映射、内置别名、manifest 的生成顺序和落盘更新。
- 只校验数据时使用 `@icones/core/icon-data` 或 `@icones/core/elements`；不必加载构建工具。

除 Flag 外，所有集合的分类键统一为 `outline` / `solid`，用于 manifest、catalog 筛选和字典序排序。原始类型保存在 `variantAliases` 中，只用于显示。下面的命名规则仅用于导入，读取和筛选始终以 manifest 为准：

| 集合          | `outline` alias  | `solid` alias | 实心名称规则                                                  |
| ------------- | ---------------- | ------------- | ------------------------------------------------------------- |
| Tabler、Brand | `outline`        | `filled`      | `-filled`                                                     |
| Bootstrap     | `outline`        | `fill`        | 名称包含独立的 `fill` 段，如 `star-fill`、`building-fill-add` |
| Ant Design    | `outlined`       | `filled`      | `-filled`                                                     |
| Phosphor      | `regular`        | `fill`        | `-fill`                                                       |
| Lucide        | `outline`        | 当前没有      | —                                                             |
| Huge          | `stroke-rounded` | 当前没有      | —                                                             |

例如 Phosphor 的 manifest 包含 `variantAliases: { outline: "regular", solid: "fill" }`。按钮依次显示 Regular、Fill，但请求始终使用 `variant=outline` / `variant=solid`。`aliases` 字段仍单独用于 hugeicons、circle-flags 等旧命名空间，不能与样式 alias 混用。

Flag 的 `1x1/4x3/circle` 独立表示形状和比例，不混入线框/实心样式。新增集合若使用 `linear` 等名称，应在 `collectionStyles` 中明确增加该集合的 alias 与命名匹配规则，不做跨集合后缀猜测。未配置的集合默认 outline；通用 Core manifest 工具不内置集合规则，Vite 的集合生产入口则拒绝非标准类型。

Ant Design 官方目录的 `outlined/star.svg` 和 `filled/star.svg` 分别生成 `star` / `star-filled`，避免扁平目录同名覆盖。twotone 不导入、不出现在名称声明中。Bootstrap 保留原始名称；未命名为 fill 的图标归入 outline，这是本站分组约定，不表示它一定由 SVG stroke 绘制，也不代表每个图标都有成对的样式。

Phosphor 的 bold/duotone/light/thin 不属于正式资源包，不能被误标为 outline。官方导入只读取 regular/fill；API 全集/分类导入过滤其他字重，显式请求它们时报错。已有的四种旧字重已同步移出资源目录、manifest、names 和静态产物，网站无需额外隐藏或修正计数。

插件根入口负责静态收集、虚拟模块、开发中间件和资源输出。私有 `scripts/icon-builder` 负责下载、上游目录适配、批量名称/资源生成以及网站静态打包，公共插件不得反向依赖这些私有脚本。

symbol 构建当前仍复用 Core 中的 Flag viewBox 兼容规则和组件描边约定，以保持现有产物一致；通用字符串处理与 SVG 包装也由 Core 的无状态子入口提供。向完全由数据驱动的 viewBox 迁移时，需要同时更新资源元数据、生成器和运行时，不能只删除名称分支。