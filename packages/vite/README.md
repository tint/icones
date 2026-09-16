# @icones/vite

收集 React、Vue、Svelte、SolidJS、Astro 组件和 vanilla API 中字面量名称的 Vite 8 插件，默认将已使用图标合并为可自动分块的 SVG Sprite，也支持独立 symbol 和内联 SVG 输出。

```sh
npm install --save-dev @icones/vite
```

```ts
import { defineConfig } from "vite"
import { icones } from "@icones/vite"

export default defineConfig({
  plugins: [
    icones({
      dataDir: "./icons",
      emitData: false,
      fallbackToApi: false,
    }),
  ],
})
```

将插件放在框架插件之后或之前均可；它通过 Vite 的模块和 HTML 转换阶段收集静态名称。应用仍需安装并使用对应的 `@icones/react`、`@icones/vue` 等运行时适配器。

`mode` 决定静态名称的构建结果：

| `mode`             | 输出                                               | 适用场景                                      |
| ------------------ | -------------------------------------------------- | --------------------------------------------- |
| `"sprite"`（默认） | 一个或多个 Sprite，其中包含所有已收集的 `<symbol>` | 减少文件数量，超出上限时自动分块              |
| `"symbol"`         | 每个已收集图标一个带内容哈希的 SVG 文件            | 需要逐图标缓存或按路由拆分资源                |
| `"svg"`            | 图标数据写入 JavaScript，由组件内联渲染            | 不希望额外请求 SVG，或需要用 CSS 选择内部节点 |

Sprite 只包含构建时实际收集到的静态名称，不会打包整个 `@icones/icons`。默认 `spriteGroupBy: "all"` 将所有图标集合并；设置为 `"set"` 时，每个图标集分别输出 `<assetsDir>/<set>/sprite.svg`。默认上限 `spriteMaxBytes` 为 256 KiB，按生成 SVG 的 UTF-8 原始字节数计算：未超限时输出一个 Sprite，超限时按名称稳定排序并输出 `sprite-1.svg`、`sprite-2.svg` 等文件；按 set 分组时，该限制分别应用于每个图标集。单个超大 symbol 不会被拆开。可设置其他正安全整数，或设为 `false` 关闭大小分块。开发服务器使用相同的分组方式，但不执行大小分块。

Sprite 地址由 Vite 的 `base` 和 `assetsDir` 组成，例如 `/assets/icons/sprite.svg#iconify-…` 或 `/assets/icons/sprite-1.svg#iconify-…`；部署新版本时应让 HTML、JavaScript 与全部 Sprite chunk 同步更新。

### 动态名称与完整图标集

插件不会根据运行时表达式猜测需要哪些图标。如果界面会在一个已知集合中动态切换名称，可以显式导入该集合的虚拟模块：

```ts
const sets = {
  tabler: () => import("virtual:icones/set/tabler"),
  lucide: () => import("virtual:icones/set/lucide"),
}

export const loadIconSet = (selectedSet: keyof typeof sets) =>
  sets[selectedSet]()
```

`virtual:icones/set/<prefix>` 仅支持 `mode: "sprite"`，会优先从 `dataDir`、再从 `@icones/icons` 枚举完整集合，将映射注册到 Core 运行时，并导出 `prefix` 和 `count`。使用字面量动态导入可让 Vite 为每个集合生成独立的懒加载 JavaScript chunk；`spriteGroupBy: "set"` 和 `spriteMaxBytes` 继续决定对应 SVG Sprite 的目录与分块。不要拼接任意用户输入作为导入路径，应像示例一样维护允许集合的静态映射。

在 `vite-env.d.ts` 中加入 `/// <reference types="@icones/vite/client" />` 可获得虚拟模块类型。集合模块加载完成后，可为该区域设置 `IconConfig api={false}`，避免未命中时又回退到逐图标 JSON 请求。

构建转换与资源生产预设可通过独立的 [tooling 入口](./TOOLING.md) 复用；导入该入口不会初始化 Vite 插件。

未显式导入完整集合的动态名称由各适配器配置中的运行时 API 处理。插件不会仅凭动态表达式自动打包完整图标集。可通过 `importSources` 配置额外导出 `Icon` 的 barrel 路径。Vue 支持 `h` 和 `<script setup>`，vanilla 支持 `createIcon` / `mountIcon`；支持导入别名和备用图标，跳过局部同名变量和被覆盖的静态属性。

静态名称的查找顺序为：`dataDir`（默认项目根目录下的 `icons/`）→ `@icones/icons` → `icons` / `iconSets` → `loadIcon` 或构建期 API。`dataDir` 中的同名 JSON 优先，已有文件损坏时会报错，不会静默回退。`@icones/icons` 是插件的构建期依赖，通过包解析定位，不依赖 monorepo 目录结构；包内图标只读、按需提取，保留 manifest 中的类型和命名空间别名，不复制回 `dataDir`，也不会整包进入客户端 JavaScript。自定义加载器存在时由它处理最后一级回退；否则由 `fallbackToApi` 控制是否请求构建期 API。

开发服务器也提供已收集图标的 JSON、合并 Sprite 和独立 symbol URL；目录查询、按名称查询等动态 API 仍仅面向 `dataDir`，不会自动暴露完整的 `@icones/icons` 图标库。

