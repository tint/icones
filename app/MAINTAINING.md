# Icones Gallery 维护说明

此文档面向维护图标网站的贡献者。使用图标、框架包或 MCP 的读者请先看 [使用说明](README.md)。

## 目录结构

```text
app/
├── plugins/                    # Vite 插件：数据接口、LLMs 输出、语言资源
├── public/                     # 原样复制的公开静态文件
├── server/                     # 本地静态预览与生产服务
├── src/
│   ├── root.tsx                # React Router 文档、语言 loader 和错误边界
│   ├── entry.client.tsx        # HydratedRouter 客户端入口
│   ├── routes.ts               # 路由声明，页面 URL 与语言前缀
│   ├── app/                    # 应用外壳、Header/Footer、预渲染路径
│   ├── routes/                 # 各页面的路由模块与页面组装
│   ├── features/               # 业务功能：组件、内容、状态与服务就近放置
│   │   ├── catalog/            # 搜索筛选、目录数据、虚拟网格和图标详情
│   │   ├── guide/              # 教程内容、框架示例、侧栏与章节目录
│   │   ├── home/               # 首页交互演示与展示区样式
│   │   ├── licenses/           # 来源、许可原文与许可证弹窗
│   │   ├── llms/               # 文档配置、Markdown 生成与页面说明
│   │   ├── mcp/                # MCP 教程、工具说明与页面说明
│   │   └── packages/           # 安装包说明
│   ├── shared/
│   │   ├── ui/                 # Button、ActionLink、Select 等公共组件
│   │   ├── code/               # 代码块、复制、语法高亮与代码本地化
│   │   ├── content/            # 公共内容类型，不放页面专属文案
│   │   ├── i18n/              # 语言上下文、语言 URL、服务端词典与译文
│   │   ├── icons/             # 全站图标配置与 SVG 导出
│   │   ├── integrations/      # 框架标识、包管理器与通用集成示例
│   │   ├── routing/           # 公开路径、元信息与语言感知的路由封装
│   │   ├── theme/             # 主题状态、初始化脚本与主题菜单
│   │   └── lib/               # 类名合并、滚动锁等小工具
│   ├── styles/                # 全局样式
│   └── assets/                # 随源码维护的静态资源
└── *.config.ts                # 构建与框架配置
```

新增页面时，在 `routes/` 创建路由模块并在 `routes.ts` 注册；页面专属的组件、内容和逻辑放到对应 `features/<功能>/`。只有跨功能复用的能力才进入 `shared/`，共享模块不反向依赖 `features/`、`routes/` 或应用外壳。功能模块也不依赖页面入口，避免循环依赖。

组件专属样式与组件就近放置，例如 `features/home/components/dashboard-showcase.css`；全局样式入口为 `styles/index.css`，格式化器的 Tailwind 配置也指向这里。通过明确的文件导入表达依赖，不建立聚合所有功能的大型 `index.ts`。

`plugins/` 只放构建与开发服务集成。纯 Markdown 生成逻辑位于 `src/features/llms/markdown.ts`，由 Vite 和 MCP 文档生成脚本复用；它不依赖浏览器或 Vite。隔离测试的声明式路由外壳位于网站自身的 `tests/support/app.tsx`，不进入生产源码。目录调整不改变公开页面 URL、数据接口或静态资源地址。

## 页面与导航

使用 React Router Framework Mode 提供独立地址及构建期预渲染，页面模块按需加载。`src/routes.ts` 定义路由，`react-router.config.ts` 的 `ssr: false` 和 `prerender` 输出静态 HTML 与 loader 数据；`src/root.tsx` 提供文档结构和语言 loader，`src/entry.client.tsx` 使用 `HydratedRouter` 接续交互。`tests/support/app.tsx` 仅用于隔离的组件回归测试，不是生产入口。

