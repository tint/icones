# @icones/core

框架无关的图标基础层，为 CSR/SSR 组件、Vite 和资源工具提供数据处理、渲染、缓存及加载器。浏览器入口不依赖 React 或 Node 文件系统。

CSR/SSR 的 JS 和类型声明均不依赖 `@iconify/*`。基础 SVG 变换、本地集合解析由自有轻量工具处理；上游格式转换留在 dev/build。未配置 `api` / `sources` / `loader` 时不请求网络，缺失图标保持 missing/fallback；子配置仍会继承应用显式提供的加载器。

静态 JSON、函数加载器和可选第三方接入见 [运行时数据接入](./RUNTIME.md)。

源码按 `data`、`svg`、`options`、`runtime`、`resources` 分组；职责、依赖方向和后续归属评估见 [源码结构](./src/README.md)。这是内部目录调整，现有公开入口与构建产物路径保持不变。

`IconName`、`IconSetName` 和 `IconNamesBySet` 从轻量的 `@icones/names` 重新导出给适配器。Core 不依赖完整图标数据包。`IconName<"tabler">` 可限定到单个集合；`Name` 还允许动态名称和自定义 sources。运行时不加载这份名称清单或图标数据。

`data` / `altData` 只接收单个图标对象或元素元组数组，不接收名称字符串或整个 `IconSet`。集合通过 `sources: { tabler: collection }` 注册，再用 `name="tabler:star"` / `altName="tabler:heart"` 选择。每组同时传入名称和单图标数据仍会输出 `console.error`，并优先使用数据。

```ts
import { createIconStore } from "@icones/core"

const store = createIconStore({
  api: { type: "fetch", baseUrl: "/icons" },
  concurrency: 6,
})
await store.load("tabler:search")
console.log(store.getState("tabler:search"))
```

Core 的根入口负责 SSR/CSR 共用的配置、渲染、加载状态、缓存和请求作用域，以及 tuple 序列化、SVG 字符串处理和基础数据校验。原 utils 实现已合并，原有 Core 导出保持兼容；工具接口见 [基础工具](./UTILITIES.md)。

目录筛选、manifest 校验与序列化只通过 `@icones/core/catalog`、`@icones/core/manifest` 和 `@icones/core/resource-types` 子入口提供，不从运行时根入口导出。MCP、Vite、生成器和网站可以直接使用这些无状态入口，不加载组件注册表、store 或 controller。Core 不反向依赖 Vite、文件仓库或 XML 解析器。

网站目录客户端、分页和样式展示策略归 `app/src/features/catalog/`；开发/构建期文件能力归 [Vite server 子入口](../vite/SERVER.md)，MCP 独立管理只读文件访问；导入、转换与资源生成归 [Vite tooling](../vite/TOOLING.md) 和 `scripts/icon-builder/`。`core/runtime` 只保留构建结果在 CSR/SSR 中需要的注册与解析接口，不包含插件钩子。

官网的本地静态文件托管与 React Router 回退位于 `app/server/`，不属于 Core。维护者仍可从工作区根目录运行 `bun run start`；生产部署只需发布静态产物。

`maxEntries`（默认 512）限制 store 中的 LRU 状态缓存，包括同步来源、symbol 引用、错误状态和 `initialData`。订阅中、请求中的条目不会被淘汰；刚读取的同步快照也会暂时保留，以便组件完成订阅，因此活跃图标较多时可能暂时超过上限，取消订阅或请求结束后会重新收缩。此限制不裁剪调用方提供的 `sources` 数据。

`initialData` 超过容量时只保留最后写入的条目。SSR/hydration 需要保留全部预加载数据时，请让服务端和客户端的 `maxEntries` 至少覆盖本次页面需要的图标数量。

完整用法与数据协议见 [项目文档](../../README.md)。

## 内置 viewBox

`iconViewBoxes` 和 `getIconViewBox(name)` 提供三个预设：普通图标默认 `0 0 24 24`，`flag:*-circle` / `flag:*-square` 使用 `0 0 512 512`，其余 `flag:*` 使用 `0 0 640 480`。命名 Flag 的内联、Fetch 和 Symbol 使用同一规则；宽高仍由 `size` 控制，4x3 旗帜按比例居中，不需要额外的缩放组。

直接传入 Data 不根据名称猜测旗帜类型，沿用普通数据渲染。已有数据中的显式画布（例如 Phosphor 的 256×256）及自定义 Symbol API 的 `viewBox` 仍然保留。远程 Flag symbols 保留原始坐标；其他远程 symbols 继续归一化为 24×24。升级时需同步生成并发布 `icons/flag/symbols/`，避免新运行时配合旧的归一化 Flag 文件。

适配器可以通过 `createIconScope` 管理每应用/每请求配置，通过 `createIconController` 订阅和加载图标，再用纯函数 `renderIcon` 生成 SVG 属性、body 和样式。创建 controller 本身不启动请求；`subscribe` 或 `load` 才触发加载。服务端使用独立 scope；`renderIcon` 的 `instanceId` 必须在同一文档中唯一，hydration 前后保持一致。

## 按图标集配置

```ts
import { createIconScope } from "@icones/core"

const scope = createIconScope({
  defaultSize: { tabler: "lg", default: "md" },
  sizeValues: { tabler: { lg: 28 }, default: { xl: 32 } },
  strokeWidth: { tabler: 2, default: 1.5 },
  absoluteStrokeWidth: { tabler: true, default: false },
  api: {
    tabler: { type: "fetch", baseUrl: "https://icons.example.com/icons" },
    flag: { type: "symbol", baseUrl: "/icons" },
    default: false,
  },
})
```

`defaultSize`、`sizeValues`、`strokeWidth`、`absoluteStrokeWidth` 和 `api` 都支持共享值或 set/default 映射。`sources` 和 `store` 保持原有格式。所有适配器共享同一解析规则：单个图标的显式属性 → 当前 set → `default` → 内置默认值。`default` 是兜底键，不是分类或样式。

尺寸映射值支持命名预设、数值和 CSS 长度。`sizeValues` 支持原有的扁平字典（如 `{ lg: 28 }`），也支持每个 set 下放一个预设字典；解析某个尺寸时，按该 set 的预设 → `default` 中的同名预设 → 内置预设回退。内置值为 xs: 12、sm: 16、md: 20、lg: 24、xl: 28。

子级映射按 set 合并并继承父级兜底。子级单值会替换该选项的整个映射；`sizeValues` 则始终按预设名称合并，扁平字典只更新共享预设，不移除继承的 set 专属预设。仅修改外观不会新建图标 store。匿名 Data 使用兜底值，通过 sources 注册的图标按名称中的 set 匹配，备用图标按当前显示的来源匹配。

`api` 每个 set 可使用 URL 字符串、fetch 选项、symbol 选项、加载函数或 `false`，也可直接传给 `createIconStore({ api })`。覆盖某个 set 会替换该项完整 API 配置，不合并请求参数；共享 API 值（包括 `false`）会替换整个继承映射。`type`、`baseUrl`、`url`、`fetch`、`requestInit`、`transform`、`viewBox` 是 API 选项保留键。`false` 仅禁用回退 API，不禁用本地来源、构建期图标或显式 per-icon loader。示例地址需替换为自己的服务；symbol 使用同源 URL，SSR fetch 使用绝对 URL。