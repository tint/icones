# 运行时数据接入

组件链路为适配器 → Core，不包含 `@iconify/*`，包括生成的类型声明。数据/SVG 工具已经并入 Core；目录和 manifest 仍隔离在独立子入口。`IconData` 是自有 SVG body/尺寸结构，`ElementData` 是元素元组；本地 `IconSet` 只提供名称、公共尺寸和简单别名继承，不处理第三方目录元数据。数据必须来自可信来源，这些接口不负责净化 SVG。

各框架适配器的默认加载器使用 Icones 自有静态服务：`<set>:<name>` 映射为 `https://<set>.icones.go-slim.dev/data/<name>.json`。本地 sources、显式 per-icon loader 和 Vite 构建产物仍然优先；用户显式设置的 `api` 会替换默认服务，`api: false` 可以完全关闭网络回退。

## 默认静态服务：不需要配置或 SDK

```tsx
<Icon name="tabler:star" />
// GET https://tabler.icones.go-slim.dev/data/star.json
```

默认只接受明确的 `set:name`，不会猜测裸名称，也不会转发 provider 名称。响应是单图标 tuple JSON，CSR 获取后内联渲染；SSR 可通过 controller、Astro 或每请求 store 预加载。`createIconesIconLoader` 可以复用该协议并覆盖 `fetch`、请求头或域名：

```ts
import { createIconesIconLoader } from "@icones/core"

const loader = createIconesIconLoader({
  domain: "icones.go-slim.dev",
  requestInit: { cache: "force-cache" },
})
```

## 自建静态资源

```ts
import { createStaticIconLoader, createIconStore } from "@icones/core"

const store = createIconStore({
  api: createStaticIconLoader("/icons"),
})
await store.preload(["tabler:star"])
// GET /icons/tabler/data/star.json
```

也可以直接将 `createStaticIconLoader("/icons")` 传给 `IconConfig.api` 或 `createIconScope({ api })`，覆盖默认服务。所有适配器都重新导出这两个助手。自定义 `fetch`、请求头和取消信号均受支持；SSR 自建服务使用绝对 base URL、每请求创建 store，并通过框架安全传递 `store.snapshot()` 给客户端的 `initialData`。

`createIconApiLoader({ baseUrl })` 保留已有 `/<set>.json?icons=<name>` 集合接口协议；显式选项省略 baseUrl 时使用本地 `/icons`，不会使用公共 API。静态托管请选择 `createStaticIconLoader` 或自定义 `url`，不要把集合接口当成静态文件地址。

## 自定义服务：注入函数

```ts
import { createIconApiLoader, createIconStore, type Data } from "@icones/core"

const store = createIconStore({
  api: createIconApiLoader({
    url: (name) => `/my-api/icons/${encodeURIComponent(name)}`,
    transform: (json) => (json as { artwork: Data }).artwork,
  }),
})
```

`transform(json, name)` 可以是异步函数。也可直接提供 `api: async (name, parsed, request) => data`，或者用 `sources` 回调加载本地模块；返回单个 `IconData` / tuple，找不到时返回 `null`。将 `request?.signal` 传入自定义 fetch，才能取消过期请求。通用 API 助手会处理 HTTP 错误、404 和取消信号，store 统一处理并发、缓存及 SSR 快照。

## 确实需要 Iconify 时：由应用选择

优先在 `scripts/icon-builder` 或 `@icones/vite` 中将上游格式转换为 tuple，运行时只消费生成资源。若应用确实需要 SDK 的额外解析能力，由应用自行安装并在函数边界内适配：

```ts
import { createIconStore } from "@icones/core"
// 可选的应用依赖；不是 Core 或适配器的依赖。
import { getIconData, quicklyValidateIconSet } from "@iconify/utils"

const store = createIconStore({
  api: {
    url: (_name, parsed) =>
      `https://api.iconify.design/${encodeURIComponent(parsed!.prefix)}.json?icons=${encodeURIComponent(parsed!.name)}`,
    transform: (json, name) => {
      const set = quicklyValidateIconSet(json)
      return set
        ? getIconData(set, name.slice(name.lastIndexOf(":") + 1))
        : null
    },
  },
})
```

此示例只用于明确的 `set:name`。裸名称、provider 或其他服务协议请自行实现 `url`/加载器。如果只需要基础单图标/集合响应，显式设置该服务的 baseUrl 即可，不必安装 SDK。

迁移注意：原 `createIconifyApiLoader` 与 `IconifyApiLoaderOptions` 已移除；改用通用助手或应用回调（请求选项类型为 `IconRequestOptions`）。Vite 的 `fallbackToApi` / `apiBaseUrl` 现在只用于 dev/build，不再决定 CSR/SSR 网络回退。