所有页面共享 Icones 品牌、Icons / Guide / Solutions / Licenses 导航和页脚。Solutions、语言和主题菜单均支持鼠标悬停展开、跨间隙进入、点击切换及 Escape 关闭；悬停不移动键盘焦点，触屏仍使用点击。Logo 返回首页，Icons 导航及 Browse icons 按钮进入独立图标目录页：

Header 使用 `position: sticky; top: 0`，在 768px 及以上显示横向导航，窄屏显示折叠菜单；语言和主题按钮始终可见。展开后焦点进入导航，路由切换、点击外部及 Escape 会关闭菜单。首页顶部保持透明叠加在 Hero 上，滚动后切换为带背景的导航；其它页面始终显示分隔线与背景。`--header-height` 统一为 72px，指南侧栏、目录、图标筛选栏和锚点滚动均为吸顶导航预留空间。

| 地址                  | 页面                                                                               |
| --------------------- | ---------------------------------------------------------------------------------- |
| `/`                   | 首页：介绍、渐变背景、Hero 装饰及入口                                              |
| `/icons`              | Icons：图标目录，保留 URL 搜索与筛选条件                                           |
| `/guide`              | Guide：开发指南与使用示例                                                          |
| `/licenses`           | Licenses：八个图标集的许可原文、来源与分发提示                                     |
| `/solutions/packages` | All Packages：八个工具与框架包的安装和示例，含 MCP Server；不展示 Icons、Core 卡片 |
| `/solutions/llms`     | LLMs：`llms.txt` 文档索引和 `llms-full.txt` 完整指南                               |
| `/solutions/mcp`      | MCP Server：安装、客户端配置与图标使用教程                                         |

MCP 页面提供 `@icones/mcp-server` 的本地 stdio 启动命令、客户端配置、五个只读工具和八个文档 Resources。`get_framework_usage` 按框架、主题及 Vanilla 元素类型读取随包文档；Resources 提供完整指南。文档由 Guide 的 Markdown 生成逻辑在 MCP 构建时打包，运行时不依赖 app/、Vite 或网络，也不提供远程 MCP HTTP 端点。弹窗、Guide 和 Packages 的安装示例支持 npm、pnpm、yarn、bun、deno 并记住选择：dev 和 build 始终展示使用者应用的包安装命令，不使用 workspace:*，不暴露网站构建模式。安装需要使用者能访问提供兼容版本的包仓库。

`/llms.txt` 是精简文档索引，`/llms-full.txt` 包含六种框架的全部 Guide 主题，以及 Vanilla 标准元素和 Web 组件的两套教程。两者是英文 Markdown 纯文本，不依赖页面 JavaScript。`app/src/features/llms/markdown.ts` 复用 Guide 内容生成文档；`app/plugins/llms.ts` 在开发时提供文本响应，在构建时输出静态文件到 `dist/client/`，预览、本地生产服务和 Cloudflare 直接提供这些文件。无需手动维护第二份完整指南。

首页只请求概览统计，不加载图标列表。Icons 页包含搜索、筛选、虚拟列表和详情弹窗，不重复显示 Hero。筛选链接形如 `/icons?set=lucide&q=star`。

Flag 浏览页只展示 `flags` 分类，保留 `circle / 1x1 / 4x3` 切换，不显示分类下拉框。`language` 和 `other` 仅从浏览结果及可见数量中排除，原始 manifest、目录接口和 JSON / SVG 资源保持完整。首页及集合计数使用相同的可见范围；数量通过接口统计，不硬编码。旧的隐藏分类链接会回到对应样式的旗帜列表。

未知页面显示 404 页面；`/icons` 是页面，生产搜索索引为同源 `/icons/catalog.json`，图标数据为 `https://<set>.icones.go-slim.dev/data/<name>.json` 和 `symbols/<name>.svg#icon`。同源 `/icons/<set>/data`、`symbols` 只用于开发和 `build:local`。`/icons/catalog`、`/icons/<set>.json?icons=...` 是开发／本地动态接口，不是纯静态部署接口。浏览器访问 `/icons/` 时，本地服务会重定向到 `/icons` 并保留查询参数。导航支持当前页高亮、键盘操作和浏览器前进/后退。

