# Core 的基础工具

原 utils 的公共工具与类型现由 Core 直接维护，不再需要单独安装工具包。工具子入口不依赖框架、图标数据、文件 I/O 或 XML 解析器，也不加载组件状态。`IconData`、`IconSet` 是自有结构类型，不引用 `@iconify/types`。

- `set-options`：解析按图标集配置的选项，支持 `default` 回退和父子配置合并；只读取对象自身属性。
- `sizes`：根据用户配置推导默认与自定义尺寸名称，提供 CSS 尺寸类型。
- `element-types`：描述 SVG 元素元组及属性，不包含渲染或文件读取逻辑。
- `elements`：校验元素元组、转换 SVG/元组属性名；无需 React 或 DOM，校验结构不等同于过滤不可信 SVG。
- `view-box`：解析四个有限坐标值，要求宽高为正；无效输入返回 `null`，由调用方提供错误信息。
- `slug`：将字符串转成 ASCII slug；空结果由调用方决定是拒绝还是使用默认分类。
- `icon-data`：自有数据类型、结构判别、`readIconData` / `readIconSet` 校验及本地集合继承解析；不解析 SVG 或提供上游服务。
- `svg-data`：tuple → SVG body 的无 DOM 序列化、轻量 `renderSvgData` 视口/旋转/翻转处理，以及 symbol 文档包装。
- `svg`：SVG ID 引用改写与描边字符串处理；CSS 变量由调用方提供。

资源管理工具只通过独立子入口导出，不从 Core 根入口重新导出，组件运行时不导入它们：

- `resource-types`：manifest、来源、目录记录和基础查询结果类型，不带网站 HTTP envelope。
- 样式分类与显示分离：manifest 的 `variantAliases` 展开为记录的 `variantAlias`、样式 facet 的 `alias`。查询和排序只使用 `variant` / `id`；跨集合混合了不同 alias 时不随意选择显示名称。上游映射由 Vite 构建预设提供，Core 不依赖任何具体集合或 Iconify。
- `manifest`：统一校验、条目展开、创建、更新和稳定序列化。无上游名称或内置别名；序列化顺序由调用方显式传入。
- `catalog`：筛选、计数和带缓存的查询索引。默认返回全部匹配项、字母排序且不保留空样式；`defaultLimit`、`maxLimit`、`variantOrder`、`includeEmptyVariants` 由网站或工具配置。`variantOrderBySet` 可覆盖某个集合的排序，避免把不同集合的样式名称混为全局规则；这些顺序只排序已有 facet，不创建不存在的样式。

源码分组见 [源码结构](./src/README.md)：基础类型和校验在 `data/`，SVG 工具在 `svg/`，配置工具在 `options/`，目录与 manifest 在 `resources/`。公开子入口不随内部目录变化。

网站请求客户端与展示策略归 `app/src/features/catalog/`。上游名称映射和内置别名归 Vite tooling 的集合生产预设；开发/构建期文件读写由 Vite 管理，MCP 独立管理只读文件访问，不能将这些依赖反向引入 Core。

对象本身也可作为选项值时，调用方应向选项解析与合并函数传入判别函数，区分共享对象值与按图标集索引的映射。

各模块通过 `@icones/core/<模块名>` 独立导入，发布产物统一为 `.js` 与 `.d.ts`；工作区的 `development` / `bun` 条件仍直接使用源码。已有函数签名、排序策略与 Flag viewBox 等兼容规则不变。旧 `@icones/utils` 导入应改为对应的 Core 入口；没有保留转发包。

根入口继续提供组件运行时和基础数据/SVG 工具。资源工具应明确导入 `@icones/core/catalog`、`@icones/core/manifest` 或 `@icones/core/resource-types`。其中资源来源类型 `IconSource` 与 Core 根入口的图标输入类型同名但含义不同，必须从资源子入口导入。