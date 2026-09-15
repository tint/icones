# Core 源码分组

按用途组织实现，不按 CSR/SSR 拆成两套引擎。数据处理与渲染是两端共用的；订阅、预加载和销毁时机由框架适配器决定。

```text
src/
├── index.ts              # 现有根入口，保持兼容导出
├── data/                 # 运行环境无关的数据结构与校验
│   ├── element-types.ts  # SVG 元素元组类型
│   ├── elements.ts       # 元组校验及已有转换转导出
│   └── icon-data.ts      # IconData/IconSet 结构、校验与集合继承
├── svg/                  # 不依赖 DOM 的 SVG 工具
│   ├── attributes.ts     # SVG 与 React 风格属性名映射
│   ├── data.ts           # tuple 序列化、SVG body 变换及 symbol 包装
│   ├── index.ts          # ID/描边改写与现有命名 Flag 视口兼容
│   └── view-box.ts       # 通用 viewBox 解析
├── options/              # 配置类型与纯配置算法
│   ├── sizes.ts          # CSS 尺寸及命名尺寸类型
│   └── set-options.ts    # 按集合取值、合并与 default 回退
├── runtime/              # CSR/SSR 共用的组件引擎
│   ├── types.ts          # 输入、加载状态、名称与运行时数据类型
│   ├── sources.ts        # 名称解析和加载结果归一化
│   ├── loaders.ts        # 用户可选的 fetch/函数加载器
│   ├── symbol.ts         # symbol URL 与视口解析
│   ├── store.ts          # 状态、缓存、请求、取消与 SSR 快照
│   ├── registry.ts       # 显式注册及默认共享 store
│   ├── compiled.ts       # 构建产物的注册与查询契约
│   ├── controller.ts     # scope、来源选择、订阅与生命周期
│   └── presentation.ts   # 配置应用和最终 SVG 渲染结果
└── resources/            # 目录、构建和资源服务共用的纯数据工具
    ├── types.ts          # manifest、来源、目录条目与查询协议类型
    ├── manifest.ts       # 校验、展开、更新和稳定序列化
    ├── catalog.ts        # 筛选、facet、分页与查询索引
    └── slug.ts           # 资源导入与分类命名用的 ASCII slug
```

## 依赖边界

- `data`、`svg`、`options` 不依赖组件状态、资源目录、框架、Node I/O 或 Iconify。
- `runtime` 可以使用上述基础工具，不导入 `resources`。它既不是网站服务端，也不是 Vite 插件实现。
- `resources` 不导入 `runtime`。网站、Vite、MCP 和生成脚本按子入口使用，不需要初始化组件注册表。
- 文件读写、HTTP、MCP 协议、上游转换与下载分别由 Vite、MCP、app 和构建脚本负责，不能反向进入 Core。
- `@icones/names` 只被 `runtime/types.ts` 用作类型；基础工具与资源生成可以独立读取源码，不依赖先构建组件引擎。

`runtime` 内部并非每个模块都有状态：`sources`、`symbol`、`presentation` 是引擎使用的解析/渲染逻辑；`store`、`registry`、`compiled`、`controller` 管理状态或生命周期。不要因为它们包含纯函数，就把组件协议挪进基础数据目录。

## 公开入口保持不变

目录是内部组织，不是新的包 API。继续使用 `@icones/core/store`、`@icones/core/svg-data`、`@icones/core/manifest` 等原有入口，不导入 `src` 实现路径。

`package.json` 的 `development` / `bun` 条件指向新位置；构建配置使用显式入口名称，仍产出原有的 `dist/store.js`、`dist/svg-data.js`、`dist/manifest.js` 等文件。没有新增根目录转发文件，也没有新增 `@icones/core/resources` 等汇总入口。

## 后续归属评估

这轮只移动实现、调整引用，不移出 Core、不收缩 API，也不改变行为。以下边界保留可见，留待单独处理：

- `resources/slug.ts` 的实际业务消费者只有 Vite 和导入脚本，可优先评估是否还需要作为 Core API。
- `resources/catalog.ts`、`manifest.ts` 被网站、Vite、MCP 或生成器复用，不能只凭“不用于组件渲染”就移入某一个消费者。
- `svg/index.ts` 的命名 Flag 视口属于资源兼容规则；移除前需要让资源或加载结果显式携带尺寸。
- `runtime/compiled.ts` 的 Vite 接入一致性、React 与 controller 的共享逻辑，以及各适配器整体转导出 Core 的 API 范围，都不在本轮目录调整中改变。
- 根入口继续转导出 `slug` 等既有基础工具，但不导出 catalog/manifest；这属于兼容 API，并不意味着组件引擎依赖资源管理。