## 圆角与基础按钮

圆角按元素大小和用途使用 Tailwind 默认尺度，避免同类组件各自选值：

| 元素                                         | 圆角 | 类名          |
| -------------------------------------------- | ---- | ------------- |
| 紧凑控件：32px 复制按钮、包管理器标签        | 6px  | `rounded-md`  |
| 常规控件：按钮、输入框、菜单项、导航项       | 8px  | `rounded-lg`  |
| 菜单面板、代码块、表格、图标网格单元、小卡片 | 12px | `rounded-xl`  |
| 内容卡片、详情弹窗、许可证弹窗               | 16px | `rounded-2xl` |
| 首页大展示区                                 | 24px | `rounded-3xl` |

圆形头像、FAB、开关和胶囊标签保留 `rounded-full`；纯文字链接的焦点区域可使用 `rounded`。嵌套代码块的顶部、底部圆角与外框一致；弹窗滚动区域保留上下留白，避免滚动条端点被圆角裁剪。首页装饰图块可根据尺寸保留较大的圆角。

`Button` 不传 `href` 时渲染原生 `<button>`，默认 `type="button"`；传入字符串 `href` 时渲染原生 `<a>`，支持 `target`、`rel`、`download` 等链接属性。事件和 ref 按元素类型检查，链接不支持 `disabled` 等按钮专属属性。两种模式共享样式，并支持 `className` 覆盖：

```tsx
<Button type="submit" disabled={saving}>保存</Button>
<Button href="/llms.txt" download>下载文档</Button>
<Button href="https://example.com" target="_blank" rel="noopener noreferrer">访问网站</Button>
```

需要客户端路由和语言前缀的站内导航仍使用 `ActionLink` 或路由 `Link`。

通用下拉面板使用 `shared/ui/dropdown.tsx` 的 `Dropdown`。传入 `trigger` 和面板 `children`，通过 `align` 选择 `start / center / end` 对齐，通过 `triggerProps` 和 `panelClassName` 自定义触发器与面板。鼠标悬停由 `openOnHover` 显式启用，不移动焦点；触摸仍使用点击。组件保留原生 `details/summary`，支持原生属性、`onToggle` 和根元素 ref，不强制赋予内容 ARIA menu 语义。触发内容不要再嵌套按钮或链接。

面板间隙用 padding 保持连续悬停区域；焦点在内部时移出鼠标不关闭。焦点离开或外部按下会关闭，Escape 关闭当前面板并返回触发器，嵌套面板逐层处理 Escape。Header 仅负责导航内容及路由切换时通过 ref 关闭面板，通用组件不依赖路由。

## 运行与部署

目录可见性由 `src/features/guide/observe-sections.ts` 中的 `IntersectionObserver` 跟踪，直接使用观察记录，不在滚动时主动读取章节矩形。Header 高度仅初始化读取一次，之后复用 `ResizeObserver` 的尺寸数据；高度不变时不重建观察器，锚点切换也复用同一观察器。兼容模式缓存章节的文档坐标，仅在尺寸变化或折叠状态变化时重新测量。

指南目录按整个章节与可视区域的交集高亮，可以同时标记多个章节；顶部 sticky 导航遮住的区域不计入可见范围。滚动、窗口缩放与内容高度变化均会更新，桌面目录与移动端折叠目录保持同步。视觉高亮使用 `data-visible`，`aria-current` 只标记最上方的可见章节。左侧轨道和连续高亮条使用独立 `div`，通过 CSS subgrid 与目录项共享行高，文字换行时仍保持对齐，不使用链接边框分段绘制。高亮条通过原生 Web Animations API 提供 200ms 的移动和伸缩过渡，快速滚动时从当前视觉位置继续；文字颜色同步过渡，开启 `prefers-reduced-motion` 时停用动画，不增加动画库依赖。

