# @icones/vite/server

Vite 包内部的 Node/Bun 文件仓库、manifest 文件更新和 HTTP 资源服务。插件使用内部模块；app 本地预览和 icon-builder 通过此子入口复用开发/构建能力。MCP 独立实现只读文件索引，不导入此入口。它不是页面 SSR 渲染器，也不负责托管官网页面。

- 此子入口提供 `createIconRepository`、`createIconDataHandler` 和 `updateIconManifest`。
- 内部 `repository.ts` 负责索引与读取；`manifest.ts` 负责串行、原子化的文件更新；`handler.ts` 负责 HTTP 路由。
- manifest 校验、创建和序列化从 `@icones/core/manifest` 导入；上游别名由构建工具通过 `updateIconManifest` 的 `create` 选项注入。
- 记录的 `variant` 是分类键，`variantAlias` 是上游显示名称；catalog 样式 facet 返回 `{ id, count, alias? }`，不会按 alias 排序。命名空间 `aliases` 与样式 `variantAliases` 分开处理。
- JSON 校验和 SVG 序列化来自 Core 的无状态子入口；不导入 Core 的组件注册表、store 或 controller，也不初始化 Vite 插件或 XML 解析器。
- `repository.catalog()` 返回无 HTTP 版本字段的通用结果，不规定网站页大小或样式顺序。app 通过仓库的 `catalog` 选项注入自己的展示策略；HTTP handler 包装自己的版本字段与请求限制。
- 无 manifest 的旧扁平文件不猜测上游样式；Vite 提取可通过 `legacyVariant` 回调注入兼容规则。

仅从 Node/Bun 服务端或构建代码导入。纯静态部署只需发布 icon-builder 生成的 `dist/client/`，不需要运行此包或 Worker。

## 服务端仓库缓存

```ts
import {
  createIconDataHandler,
  createIconRepository,
} from "@icones/vite/server"

const repository = createIconRepository("./icons", {
  maxEntries: 128,
  maxQueries: 32,
})
const handler = createIconDataHandler({ repository })
```

这两个选项属于文件仓库，与组件运行时 store 容量相互独立，要求非负安全整数；设为 `0` 关闭相应结果缓存。

- `maxEntries`：已解析图标内容的 LRU 容量，默认 128。同一文件的并发读取合并；每次读取仍检查文件的大小、纳秒级修改/变更时间和 inode，检测到修改或替换会重新解析。损坏、删除的文件仍报错，不回退到旧内容。
- `maxQueries`：筛选结果的 LRU 容量，默认 32。元数据每个索引版本只排序一次，同一搜索和筛选条件的分页复用结果；返回页面是独立副本，不会因调用方修改而污染缓存。
- `read` / `get` 返回共享、深度冻结的只读 `ElementData`。需要修改时先用 `structuredClone(data)` 复制。
- 新增记录使用 `add(record)`；目录外部新增、删除或调整分类后调用 `await repository.refresh()`。刷新合并并发调用，原子替换完整索引并清空缓存，旧的进行中读取不会回填刷新后的内容缓存。已有文件的内容修改不需要刷新。

`records` / `files` 用于查询和遍历，不要直接修改 Map 或其中的记录，否则无法触发目录缓存失效。缓存上限控制条目数量，不是字节数；所有元数据仍保留在服务端索引中，不发送客户端 manifest。

执行 `bun run benchmark:packages` 可在当前数据集上复现本机性能测试。