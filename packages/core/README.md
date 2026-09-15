# @icones/core

框架无关的图标运行时，提供数据校验、SVG 渲染、加载器、缓存、配置作用域和 SSR 快照。浏览器入口不依赖 React、Vue 或 Node 文件系统，也不依赖 `@iconify/*`。

```sh
npm install @icones/core
```

应用通常应安装 `@icones/react`、`@icones/vue` 等框架适配器；需要构建自定义适配器、直接管理 store 或在服务端生成 SVG 时再使用 Core。

```ts
import { createIconStore } from "@icones/core"

const store = createIconStore({
  api: { type: "fetch", baseUrl: "/icons" },
  concurrency: 6,
})

await store.load("tabler:search")
console.log(store.getState("tabler:search"))
```

## 数据来源

框架适配器未配置 `api` 时，明确的 `<set>:<name>` 名称使用 Icones 静态服务 `https://<set>.icones.go-slim.dev/data/<name>.json`。本地 `sources`、显式图标 `loader` 和 Vite 编译结果优先；`api: false` 可以关闭网络回退。直接使用 `createIconStore()` 时不会隐式启用远程服务，需要通过 `api` 明确指定加载方式。静态 JSON、函数加载器、自建服务及 SSR 数据传递见 [运行时数据接入](./RUNTIME.md)。

`IconName`、`IconSetName` 和 `IconNamesBySet` 从轻量的 `@icones/names` 重新导出。Core 不依赖完整图标数据包；名称声明只参与类型检查，不会在运行时加载名称清单或图形。

`data` / `altData` 只接收单个图标对象或元素元组数组，不接收名称字符串或整个 `IconSet`。集合通过 `sources: { tabler: collection }` 注册，再用 `name="tabler:star"` / `altName="tabler:heart"` 选择。每组只应传一种来源；同时传入名称和数据时优先使用数据。

## 公共入口

根入口提供组件适配器需要的配置、渲染、加载状态、store 和请求作用域。基础数据与 SVG 工具也可从 `@icones/core/data`、`@icones/core/elements`、`@icones/core/svg`、`@icones/core/svg-data` 等子入口按需导入，详见 [基础工具](./UTILITIES.md)。目录查询和 manifest 工具使用 `@icones/core/catalog`、`@icones/core/manifest` 与 `@icones/core/resource-types`。

`maxEntries`（默认 512）限制 store 中的 LRU 状态缓存，包括同步来源、symbol 引用、错误状态和 `initialData`。订阅中、请求中的条目不会被淘汰；刚读取的同步快照也会暂时保留，以便组件完成订阅，因此活跃图标较多时可能暂时超过上限，取消订阅或请求结束后会重新收缩。此限制不裁剪调用方提供的 `sources` 数据。

`initialData` 超过容量时只保留最后写入的条目。SSR/hydration 需要保留全部预加载数据时，请让服务端和客户端的 `maxEntries` 至少覆盖本次页面需要的图标数量。

## 内置 viewBox

`iconViewBoxes` 和 `getIconViewBox(name)` 提供三个预设：普通图标默认 `0 0 24 24`，`flag:*-circle` / `flag:*-square` 使用 `0 0 512 512`，其余 `flag:*` 使用 `0 0 640 480`。命名 Flag 的内联、Fetch 和 Symbol 使用同一规则；宽高仍由 `size` 控制，4x3 旗帜按比例居中，不需要额外的缩放组。

直接传入 Data 不根据名称猜测旗帜类型，沿用普通数据渲染。已有数据中的显式画布（例如 Phosphor 的 256×256）及自定义 Symbol API 的 `viewBox` 仍然保留。远程 Flag symbols 保留原始坐标；其他远程 symbols 继续归一化为 24×24。使用自建 Symbol 服务时，应提供与当前运行时画布规则匹配的 Flag symbols。

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

完整的渲染、加载和属性行为见 [Icones 使用指南](https://icones.go-slim.dev/guide/rendering)。