Guide 使用 `aside + article + toc` 三栏文档布局：左侧先显示框架无关的 Rendering fundamentals，再按 Framework、Basics、Advanced 分组，支持六个框架的选择；中间为当前主题的文章、预览和可复制示例；右侧提供章节锚点和滚动高亮。窄屏下侧栏与文章目录可折叠。每个主题有独立地址，例如 `/guide/vue/stroke-width#guide-stroke-width-absolute-stroke`、`/guide/vanilla/standard/icon-config`；中文版添加 `/zh-CN` 前缀，英文不加语言前缀。全部 176 个页面在构建时渲染正文；旧的查询式指南链接仍兼容跳转。图标目录的查询条件在 hydration 后应用，保证首轮渲染与静态 HTML 一致。

「渲染原理」拆分为 `/guide/rendering`（渲染方式与数据来源）、`/guide/loading`（Vite 与 API）、`/guide/prop-support`（属性支持）、`/guide/collections`（图标集差异）。每篇内容位于 `features/guide/rendering/`，由 `rendering.ts` 聚合，译文位于 `shared/i18n/locales/rendering.zh-CN.ts`。通用页面不含框架参数、适配器专属代码或框架面包屑；选择框架会进入该框架概览，翻页只在通用章节内部进行。旧 `/guide/<framework>/rendering` 与 Vanilla 旧路径保留客户端跳转，旧章节锚点迁移到对应子页面。框架教程的相关链接应直接指向合适的通用子页面。SSG 每种语言只生成一套通用章节，LLMs 和 MCP 完整文档只收录一次；MCP 快照将通用内容与框架章节分开存储。Phosphor 仅描述 Regular 和 Fill，筛选参数仍是 outline/filled；组合表第一列可重复，行 key 不能只取第一列。修改内容、路由或示例后，同步中英文、测试和 MCP 快照。

IconConfig 按「基本用法 → 自定义外观 → 配置继承 → 本地数据 → API → 共享存储与 SSR → 配置项参考」组织，不显示步骤式学习路径卡片，不折叠 API 和参考内容。保留旧章节锚点：`shared-defaults` 对应基本用法，`individual-overrides` 对应自定义外观（包含单个图标覆盖）；示例、目录、中英文页面和生成的 LLMs/MCP 文档共用同一内容源。快速开始仍使用循序渐进的步骤教程。

IconConfig 的 `defaultSize`、`sizeValues`、`strokeWidth`、`absoluteStrokeWidth`、`api` 均支持共享值和 set/default 映射。外观示例演示四项按 set 配置，API 章节单独演示 fetch/symbol/false 分流。`sizeValues` 按预设键合并并回退到共享及内置预设；`sources`、`store` 不使用新增映射格式。修改此规则需同步核心解析、React 配置合并、其他适配器、类型测试及中英文说明。

MCP 使用页 `/solutions/mcp` 按六个编号步骤展示包安装、客户端配置、连接验证、图标搜索、图形与许可读取及框架用法。入口指向使用者应用中已安装的 CLI，默认使用随包图标集，自定义目录是可选项。宽屏说明与代码左右排列，窄屏上下排列；代码块不模拟窗口，支持独立复制。教程数据来自 `src/features/mcp/content.ts`，工具参数通过真实 stdio 客户端回归验证。终端命令与 `tools/call` 参数明确区分，页面下方保留连接排查、工具速查和离线文档资源。

图标详情弹窗提供 SVG、React、Vue、Svelte、SolidJS、Astro、Vanilla 和 JSON 八种格式。组件示例有 Compact（简洁）和 Full（完整）两种模式，默认简洁：只输出图标标签，Vanilla 只输出创建图标的调用；完整模式补上导入、框架脚本/模板结构及 Vanilla 挂载代码。两种模式均不包含 IconConfig 或 scope，均与预览同步尺寸、颜色、线宽和旋转；复制内容跟随当前模式，切换时重置代码滚动位置。SVG 和 JSON 保持原格式，不显示模式开关。图标加载沿用应用配置，安装命令可独立复制。