`@iconify/*` 仅用于插件自身的开发/构建转换，不进入组件的 CSR/SSR 产物。`fallbackToApi`、`apiBaseUrl` 只控制构建期提取，与运行时无关。静态收集结果和本地 sources 优先；未收集的动态 `set:name` 默认从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。通过 `IconConfig api={false}` 可关闭网络回退，也可以用 `api` 或 `createStaticIconLoader("/icons")` 替换为应用自己的服务。

完整的构建模式、运行时加载组合与框架示例见 [Vite 和 API 加载指南](https://icones.go-slim.dev/guide/loading)。

推荐入口为 `icones`，配置类型为 `IconesPluginOptions`（也可使用 `Options`）。旧入口 `iconify`、`icons` 和类型 `IconifyPluginOptions` 保留为兼容别名，新代码请使用新名称。

HTML 收集 `<icones-icon>` 的 `name` / `alt-name`，以及 `<i>` 的 `icon-name` / `icon-alt-name`。其他标签、裸 `icon` 和 `data-icon*` 属性不参与收集。`defer` / `icon-defer` 不影响静态提取。

普通元素的属性前缀可通过 `attrPrefixes` 配置，默认 `["icon-"]`。例如运行时 `bindIcons({ attrPrefix: "ui-" })` 对应插件 `icones({ attrPrefixes: ["ui-"] })`，收集 `<i ui-name="tabler:star" ui-alt-name="tabler:heart"></i>`。配置列表替换默认值；使用 `["icon-", "ui-"]` 同时支持两种前缀，`[]` 关闭普通元素收集。前缀必须以小写字母开头、按小写字母/数字及连字符分段，并以 `-` 结尾。插件不会推断应用运行时的 init 配置，Web Component 的无前缀属性保持不变。

Vanilla Web Component 也会静态提取：在 Vite 处理的 HTML 入口中写 `<icones-icon name="tabler:star" alt-name="tabler:heart"></icones-icon>`，应用入口导入 `@icones/vanilla/web-element` 自动注册；也可使用 `<i icon-name="tabler:star"></i>` 并导入 `@icones/vanilla/standard-element`。两个入口可同时使用。插件解析真实 HTML 属性（包括 template 内容），不会把注释、脚本字符串或 SVG 的 data-icon 元数据识别成图标。动态插入 DOM 的名称、JS 中的 HTML 字符串，以及不经过 Vite HTML 转换的服务端模板，仍需运行时 API 或本地 sources。

SSR 构建遵循 Vite 环境的 `build.emitAssets`，并将图标资源登记到 manifest；Astro 可以据此将 Sprite 或独立 symbol 移到最终静态目录。普通双构建 SSR 项目由客户端构建输出资源。

`vite preview` 优先交由 Vite 提供构建目录中的 Sprite、独立 symbol 和 JSON 文件，保留 `base`、HEAD 和 ETag 行为；访问这些产物不需要原始 `dataDir`。分页目录、按名称查询等动态 API 仍读取 `dataDir`，动态 symbol 从 `<set>/symbols/` 读取，缺失资源返回 404。

## 构建资源控制

```ts
icones({
  emitData: "used",
  spriteGroupBy: "set",
  spriteMaxBytes: 256 * 1024,
  concurrency: 8,
  timeout: 15_000,
})
```

`concurrency` 是每个插件实例共享的静态提取并发上限（默认 8），跨模块生效，同名请求合并。`timeout` 是每个任务开始执行后的期限（默认 15 秒），不包含排队时间。两者分别要求正安全整数、1–2,147,483,647 之间的有限毫秒数。

`spriteGroupBy` 和 `spriteMaxBytes` 只控制 `mode: "sprite"` 的分组与生产构建分块，不改变图标收集范围或运行时 API。`spriteGroupBy: "all"` 输出 `sprite.svg` 或编号 chunk；`spriteGroupBy: "set"` 输出 `<set>/sprite.svg`，单个图标集超限后输出 `<set>/sprite-1.svg` 等编号 chunk。大小限制按完整 SVG 文件的原始字节数计算，不是 gzip 后大小。

内置 API 请求会收到 `AbortSignal`。自定义加载器也可以通过第二个参数接收信号，原有单参数加载器保持兼容：

```ts
icones({
  loadIcon: async (name, request) => {
    const response = await fetch(
      `https://icons.example.com/api/${encodeURIComponent(name)}`,
      {
        signal: request?.signal,
      }
    )
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Icon API returned ${response.status}`)
    return response.json()
  },
})
```

构建失败、开发服务器关闭或任务超时会取消相关任务。忽略信号的加载器不会继续阻塞队列，其迟到结果不会进入图标提取流程；但插件无法强制终止加载器自身的副作用，请将信号传给底层请求。已经开始的本地文件写入会完成，不在中途取消，以免留下截断的 JSON。

| `emitData`                | 构建输出的 JSON                                                             |
| ------------------------- | --------------------------------------------------------------------------- |
| `true` / `"all"` / 未设置 | 全部已有 `dataDir` JSON，加上本次收集的包内/新提取 JSON（不输出整个图标包） |
| `"used"`                  | 仅静态收集到的 JSON，不读取未使用图标的内容                                 |
| `false`                   | 不输出 JSON                                                                 |

这不改变 `mode` 对内联 SVG / Sprite / 独立 symbol 的选择，构建资源中不额外输出目录清单。仅从 `icons` / `iconSets` / 加载器 / API 新提取的图标会保存到 `dataDir` 并更新集合的 `manifest.json`，供后续构建复用；读取包内图标不会修改包内资源。`"used"` / `false` 不提供完整动态图标库；动态名称和目录查询仍需配置数据服务。