详情还显示原始画布尺寸、导出体积、可复制的 JSON / symbol 地址，以及 各集合的 `manifest.json` 和 `license.txt` 中记录的来源、版本与许可原文。格式标签支持方向键、Home / End 和键盘焦点切换。

代码高亮是可选的浏览器增强：`src/shared/code/syntax-highlighter.ts` 从固定版本的 Shiki CDN 按需加载语法与明暗主题，不添加包依赖，也不在构建时请求 CDN。`HighlightedCode` 在代码块接近可视区域时启用高亮；SSG 和首次 hydration 始终使用原始文本。网络错误、超时、未知语法或过长代码均保留纯文本，复制始终使用原始代码。通用代码块使用深色高亮，安装命令和图标详情跟随页面主题。部署环境若限制外部脚本或 CDN，页面仍可正常阅读和复制，不必为了高亮放宽安全策略。

示例中的注释和可读标签随页面语言切换：在 `codeMessages` 中显式标记完整注释或带引号的 UI 文本，并在 `src/shared/i18n/locales/code.zh-CN.ts` 提供译文。未标记的代码不参与翻译；包名、API 标识、路径、命令、SVG/JSON 数据、MCP 参数和许可原文保持不变。`CodeBlock` 将同一份本地化后的原始代码交给高亮与复制，SSG 与 hydration 使用一致的语言。Guide 的 `code` 仍保留英文源文，LLMs 与 MCP 文档继续输出英文。

从工作区根目录执行 `bun run dev`，需要 Node.js 22.22 或更新版本。`bun run build` 先构建依赖包，再运行 app 构建。依赖就绪后，单独执行 `bun run --cwd app build` 同样生成拆分产物：`react-router.config.ts` 的 `buildEnd` 将网站索引写入 `dist/client/icons/catalog.json`，将各集合图标、manifest、许可证、跨域响应头和独立 Wrangler 配置写入 `dist/icons/<set>/`。`ICONES_BUILD_DIRECTORY` 指定自定义根目录时，分别写入其 `client/` 与 `icons/`，不会清空默认输出目录。

主站静态托管 `dist/client/`，各集合分别托管 `dist/icons/<set>/public/`，不需要 React SSR、Worker 脚本、Vite 或源代码。`dist/server/` 不发布。`bun run --cwd app preview` 提供构建文件，动态画廊依赖已经上线的集合域名。域名未上线时使用根目录 `bun run build:local` 生成全部资源同源的离线产物。发布命令不会由 build 自动执行，详见 [部署说明](../scripts/icon-builder/DEPLOYMENT.md)。

生产默认使用 `https://<set>.icones.go-slim.dev` 读取图标，开发默认同源 `/icons`。`VITE_ICON_COLLECTION_URL` 覆盖每集合根地址模板；`VITE_ICON_DATA_BASE_URL` 指向旧布局的共享资源根地址。搜索索引单独使用 `VITE_ICON_CATALOG_BASE_URL`，默认同源 `/icons`；生产读取 `catalog.json` 后在客户端查询，开发保留实时目录查询。`config/deployment.json` 中排除的集合不进入生产索引或集合选择器，源文件仍保留。

Vite 预览和本地服务支持直接访问或刷新子页面。静态托管应先提供每个目录的 `index.html`，未预渲染的页面请求回退到 `__spa-fallback.html`，不能回退到包含首页正文的根 `index.html`。回退不能覆盖 `/icons/*` 数据或缺失的 `.data`、JS、SVG 等静态资源。`plugins/localized-assets.ts` 只负责语言 JSON 与静态预览回退，不生成页面 HTML。

项目结构、数据协议和完整使用说明见 [根目录 README](../README.md)。