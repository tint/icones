/** Loaded with the Guide route. Authored code prose uses code.zh-CN.ts; API identifiers stay intact. */
export const guideMessages: Readonly<Record<string, string>> = {
  "Consider an article toolbar: its main actions need 24px icons, while a compact action needs a 16px icon. Set the common value once, then override only the exception. The example demonstrates icon configuration; connect the buttons to your own application actions.":
    "以文章工具栏为例：主要操作使用 24px 图标，紧凑操作使用 16px 图标。先统一设置常用尺寸，再单独处理例外。下面只演示图标配置，按钮的实际行为由你的应用实现。",
  "Create one scope with createIconConfig and pass it to all three icons. The first two inherit defaultSize: 24; the last supplies size: 16. Astro uses explicit scopes rather than a provider component: surrounding HTML does not pass configuration to descendants.":
    "通过 createIconConfig 创建一个作用域，再传给这三个图标。前两个继承 defaultSize: 24，最后一个单独设置 size: 16。Astro 使用显式作用域，而不是 Provider 组件：外围 HTML 不会自动向后代传递配置。",
  "Place IconConfig around the toolbar, not around every Icon. The first two icons inherit defaultSize: 24; the last supplies size: 16. Descendants inside your own components inherit the same settings, so you do not need to forward the configuration through every component.":
    "用一个 IconConfig 包裹整个工具栏，无需为每个 Icon 分别配置。前两个图标继承 defaultSize: 24，最后一个单独设置 size: 16。即使图标封装在你自己的组件中，也会继承这些设置，不必逐层传递配置。",
  "Reuse the same scope for icons that should share defaults. Creating a scope does not change unrelated icons elsewhere on the page.":
    "需要共享默认值的图标复用同一个 scope；创建作用域不会改变页面中其他无关图标。",
  "Put application-wide defaults near the application root, and feature-specific defaults around that feature. IconConfig creates no DOM element; use a div, nav or button for layout and semantics.":
    "全应用默认值放在应用根部附近，功能区域的默认值放在该区域外围。IconConfig 不会创建 DOM 元素；布局和语义仍由 div、nav 或 button 等元素承担。",
  "defaultSize belongs to shared configuration; size belongs to one icon. Removing the explicit size makes that icon inherit the shared value again.":
    "defaultSize 用于共享配置，size 用于单个图标。删除图标上显式设置的 size，它就会恢复继承共享尺寸。",
  "Button text supplies the accessible name; the icons remain decorative. Configuration affects Icones icons, not arbitrary SVG elements or the button’s CSS layout.":
    "按钮文字提供无障碍名称，图标仅作装饰。这里的配置只影响 Icones 图标，不会修改其他 SVG 元素或按钮的 CSS 布局。",
  "The first two buttons contain 24 × 24 icons, and the compact action contains a 16 × 16 icon. Change defaultSize to 20: only the first two change; the explicit 16px override stays the same.":
    "前两个按钮中的图标为 24 × 24，紧凑操作中的图标为 16 × 16。将 defaultSize 改为 20，只有前两个图标会变化；显式设置的 16px 保持不变。",
  "Use named sizes such as sm and lg as design tokens. Change sizeValues once to update all icons using that preset; a numeric size such as 32 does not use the preset dictionary.":
    "用 sm、lg 等命名尺寸统一管理设计规范。修改一次 sizeValues，所有使用该预设的图标都会随之更新；size 为 32 等数值时，不会查询预设字典。",
  "A normalized strokeWidth of 1.5 renders at 1.5px on a 24px icon and scales with its size. absoluteStrokeWidth keeps the rendered stroke fixed when the icon has a numeric pixel size; it does not change filled artwork.":
    "归一化 strokeWidth 为 1.5 时，24px 图标的实际描边为 1.5px，并随图标尺寸缩放。图标使用数值像素尺寸时，absoluteStrokeWidth 可固定实际描边粗细；它不会改变填充图形。",
  "Keep color on the icon or inherit it from CSS currentColor. IconConfig has no shared color or fill option. A per-icon strokeWidth or absoluteStrokeWidth overrides the corresponding scope setting.":
    "颜色在图标上设置，或通过 CSS currentColor 继承。IconConfig 没有共享 color 或 fill 选项。图标单独设置的 strokeWidth、absoluteStrokeWidth 会覆盖对应的作用域设置。",
  "Icon in this example": "示例图标",
  "Resolved size": "最终尺寸",
  "Rendered stroke": "实际描边",
  "tabler:star": "tabler:star",
  "lucide:star": "lucide:star",
  "tabler:heart": "tabler:heart",
  "28px — Tabler’s lg preset": "28px — Tabler 的 lg 预设",
  "2px — fixed": "2px — 固定粗细",
  "20px — default md preset": "20px — 兜底 md 预设",
  "1.25px — 1.5 × 20 / 24": "1.25px — 1.5 × 20 / 24",
  "32px — explicit size": "32px — 图标单独设置的尺寸",
  "Child defaultSize": "子级 defaultSize",
  "With parent { tabler: 28, default: 20 }":
    "父级为 { tabler: 28, default: 20 } 时的结果",
  "Not set": "未设置",
  "Tabler: 28px; other sets: 20px": "Tabler 为 28px；其他图标集为 20px",
  "{ tabler: 16 }": "{ tabler: 16 }",
  "Tabler: 16px; other sets inherit 20px":
    "Tabler 为 16px；其他图标集继承 20px",
  "{ default: 16 }": "{ default: 16 }",
  "Tabler still inherits 28px; other sets: 16px":
    "Tabler 仍继承 28px；其他图标集为 16px",
  "All sets: 16px; replaces the inherited size map":
    "所有图标集均为 16px；替换继承的整个尺寸映射",
  "Choose the smallest registration that fits your use case. A full name registers one icon; a set prefix registers an Iconify collection. Do not pass a collection to data or altData: those properties accept one icon only. The second example shows the collection format without requiring another package.":
    "根据需求选择合适的注册方式：完整名称对应单个图标，图标集前缀对应一个 Iconify 图标集。不要将整个图标集传给 data 或 altData，它们只接受单个图标。第二段示例展示了图标集的数据格式，无需安装其他包。",
  "Source form": "来源形式",
  "When to use it": "适用场景",
  'sources: { "app:check": data }': 'sources: { "app:check": data }',
  "sources: { app: collection }": "sources: { app: collection }",
  'sources: { "app:check": async () => data }':
    'sources: { "app:check": async () => data }',
  "A few application icons, available immediately":
    "少量应用图标，注册后即可使用",
  "Several named icons from one Iconify collection":
    "同一个 Iconify 图标集中的多个命名图标",
  "Load one icon lazily when its runtime name is requested":
    "运行时请求该名称时，再延迟加载对应图标",
  "Inline a single icon without looking up a name":
    "直接传入单个图标，无需按名称查找",
  "Core has no Iconify package dependency. Without an api override, unresolved set:name icons load from https://<set>.icones.go-slim.dev/data/<name>.json. Local sources and Vite output take priority. Set api: false to disable network fallback; Vite fallbackToApi controls build-time extraction only.":
    "Core 不依赖 Iconify 包。没有覆盖 api 时，未解析的 set:name 图标从 https://<set>.icones.go-slim.dev/data/<name>.json 加载。本地 sources 和 Vite 产物优先；设置 api: false 可关闭网络回退，Vite 的 fallbackToApi 只控制构建期提取。",
  "If your service serves one JSON file per icon instead of the collection endpoint, provide api.url. The third example requests /icon-data/tabler%3Astar.json; return a single icon object or tuple array. For a custom response envelope, use transform to extract supported icon data. Keep server secrets out of browser configuration.":
    "如果服务按图标提供独立 JSON 文件，而非图标集接口，可通过 api.url 自定义请求地址。第三段示例会请求 /icon-data/tabler%3Astar.json，接口应返回单个图标对象或元组数组。若响应外层另有包装，可用 transform 提取受支持的图标数据。不要将服务端密钥写入浏览器配置。",
  "preparePageIcons below returns both the request’s store and its serializable data. Render the page with that same store; creating a second store would discard the preload. Transfer initialData through your framework’s escaped data mechanism, then call createAppIconStore(initialData) once for the browser application before hydration.":
    "下方 preparePageIcons 同时返回当前请求的 store 和可序列化数据。页面渲染必须复用这个 store，另建一个会丢失预加载结果。通过框架提供的安全转义机制传输 initialData，再在水合前为浏览器应用调用一次 createAppIconStore(initialData)。",
  "For a client-only application, create the store at its bootstrap boundary. In React, a lazy useState initializer also keeps one store per mounted root. Do not call createIconStore in every render or share a mutable server store between requests.":
    "纯客户端应用可在启动时创建 store。React 也可以使用 useState 的惰性初始化，让每个挂载根节点持有稳定实例。不要在每次渲染时调用 createIconStore，也不要让不同服务端请求共享可变 store。",
  "preload resolves after attempting every requested name; it is not a guarantee that every icon exists. Inspect getState(name).status when an icon is required. snapshot includes loaded data, not failed requests or external symbol references.":
    "preload 会在所有名称尝试加载后结束，但不保证每个图标都存在。对于必须显示的图标，请检查 getState(name).status。snapshot 只包含已加载的数据，不包含失败请求或外部 symbol 引用。",
  "Concurrent requests for the same name share work within one store. maxEntries limits cached entries, concurrency limits active loads, and timeout is in milliseconds. Use store.retry(name) after a failure; getState alone never starts a request.":
    "同一个 store 会合并同名图标的并发加载。maxEntries 控制缓存条目数，concurrency 控制同时加载的数量，timeout 的单位为毫秒。失败后可调用 store.retry(name) 重试；单独调用 getState 不会发起请求。",
  'For example, await preparePageIcons(["tabler:star", "tabler:heart"]) in the request handler. Do not interpolate JSON.stringify(initialData) directly into an HTML script: use your framework’s safe serialization. Astro can render the loaded SVG without creating a browser store; Vanilla initialization enhances HTML in the browser, not on the server.':
    '例如，在请求处理函数中调用 await preparePageIcons(["tabler:star", "tabler:heart"])。不要将 JSON.stringify(initialData) 直接拼接进 HTML script，请使用框架的安全序列化机制。Astro 可直接渲染已加载的 SVG，无需创建浏览器 store；Vanilla 则是在浏览器中增强 HTML，不会在服务端初始化 DOM。',
  "Troubleshooting configuration": "配置问题排查",
  "Check appearance and data loading separately. A valid size configuration cannot make missing artwork appear, and changing an API does not change artwork already embedded by Vite. For runtime names, inspect the store you actually passed to the icons.":
    "将外观与数据加载分开排查：尺寸配置正确，不代表图形数据已经就绪；修改 API，也不会改变 Vite 已内嵌的图形。对于运行时名称，请检查实际传给图标的那个 store。",
  Symptom: "现象",
  "What to check": "检查方法",
  "Changing defaultSize has no effect": "修改 defaultSize 后没有变化",
  "Remove the icon’s explicit size, then check the nearest child scope and the matching set entry. default does not override an inherited matching set.":
    "先移除图标显式设置的 size，再检查最近的子作用域和匹配的图标集配置。default 不会覆盖从父级继承的匹配图标集设置。",
  "Per-set settings do not affect inline data": "按图标集配置对内联数据不生效",
  "Anonymous data uses default. Register the data under a full name in sources and render that name when set-specific defaults are needed.":
    "匿名数据使用 default。需要按图标集应用默认值时，请在 sources 中用完整名称注册数据，再通过该名称渲染。",
  "Changing strokeWidth has no effect": "修改 strokeWidth 后没有变化",
  "Confirm the artwork uses SVG strokes rather than filled paths. absoluteStrokeWidth needs a numeric pixel size to keep its rendered thickness fixed.":
    "确认图形使用 SVG 描边，而不是填充路径。absoluteStrokeWidth 需要配合数值像素尺寸，才能固定实际描边粗细。",
  "An icon is blank": "图标没有显示",
  "Check the exact set:name, registered sources and network response. missing means no data was found; error indicates a loader failure. A referenced symbol still depends on the browser loading a valid same-origin SVG URL.":
    "检查完整 set:name、已注册的 sources 和接口响应。missing 表示未找到数据，error 表示加载失败。symbol 的 referenced 状态仍依赖浏览器成功加载有效的同源 SVG 地址。",
  "Changing sources or api has no effect": "修改 sources 或 api 后没有变化",
  "If you supplied store, configure loading on that store. If Vite embedded the name, change the build-time data or use a runtime name for this example.":
    "传入了 store 时，应在该 store 上配置加载方式。如果该名称已被 Vite 内嵌，请修改构建时数据，或在此示例中改用运行时名称。",
  "Requests repeat or SSR icons disappear": "重复请求，或 SSR 图标消失",
  "Keep the store stable, preload into the store used to render, and restore its initialData before hydration. Do not recreate the store inside every render.":
    "保持 store 稳定，在实际用于渲染的 store 中预加载，并在水合前恢复 initialData。不要在每次渲染时重新创建 store。",
  "Set shared defaults for your icons, customize their appearance, then choose local sources, an API or a shared store.":
    "为图标设置共享默认值、自定义外观，再按需配置本地数据、API 或共享存储。",
  "Basic usage": "基本用法",
  "Configuration is optional. Without custom settings, icons use the built-in md size (20px) and a stroke width of 1.5. Add shared configuration when several icons should use the same defaults.":
    "共享配置是可选的。没有自定义设置时，图标使用内置 md 尺寸（20px）和 1.5 的描边宽度。需要让多个图标使用相同的默认值时，再添加共享配置。",
  "Wrap a group of icons in IconConfig and set defaultSize. Both icons below inherit 24px. IconConfig adds no HTML wrapper; use size on an individual Icon when it needs a different value.":
    "用 IconConfig 包裹一组图标，并设置 defaultSize。下方两个图标都会继承 24px。IconConfig 不会添加 HTML 包装元素；某个图标需要不同尺寸时，在该 Icon 上设置 size 即可。",
  "Keep your existing loading setup. With Vite, include tabler/data/star.json and tabler/data/heart.json in dataDir for these examples. Shared appearance settings do not load artwork.":
    "保留现有的图标加载方式。使用 Vite 时，请在 dataDir 中准备示例所需的 tabler/data/star.json 和 tabler/data/heart.json。共享外观配置不会加载图标数据。",
  "Customize appearance": "自定义外观",
  "Use sizeValues to customize named size presets, defaultSize to choose a shared size or a size for each set, and strokeWidth to set the outline weight. Omitted settings keep their inherited defaults.":
    "用 sizeValues 自定义命名尺寸，用 defaultSize 设置统一尺寸或按图标集指定尺寸，用 strokeWidth 调整描边宽度。未设置的选项继续继承默认值。",
  "In this example, Tabler uses lg at 28px and a fixed 2px stroke; other sets use md at 20px and a normalized stroke width of 1.5. The heart uses an explicit size of 32, overriding its set’s default size.":
    "此例中，Tabler 使用 28px 的 lg 尺寸和固定 2px 描边；其他图标集使用 20px 的 md 尺寸和归一化宽度为 1.5 的描边。心形图标单独设置 size 为 32，覆盖所属图标集的默认尺寸。",
  "The Tabler star is 28px, the Lucide star is 20px and the heart is 32px. With Vite, also add lucide/data/star.json to dataDir. strokeWidth affects SVG strokes, not outlines drawn with filled paths.":
    "Tabler 星形为 28px，Lucide 星形为 20px，心形为 32px。使用 Vite 时，还需将 lucide/data/star.json 放入 dataDir。strokeWidth 只影响 SVG 描边，不影响由填充路径绘制的轮廓。",
  "Configuration inheritance": "配置继承",
  "Use a child configuration when one part of the interface needs different defaults. Here the page uses 24px icons and the toolbar uses 16px. These examples are independent of the custom presets above.":
    "界面中的某个区域需要不同默认值时，可以添加子配置。此例中页面图标为 24px，工具栏图标为 16px，不依赖上文的自定义预设。",
  "Explicit icon properties win over scope defaults. Child maps merge by set and inherit the parent fallback; a child shared size, stroke width or boolean replaces that option’s whole map. sizeValues merges preset keys within each set; a flat dictionary updates shared presets without removing inherited set overrides. Appearance-only scopes share the parent’s store.":
    "图标自身的属性优先于作用域默认值。子级映射按图标集合并，并继承父级兜底值；子级传入统一尺寸、描边宽度或布尔值时，会替换该选项的整个映射。sizeValues 在各图标集内按预设名称合并；扁平字典只更新共享预设，保留继承的图标集专属预设。只修改外观的作用域会共享父级 store。",
  "Local icon data": "本地图标数据",
  "Use sources to register artwork yourself, for example when icon names come from application state. The example maps an exact name to [tag, attributes] tuples and works without an HTTP service. Local sources are checked before the fallback API; child sources take priority over inherited sources.":
    "需要自行注册图形时，可以使用 sources，例如图标名称来自应用状态的场景。此例将完整名称映射到 [tag, attributes] 元组，无需 HTTP 服务。本地数据优先于回退 API，子级来源优先于继承的来源。",
  "Load icons from an API": "通过 API 加载图标",
  "Use api when a name is not available through static extraction or local sources. The fetch configuration requests /<set>.json?icons=<name> from an Iconify-compatible service. Replace the example URL with your own deployed service; configuring api does not create a server.":
    "当静态提取和本地来源中都没有所需图标时，可以配置 api。fetch 配置会向兼容 Iconify 的服务请求 /<set>.json?icons=<name>。请将示例 URL 替换为你已部署的服务；设置 api 不会自动创建服务端。",
  "Create an IconStore when you need explicit cache limits, timeouts, concurrency or preloading, then pass it through store. Configure sources and api on that store, not alongside it. Keep the store’s identity stable within a mounted application so rerenders reuse its cache.":
    "需要控制缓存容量、超时、并发或预加载时，创建 IconStore 并通过 store 传入。sources 和 api 应在创建存储时配置，不要与 store 一起传入。应用挂载期间保持 store 实例稳定，让重新渲染能够复用缓存。",
  "Option reference": "配置项参考",
  "Create a scope with createIconConfig and pass it to each Icon. This example gives both icons a 24px default. Astro uses explicit scopes rather than a provider component.":
    "用 createIconConfig 创建作用域，再通过 scope 传给每个 Icon。此例为两个图标设置 24px 默认尺寸。Astro 使用显式作用域，无需 Provider 组件。",
  "Configure ordinary i elements with createIconConfig and bindIcons. Customize appearance first, then choose local sources, an API or a shared store.":
    "使用 createIconConfig 和 bindIcons 配置普通 i 元素。先自定义外观，再按需配置本地数据、API 或共享存储。",
  "Configure the icones-icon tag with createIconConfig and defineIconElement. Customize appearance first, then choose local sources, an API or a shared store.":
    "使用 createIconConfig 和 defineIconElement 配置 icones-icon 标签。先自定义外观，再按需配置本地数据、API 或共享存储。",
  "Find an icon, customize its appearance and use it in your application.":
    "找到合适的图标，调整外观，再用到你的应用中。",
  "On the Icons page, find tabler:star, open its JSON tab and save the original JSON as icons/tabler/data/star.json in your application. Keep the collection’s license from the Licenses page with any artwork you use.":
    "在图标页面找到 tabler:star，打开 JSON 标签，将原始 JSON 保存到应用的 icons/tabler/data/star.json。使用图形时，请一并保留许可页面提供的原始许可。",
  "The file icons/tabler/data/star.json exists in your application. dataDir points to ./icons, the folder containing tabler/, not to the JSON file itself.":
    "确认应用中已有 icons/tabler/data/star.json。dataDir 应指向包含 tabler/ 的 ./icons 目录，而非 JSON 文件本身。",
  "Use the original tuple JSON from the JSON tab, not SVG markup. Save other icons with the same <set>/data/<name>.json layout. Set fallbackToApi: false to prevent build-time requests for missing icons.":
    "请保存 JSON 标签中的原始元组数据，不要使用 SVG 标记。其他图标也按 <set>/data/<name>.json 的目录结构保存。设置 fallbackToApi: false 可避免构建时为缺失图标发起请求。",
  "JSON copied from the Icons page contains SVG node tuples. TypeScript infers JSON imports as ordinary arrays; parseElementData validates them and returns typed ElementData. Pass the result to the icon’s data prop.":
    "从图标页面复制的 JSON 包含 SVG 节点元组。TypeScript 通常将 JSON 导入推断为普通数组；使用 parseElementData 校验后可得到类型明确的 ElementData，再传给图标的 data 属性。",
  "Use the format that matches your source: JSON from the Icons page contains [tag, attributes] tuples; an Iconify icon object contains width, height and body. Both are supported. Do not put a tuple array inside a body property or pass SVG markup to parseElementData.":
    "请根据数据来源选择格式：图标页面的 JSON 是 [tag, attributes] 元组；Iconify 图标对象则包含 width、height 和 body。两者都受支持。不要将元组数组放进 body 属性，也不要向 parseElementData 传入 SVG 标记。",
  "Choose your framework. For a Vite application, install its adapter and the Vite plugin together, then follow the framework guide to connect your icon data. The adapter renders icons; the plugin collects referenced artwork at build time.":
    "选择你使用的框架。对于 Vite 应用，将框架适配器与 Vite 插件一起安装，再按照对应指南接入图标数据。适配器负责渲染图标，插件在构建时收集被引用的图形。",
  "SVG icon components for React applications, with typed props, scoped defaults and server rendering.":
    "用于 React 应用的 SVG 图标组件，支持属性类型检查、作用域默认配置与服务端渲染。",
  "SVG icon components for Vue applications, with reactive props, inherited configuration and fallback slots.":
    "用于 Vue 应用的 SVG 图标组件，支持响应式属性、配置继承与回退插槽。",
  "Native Svelte 5 icon components, with runes, scoped configuration and snippet fallbacks.":
    "原生 Svelte 5 图标组件，支持 runes、作用域配置与 snippet 回退内容。",
  "SVG icon components for SolidJS applications, with fine-grained updates and separate client and server entries.":
    "用于 SolidJS 应用的 SVG 图标组件，支持细粒度更新，并提供独立的客户端与服务端入口。",
  "Server-rendered SVG icons for Astro pages, with no icon component runtime shipped to the browser.":
    "在 Astro 页面中服务端渲染 SVG 图标，无需向浏览器发送图标组件的运行时代码。",
  "Icons for plain JavaScript and HTML. Use standard elements or Web Components with the same package.":
    "用于原生 JavaScript 和 HTML 的图标。同一个包同时支持标准元素与 Web Components 两种接入方式。",
  "Read the React guide": "阅读 React 指南",
  "Read the Vue guide": "阅读 Vue 指南",
  "Read the Svelte guide": "阅读 Svelte 指南",
  "Read the SolidJS guide": "阅读 SolidJS 指南",
  "Read the Astro guide": "阅读 Astro 指南",
  "Standard elements guide": "标准元素指南",
  "Web Components guide": "Web Components 指南",
  "What is Icones?": "什么是 Icones？",
  "Icones brings independent icon collections together in a searchable catalog. Browse by collection or category, compare styles, then adjust an icon’s size, color, stroke width and rotation before using it.":
    "Icones 将独立图标集整合为可搜索的目录。你可以按图标集或分类浏览、对比风格，并在使用前调整尺寸、颜色、描边宽度和旋转角度。",
  "Every collection keeps its original identity and license. Outline and filled drawings are separate icons, not styles generated from the same path.":
    "每个图标集都保留原始标识与许可证。线框和填充图标是各自独立的图形，并非由同一路径生成的样式。",
  "Built for your framework": "为你的框架而设计",
  "React, Vue, Svelte, SolidJS, Astro and vanilla JavaScript share the same data foundation. Choose your framework in the sidebar; the examples throughout this guide will follow your selection.":
    "React、Vue、Svelte、SolidJS、Astro 和原生 JavaScript 共享同一套数据基础。在侧边栏选择框架，本指南中的示例会随之切换。",
  "Named examples assume your app has a loading setup. Getting started explains static collection and local data.":
    "按名称使用图标的示例假定应用已配置加载方式。“快速开始”会介绍静态收集与本地数据。",
  "Choose your workflow": "选择使用方式",
  "Use a standalone SVG when you only need the artwork, a framework adapter when you need component props, or local JSON when you want to keep the data in your application.":
    "只需要图形时，使用独立 SVG；需要组件属性时，使用框架适配器；希望数据保存在应用中时，使用本地 JSON。",
  "Browse and customize in the Icons page.": "在“图标”页面浏览和自定义图标。",
  "Copy an SVG, or install the adapter for your framework.":
    "复制 SVG，或安装适合你框架的适配器。",
  "Keep the collection’s license and attribution requirements with your project.":
    "在项目中保留图标集的许可证及署名要求。",
  "Start the first-icon tutorial": "开始第一个图标教程",
  Installation: "安装",
  "Add the adapter for React and choose where your icon data will live.":
    "添加 React 适配器，并选择图标数据的存放位置。",
  "Install the packages": "安装依赖包",
  "Install the packages in your application. The framework adapter renders icons; the optional Vite plugin collects literal icon names at build time.":
    "在应用中安装依赖包。框架适配器负责渲染图标；可选的 Vite 插件在构建时收集字面量图标名称。",
  "Prepare your icon data": "准备图标数据",
  "Each collection owns data/, symbols/, manifest.json, and license.txt. The manifest groups flat filenames by variant and then category; moving an icon to another category never changes its file path.":
    "每个集合独立包含 data/、symbols/、manifest.json 和 license.txt。清单按样式、分类组织平铺的文件名，修改分类不会改变图标路径。",
  "Collection manifest": "集合清单",
  "Copy the whole collection to keep its inventory and license. When you save only one JSON file, Vite registers it in the manifest and generates its symbol on the first static reference.":
    "复制整个集合可保留清单和许可证。如果只保存一个 JSON 文件，Vite 会在首次静态引用时将其登记到清单，并生成对应的 symbol。",
  "The gallery’s data directory is ../packages/icons because its application lives in app/. Keep the original licenses when copying a collection.":
    "图标站点的数据目录是 ../packages/icons，因为应用位于 app/ 中。复制图标集时，请保留原始许可证。",
  "Connect your application": "接入应用",
  "Open Getting started for the selected framework to connect local data or static collection. The adapter uses your existing application setup; you do not need to wrap each icon in configuration.":
    "打开所选框架的“快速开始”，接入本地数据或静态收集。适配器沿用应用现有的配置，无需为每个图标包裹配置组件。",
  "Continue with Getting started": "继续阅读“快速开始”",
  "Add the adapter for Vue and choose where your icon data will live.":
    "添加 Vue 适配器，并选择图标数据的存放位置。",
  "Add the adapter for Svelte and choose where your icon data will live.":
    "添加 Svelte 适配器，并选择图标数据的存放位置。",
  "Add the adapter for SolidJS and choose where your icon data will live.":
    "添加 SolidJS 适配器，并选择图标数据的存放位置。",
  "Add the adapter for Astro and choose where your icon data will live.":
    "添加 Astro 适配器，并选择图标数据的存放位置。",
  "Add the adapter for Vanilla and choose where your icon data will live.":
    "添加 Vanilla 适配器，并选择图标数据的存放位置。",
  "React overview": "React 概览",
  "The same icon vocabulary, with an API that belongs in your React application.":
    "统一的图标用法，配以适合 React 应用的 API。",
  "Start with one icon": "从一个图标开始",
  "Use the exact set:name identifier from the catalog. The name selects the artwork; the remaining props control its presentation.":
    "使用目录中准确的 set:name 标识。name 选择图形，其余属性控制显示效果。",
  "Follow the first-icon tutorial": "阅读第一个图标教程",
  "A shared set of props": "通用属性",
  "Start with a name or inline data, then add only the props you need. Omitted values inherit the application’s defaults.":
    "先提供名称或内联数据，再按需添加属性。省略的值会继承应用的默认配置。",
  Prop: "属性",
  Purpose: "用途",
  "The exact set:name identifier of the primary icon":
    "主图标的完整 set:name 标识，例如 tabler:star",
  "Inline icon data; renders without looking up a name":
    "直接传入图标数据，无需按名称查找图标",
  "Inline primary icon data; takes priority over name":
    "主图标的内联数据，优先于 name",
  "Inline alternative icon data; takes priority over altName":
    "备选图标的内联数据，优先于 altName",
  "true selects the alternative group; false keeps the primary group":
    "true 选择备选组（altName/altData）；false 选择主图标组（name/data）",
  "Choose one source per group: name or data for the primary icon, altName or altData for the alternative. Providing both in either group logs console.error; data or altData still takes priority, even if that group is not currently shown.":
    "每组只传一种来源：主图标使用 name 或 data，备选图标使用 altName 或 altData。同组两者同时存在会输出 console.error，并优先使用 data 或 altData；未显示的组也会检查冲突。",
  "A named size preset, pixel value or CSS length":
    "命名尺寸预设、像素值或 CSS 长度",
  "CSS color used by currentColor in the SVG":
    "设置 SVG 的 CSS color，供其中的 currentColor 使用",
  "The exact name of an alternative icon; no suffix is inferred":
    "备选图标的完整名称，不会自动推测 -filled 等后缀",
  "true selects altName; false keeps the primary icon":
    "true 显示 altName 指定的备选图标；false 显示主图标",
  "A named icon or local icon data": "图标名称或本地图标数据",
  "Dimensions and currentColor": "显示尺寸与 currentColor",
  "Outline weight on a 24-unit basis": "以 24 单位为基准的描边宽度",
  "Rotation in quarter turns: 1 = 90°": "以四分之一圈为单位旋转：1 = 90°",
  "An explicitly selected alternative drawing": "显式选择的备选图形",
  "Rendering and loading": "渲染与加载",
  "The component follows prop changes in your framework. For server rendering, use local data, static collection, symbol references or preloaded data. Keep the initial icon state consistent during hydration.":
    "组件会响应框架中的属性变化。服务端渲染可使用本地数据、静态收集、symbol 引用或预加载数据。水合时请保持图标初始状态一致。",
  "Vue overview": "Vue 概览",
  "The same icon vocabulary, with an API that belongs in your Vue application.":
    "统一的图标用法，配以适合 Vue 应用的 API。",
  "Svelte overview": "Svelte 概览",
  "The same icon vocabulary, with an API that belongs in your Svelte application.":
    "统一的图标用法，配以适合 Svelte 应用的 API。",
  "SolidJS overview": "SolidJS 概览",
  "The same icon vocabulary, with an API that belongs in your SolidJS application.":
    "统一的图标用法，配以适合 SolidJS 应用的 API。",
  "Astro overview": "Astro 概览",
  "The same icon vocabulary, with an API that belongs in your Astro application.":
    "统一的图标用法，配以适合 Astro 应用的 API。",
  "Astro renders on the server and waits for asynchronous icon data. Use local data or static extraction for offline output. Remote fetches need an absolute URL; the icon itself does not need a client:* directive.":
    "Astro 在服务端渲染并等待异步图标数据。离线输出请使用本地数据或静态提取。远程请求需要绝对 URL，图标本身无需 client:* 指令。",
  "Web Components overview": "Web 组件概览",
  "Use the dedicated icones-icon tag. This tutorial follows the web-element entry from your first icon through configuration.":
    "使用专用的 icones-icon 标签。本教程沿 web-element 入口，从第一个图标逐步讲到配置。",
  "1. Start with this HTML": "1. 从这段 HTML 开始",
  "Write an icones-icon element with name and import @icones/vanilla/web-element once. The browser upgrades the tag and appends an SVG when it is connected.":
    "编写带 name 的 icones-icon 元素，并导入一次 @icones/vanilla/web-element。浏览器会升级该标签，在它连接到文档时追加 SVG。",
  "Both the import and artwork are required. Complete Getting started to connect Vite and your local JSON before running this example. The SVG lives in light DOM, without Shadow DOM.":
    "导入模块和图形数据缺一不可。运行此示例前，请完成“快速开始”，接入 Vite 与本地 JSON。SVG 位于 light DOM 中，不使用 Shadow DOM。",
  "Follow this path: install and display your first icon":
    "从这里开始：安装并显示第一个图标",
  "2. Change attributes": "2. 修改属性",
  "Add only the attributes you need. Empty or true enables a boolean option; false disables it. Removing an attribute restores the configured default.":
    "只添加需要的属性。布尔选项的空值或 true 表示启用，false 表示禁用。移除属性会恢复配置的默认值。",
  "Only the dedicated tag opts into rendering. Native class, style and aria-* remain on the host; svg-class, label and svg-role target its SVG. Use decorative, not the native hidden attribute, for decorative icons.":
    "只有专用标签参与渲染。原生 class、style 和 aria-* 保留在宿主上；svg-class、label 和 svg-role 作用于内部 SVG。装饰性图标请使用 decorative，而非原生 hidden 属性。",
  "HTML attribute": "HTML 属性",
  "Exact icon name, e.g. tabler:star": "准确的图标名称，例如 tabler:star",
  "Display size and color": "显示尺寸与颜色",
  "Outline weight; original preserves the source":
    "描边宽度；original 保留原始值",
  "Quarter turns: 1 = 90°": "四分之一圈：1 = 90°",
  "Alternative artwork and active state": "备选图形及其激活状态",
  "Accessible label on the SVG": "SVG 上的无障碍标签",
  "3. Let the element update": "3. 让元素自动更新",
  'Change an attribute with setAttribute("size", "32"). The Web Component lifecycle synchronizes the SVG immediately; connecting or removing a tag starts or stops rendering automatically.':
    '通过 setAttribute("size", "32") 修改属性。Web 组件生命周期会立即同步 SVG；连接或移除标签会自动启动或停止渲染。',
  "For shared defaults, replace the automatic import with defineIconElement({ scope }). Register once per window; repeated registration does not change its defaults. A specific icon can use its own scope object through element.scope.":
    "需要共享默认值时，将自动导入替换为 defineIconElement({ scope })。每个窗口只需注册一次，重复注册不会更改默认值。单个图标可通过 element.scope 使用自己的作用域对象。",
  "Configure this element’s defaults": "配置此元素的默认值",
  "4. Defer the first render": "4. 延迟首次渲染",
  'Add defer="intersect" to render when the host enters the viewport, or defer="domready" to wait for DOMContentLoaded. If the document is already interactive or complete, domready renders immediately.':
    '添加 defer="intersect"，在宿主进入视口时渲染；或用 defer="domready"，等待 DOMContentLoaded。若文档已处于 interactive 或 complete 状态，domready 会立即渲染。',
  "No SVG or runtime data request starts before activation. After the first render, updates proceed normally. Removing a pending host cancels its wait; load() does not force activation.":
    "激活之前不会创建 SVG 或发起运行时数据请求。首次渲染后正常响应更新。移除等待中的宿主会取消等待；load() 不会强制激活。",
  "Without IntersectionObserver, intersect renders immediately. Reserve space with CSS if needed. Static Vite data is still bundled; deferred rendering is not code splitting.":
    "不支持 IntersectionObserver 时，intersect 会立即渲染。必要时用 CSS 预留空间。静态 Vite 数据仍会打包，延迟渲染不等于代码分割。",
  "Standard elements overview": "标准元素概览",
  "Use ordinary i elements with icon-* attributes. This tutorial follows the standard-element entry from your first icon through configuration.":
    "在普通 i 元素上使用 icon-* 属性。本教程沿 standard-element 入口，从第一个图标逐步讲到配置。",
  "Write an i element with icon-name and import @icones/vanilla/standard-element once. The initializer finds those hosts and appends an SVG without replacing the original i.":
    "编写带 icon-name 的 i 元素，并导入一次 @icones/vanilla/standard-element。初始化器会找到这些宿主并追加 SVG，不会替换原始 i 元素。",
  "Only i[icon-name] opts into rendering. Other tags, a bare icon attribute, and data-icon* aliases are not scanned. Native class, style and aria-* remain on the i; icon-class, icon-label and icon-role target its SVG.":
    "只有 i[icon-name] 参与渲染。其他标签、单独的 icon 属性和 data-icon* 别名不会被扫描。原生 class、style 和 aria-* 保留在 i 上；icon-class、icon-label 和 icon-role 作用于内部 SVG。",
  'Change an attribute with setAttribute("icon-size", "32"). A MutationObserver synchronizes the SVG; adding or removing matching i elements starts or stops rendering automatically.':
    '通过 setAttribute("icon-size", "32") 修改属性。MutationObserver 会同步 SVG；添加或移除匹配的 i 元素会自动启动或停止渲染。',
  "For a custom root or shared defaults, replace the automatic import with bindIcons({ root, scope }). Its handle provides refresh(), load() and destroy(). Repeated initialization of one root and attrPrefix returns the existing handle; it does not replace its scope.":
    "需要自定义根节点或共享默认值时，将自动导入替换为 bindIcons({ root, scope })。返回的绑定对象提供 refresh()、load() 和 destroy()。相同 root 和 attrPrefix 重复初始化会返回现有绑定，不会替换其作用域。",
  'Add icon-defer="intersect" to render when the host enters the viewport, or icon-defer="domready" to wait for DOMContentLoaded. If the document is already interactive or complete, domready renders immediately.':
    '添加 icon-defer="intersect"，在宿主进入视口时渲染；或用 icon-defer="domready"，等待 DOMContentLoaded。若文档已处于 interactive 或 complete 状态，domready 会立即渲染。',
  "5. Customize the attribute prefix": "5. 自定义属性前缀",
  "If icon-* does not fit your app, replace the automatic standard-element import with explicit initialization. attrPrefix includes the trailing hyphen and changes every icon attribute, not just its name.":
    "如果 icon-* 不适合你的应用，将 standard-element 自动导入替换为显式初始化。attrPrefix 包含末尾连字符，会更改所有图标属性的前缀，而不仅是名称属性。",
  "Keep the same prefix in Vite’s attrPrefixes list so build-time collection can find your HTML names. That list replaces the default; use [icon-, ui-] only if you intentionally use both. Initializers are keyed by root and attrPrefix. Use one active name prefix per host.":
    "在 Vite 的 attrPrefixes 列表中使用相同前缀，确保构建时能收集 HTML 中的名称。该列表会替换默认值，仅当确实同时使用两者时才设置 [icon-, ui-]。初始化器以 root 和 attrPrefix 区分。每个宿主只使用一个有效名称前缀。",
  "Prefixes start with a lowercase letter, use lowercase letters/digits and hyphens, and end with a hyphen. There is no implicit fallback to icon-* or data-*.":
    "前缀必须以小写字母开头，仅含小写字母、数字和连字符，并以连字符结尾。不会隐式回退到 icon-* 或 data-*。",
  "Getting started": "快速开始",
  "Display one React icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先显示一个 React 图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Start with an existing React application using Vite. Run the commands from its root directory; this tutorial does not scaffold a new app.":
    "从现有的 Vite React 应用开始，在应用根目录运行命令。本教程不会新建应用。",
  "A visible star icon that you can resize and recolor with a single prop.":
    "显示一个星形图标，并能通过单个属性调整尺寸与颜色。",
  "1. Install the packages": "1. 安装依赖包",
  "The adapter renders SVGs. The Vite plugin finds literal icon names in your code and includes their artwork in your build.":
    "适配器负责渲染 SVG。Vite 插件查找代码中的字面量图标名称，并将对应图形包含在构建结果中。",
  "Run these commands inside your application.": "在应用目录下运行这些命令。",
  "Your app has both @icones/react and @icones/vite in its dependencies.":
    "应用的依赖中包含 @icones/react 和 @icones/vite。",
  "2. Connect the artwork": "2. 接入图形数据",
  "Add icones to your existing plugin list; keep your framework’s other plugins. Set dataDir to the directory containing your icon JSON files. This example assumes icons is inside the application root.":
    "将 icones 加入现有插件列表，保留框架的其他插件。将 dataDir 指向存放图标 JSON 的目录。此示例假定 icons 位于应用根目录中。",
  "Update vite.config.ts, then restart your Vite development server so it reads the new plugin configuration.":
    "更新 vite.config.ts，然后重启 Vite 开发服务器，让新插件配置生效。",
  "3. Display your first icon": "3. 显示第一个图标",
  "Put this example in your icon.tsx component and render that component in your page. The literal name tabler:star matches the artwork from step 2.":
    "将此示例放入 icon.tsx 组件，并在页面中渲染该组件。字面量名称 tabler:star 对应第 2 步的图形数据。",
  "Run your app with its normal development command and open the page. Verify the star is visible before continuing.":
    "用应用原有的开发命令启动并打开页面。确认星形图标可见后再继续。",
  "You see one 24px star. In the DOM it contains an SVG; no IconConfig or runtime API setup is required.":
    "你会看到一个 24px 的星形图标，DOM 中包含 SVG，无需 IconConfig 或运行时 API 配置。",
  "4. Change one thing at a time": "4. 一次只改一个设置",
  "In the previous example, change size from 24 to 32. Once the star grows, add color to make it purple. Keep the name and loading setup unchanged.":
    "在上一个示例中，将 size 从 24 改为 32。确认星形变大后，再添加 color 将其变为紫色。名称和加载配置保持不变。",
  "This complete replacement example combines those two changes. Remove color to follow the surrounding text color again.":
    "下面的完整替换示例合并了这两项修改。移除 color 后，图标会重新跟随周围文本的颜色。",
  "The same star is now 32px and purple. You changed its presentation, not its source JSON.":
    "同一个星形图标现在为 32px、紫色。改变的是显示效果，而非源 JSON。",
  "Next: color, sizing and stroke": "接下来：颜色、尺寸与描边",
  "Later: share defaults with IconConfig": "稍后阅读：用 IconConfig 共享默认值",
  "If the icon does not appear": "图标没有显示？",
  "Check these in order before adding configuration. Shared defaults cannot fix a missing import, an incorrect path or missing artwork.":
    "添加配置前，请按顺序检查以下项目。共享默认值无法解决缺少导入、路径错误或缺少图形数据的问题。",
  "Check the terminal for a missing-package or missing-icon error.":
    "检查终端是否报告缺少依赖包或图标。",
  "Confirm the icon’s name is exactly tabler:star, and dataDir contains tabler/data/star.json.":
    "确认图标名称准确为 tabler:star，且 dataDir 中包含 tabler/data/star.json。",
  "Restart the development server after changing its configuration.":
    "修改配置后重启开发服务器。",
  "Confirm your page actually renders the component containing Icon.":
    "确认页面实际渲染了包含 Icon 的组件。",
  "Check that CSS is not hiding the SVG or giving it the same color as the background.":
    "检查 CSS 是否隐藏了 SVG，或让它与背景同色。",
  "Use a literal name for this lesson. Computed names need local data or a runtime loading setup; learn that after the first icon works.":
    "本课请使用字面量名称。计算得到的名称需要本地数据或运行时加载配置，等第一个图标正常显示后再学习。",
  "Display one Vue icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先显示一个 Vue 图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Start with an existing Vue application using Vite. Run the commands from its root directory; this tutorial does not scaffold a new app.":
    "从现有的 Vite Vue 应用开始，在应用根目录运行命令。本教程不会新建应用。",
  "Your app has both @icones/vue and @icones/vite in its dependencies.":
    "应用的依赖中包含 @icones/vue 和 @icones/vite。",
  "Put this example in your IconExample.vue component and render that component in your page. The literal name tabler:star matches the artwork from step 2.":
    "将此示例放入 IconExample.vue 组件，并在页面中渲染该组件。字面量名称 tabler:star 对应第 2 步的图形数据。",
  "Display one Svelte icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先显示一个 Svelte 图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Start with an existing Svelte application using Vite. Run the commands from its root directory; this tutorial does not scaffold a new app.":
    "从现有的 Vite Svelte 应用开始，在应用根目录运行命令。本教程不会新建应用。",
  "Your app has both @icones/svelte and @icones/vite in its dependencies.":
    "应用的依赖中包含 @icones/svelte 和 @icones/vite。",
  "Put this example in your IconExample.svelte component and render that component in your page. The literal name tabler:star matches the artwork from step 2.":
    "将此示例放入 IconExample.svelte 组件，并在页面中渲染该组件。字面量名称 tabler:star 对应第 2 步的图形数据。",
  "Display one SolidJS icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先显示一个 SolidJS 图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Start with an existing SolidJS application using Vite. Run the commands from its root directory; this tutorial does not scaffold a new app.":
    "从现有的 Vite SolidJS 应用开始，在应用根目录运行命令。本教程不会新建应用。",
  "Your app has both @icones/solidjs and @icones/vite in its dependencies.":
    "应用的依赖中包含 @icones/solidjs 和 @icones/vite。",
  "Display one Astro icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先显示一个 Astro 图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Start with an existing Astro application. Run the commands from its root directory.":
    "从现有的 Astro 应用开始，在应用根目录运行命令。",
  "Your app has both @icones/astro and @icones/vite in its dependencies.":
    "应用的依赖中包含 @icones/astro 和 @icones/vite。",
  "In Astro, update vite.plugins in astro.config.mjs. Do not create a separate Vite config.":
    "在 Astro 中，更新 astro.config.mjs 的 vite.plugins，不要单独创建 Vite 配置。",
  "Put this example in your IconExample.astro component and render that component in your page. The literal name tabler:star matches the artwork from step 2.":
    "将此示例放入 IconExample.astro 组件，并在页面中渲染该组件。字面量名称 tabler:star 对应第 2 步的图形数据。",
  "Display one Web Components icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先用 Web 组件显示一个图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Start with an existing Vanilla application using Vite. Run the commands from its root directory; this tutorial does not scaffold a new app.":
    "从现有的 Vite Vanilla 应用开始，在应用根目录运行命令。本教程不会新建应用。",
  "Your app has both @icones/vanilla and @icones/vite in its dependencies.":
    "应用的依赖中包含 @icones/vanilla 和 @icones/vite。",
  "Add this to index.html. Write the dedicated icones-icon tag and import @icones/vanilla/web-element once. The browser upgrades the tag and appends an SVG directly inside it, without Shadow DOM. Keep the icon in HTML.":
    "将此示例加入 index.html。使用专用 icones-icon 标签，并导入一次 @icones/vanilla/web-element。浏览器会升级该标签，直接在内部追加 SVG，不使用 Shadow DOM。图标声明保留在 HTML 中。",
  "Then: Web Components attributes and deferred rendering":
    "接下来：Web 组件属性与延迟渲染",
  "Use a Vite-served page, not a file:// URL. Confirm the module script imports @icones/vanilla/web-element and the host uses icones-icon with name.":
    "请通过 Vite 访问页面，而非 file:// URL。确认模块脚本导入了 @icones/vanilla/web-element，宿主为带 name 的 icones-icon。",
  "Display one Standard elements icon, check that it works, then change its appearance. No shared configuration is needed yet.":
    "先用标准元素显示一个图标，确认正常后再调整外观。此时还不需要共享配置。",
  "Add this to index.html. Write an ordinary i with icon-name and import @icones/vanilla/standard-element once. The initializer scans matching hosts and appends an SVG directly inside each i. Keep the icon in HTML.":
    "将此示例加入 index.html。使用带 icon-name 的普通 i 元素，并导入一次 @icones/vanilla/standard-element。初始化器会扫描匹配的宿主，在每个 i 内部直接追加 SVG。图标声明保留在 HTML 中。",
  "In the previous example, change icon-size from 24 to 32. Once the star grows, add icon-color to make it purple. Keep the name and loading setup unchanged.":
    "在上一个示例中，将 icon-size 从 24 改为 32。确认星形变大后，再添加 icon-color 将其变为紫色。名称和加载配置保持不变。",
  "This complete replacement example combines those two changes. Remove icon-color to follow the surrounding text color again.":
    "下面的完整替换示例合并了这两项修改。移除 icon-color 后，图标会重新跟随周围文本的颜色。",
  "Then: Standard elements attributes and deferred rendering":
    "接下来：标准元素属性与延迟渲染",
  "Use a Vite-served page, not a file:// URL. Confirm the module script imports @icones/vanilla/standard-element and the host uses i with icon-name.":
    "请通过 Vite 访问页面，而非 file:// URL。确认模块脚本导入了 @icones/vanilla/standard-element，宿主为带 icon-name 的 i 元素。",
  Color: "颜色",
  "Let icons follow your text, or give a single icon its own color.":
    "让图标跟随文本颜色，或为单个图标指定颜色。",
  "Inherit text color": "继承文本颜色",
  "Monochrome icons use currentColor. When color is omitted, the drawing follows the surrounding text color, so it fits naturally inside links, buttons and status messages.":
    "单色图标使用 currentColor。省略 color 时，图形跟随周围文本的颜色，自然融入链接、按钮与状态消息。",
  "Set an explicit color": "指定颜色",
  "The color option accepts a CSS color. Use a hex value, a named color, or a design token such as var(--accent-color).":
    "color 接受 CSS 颜色，可使用十六进制值、颜色名称或 var(--accent-color) 等设计变量。",
  "Respect multicolor artwork": "保留多色图形",
  "Color in Outline, Filled and Solid icons":
    "颜色在 Outline、Filled 和 Solid 中的表现",
  "The SVG color value does not replace every fill or stroke. It affects only paint values that use currentColor. The artwork decides whether that color appears on an outline or a filled area.":
    "SVG 的 color 不会替换所有 fill 或 stroke，只影响使用 currentColor 的部分。颜色最终出现在线条上还是实体区域，由图标自身的路径决定。",
  "Outline, Filled and Solid describe the artwork, not color modes. Select the exact icon name to change styles; setting color or fill does not turn an outline drawing into its designed filled counterpart.":
    "Outline、Filled 和 Solid 是图形样式，不是颜色模式。切换样式要选择对应的完整图标名称；设置 color 或 fill 并不等于切换到作者设计的 Filled 版本。",
  Style: "样式",
  "What changes with color": "color 会改变什么",
  'Usually colors strokes (stroke="currentColor") while fill="none" keeps the center empty. Example: tabler:star.':
    '通常改变线条颜色（stroke="currentColor"），fill="none" 的内部仍保持透明。例如 tabler:star。',
  'Usually colors the solid shape through fill="currentColor". Example: tabler:star-filled. It does not add a separate outline.':
    '通常通过 fill="currentColor" 改变实体区域的颜色，例如 tabler:star-filled；不会因此增加独立的描边。',
  "The same color behavior as Filled, with the collection’s own naming. Example: bootstrap:star-fill.":
    "颜色行为与 Filled 类似，只是图标集的命名不同，例如 bootstrap:star-fill。",
  "Judge by the SVG paint values, not just the style label. For example, bootstrap:star draws a hollow outline with a filled path, while the bundled phosphor:star uses a currentColor stroke.":
    "应以 SVG 的实际颜色属性为准，不能只看样式名称。例如 bootstrap:star 使用填充路径画出中空轮廓，而本站的 phosphor:star 使用 currentColor 描边。",
  "A drawing with fixed fill or stroke colors keeps those colors. currentColor only affects paths designed to inherit it; it does not recolor every path in a flag or brand mark.":
    "具有固定填充色或描边色的图形会保留这些颜色。currentColor 只影响设计为继承颜色的路径，不会为旗帜或品牌标志中的每条路径重新着色。",
  "Monochrome icons use currentColor. When icon-color is omitted, the drawing follows the surrounding text color, so it fits naturally inside links, buttons and status messages.":
    "单色图标使用 currentColor。省略 icon-color 时，图形跟随周围文本的颜色，自然融入链接、按钮与状态消息。",
  "The icon-color option accepts a CSS color. Use a hex value, a named color, or a design token such as var(--accent-color).":
    "icon-color 接受 CSS 颜色，可使用十六进制值、颜色名称或 var(--accent-color) 等设计变量。",
  Sizing: "尺寸",
  "Use a shared size preset, a pixel value, or a CSS length.":
    "使用共享尺寸预设、像素值或 CSS 长度。",
  "Named presets": "命名预设",
  "The built-in presets cover common interface sizes. Your application can override its defaults.":
    "内置预设覆盖常见界面尺寸，应用可覆盖默认值。",
  "Pixels and CSS lengths": "像素与 CSS 长度",
  "A numeric size is measured in pixels. A CSS length, such as 1.5rem or 1em, lets the icon follow your type scale. It controls both dimensions.":
    "数值 size 以像素为单位。1.5rem 或 1em 等 CSS 长度可让图标跟随字体比例，同时控制宽高。",
  "Canvas versus display size": "画布与显示尺寸",
  "The original viewBox describes the drawing’s coordinates, not its rendered pixel size. A 24 × 24 drawing can be displayed at 64px without rewriting the source data.":
    "原始 viewBox 描述图形的坐标，而非渲染的像素尺寸。24 × 24 的图形可以显示为 64px，无需改写源数据。",
  "To set separate width and height values, omit size. An explicit size takes priority over both.":
    "要分别设置 width 和 height，请省略 size。显式指定的 size 优先于两者。",
  "A numeric icon-size is measured in pixels. A CSS length, such as 1.5rem or 1em, lets the icon follow your type scale. It controls both dimensions.":
    "数值 icon-size 以像素为单位。1.5rem 或 1em 等 CSS 长度可让图标跟随字体比例，同时控制宽高。",
  "To set separate icon-width and icon-height values, omit icon-size. An explicit size takes priority over both.":
    "要分别设置 icon-width 和 icon-height，请省略 icon-size。显式指定的尺寸优先于两者。",
  "Stroke Width": "描边宽度",
  "Set the outline weight": "设置描边粗细",
  "strokeWidth uses a normalized 24-unit basis. This makes the same value usable across collections with different source canvas dimensions.":
    "strokeWidth 以归一化的 24 单位为基准，让同一数值适用于原始画布尺寸不同的图标集。",
  "Keep a constant pixel weight": "保持固定像素粗细",
  "Set absoluteStrokeWidth with a numeric pixel size to keep the stroke’s rendered thickness steady as the icon gets larger.":
    "配合数值像素尺寸使用 absoluteStrokeWidth，可在图标放大时保持描边的实际厚度不变。",
  "Preserve the original drawing": "保留原始图形",
  "Filled artwork does not gain an outline just because strokeWidth is set. The configured width takes priority over the source width.":
    "填充图形不会仅因设置 strokeWidth 就产生描边。配置的宽度优先于原始宽度。",
  "Multicolor artwork with fixed stroke colors is excluded from automatic path stroke rewriting.":
    "固定描边颜色的多色图形不会参与自动路径描边改写。",
  "stroke-width uses a normalized 24-unit basis. This makes the same value usable across collections with different source canvas dimensions.":
    "stroke-width 以归一化的 24 单位为基准，让同一数值适用于原始画布尺寸不同的图标集。",
  "Set absolute-stroke-width with a numeric pixel size to keep the stroke’s rendered thickness steady as the icon gets larger.":
    "配合数值像素尺寸使用 absolute-stroke-width，可在图标放大时保持描边的实际厚度不变。",
  'Use stroke-width="original" to preserve the source width. Filled artwork does not gain an outline just because a stroke width is set.':
    '使用 stroke-width="original" 保留原始宽度。填充图形不会仅因设置描边宽度就产生描边。',
  "icon-stroke-width uses a normalized 24-unit basis. This makes the same value usable across collections with different source canvas dimensions.":
    "icon-stroke-width 以归一化的 24 单位为基准，让同一数值适用于原始画布尺寸不同的图标集。",
  "Set icon-absolute-stroke-width with a numeric pixel size to keep the stroke’s rendered thickness steady as the icon gets larger.":
    "配合数值像素尺寸使用 icon-absolute-stroke-width，可在图标放大时保持描边的实际厚度不变。",
  'Use icon-stroke-width="original" to preserve the source width. Filled artwork does not gain an outline just because a stroke width is set.':
    '使用 icon-stroke-width="original" 保留原始宽度。填充图形不会仅因设置描边宽度就产生描边。',
  Fill: "填充",
  "Choose artwork intentionally: outline and filled icons are independent drawings.":
    "有意识地选择图形：线框和填充图标是独立的设计。",
  "Choose the filled drawing": "选择填充图形",
  "Use the exact filled icon name from the collection. For example, tabler:star and tabler:star-filled are two different icons.":
    "使用图标集中准确的填充图标名称。例如，tabler:star 和 tabler:star-filled 是两个不同的图标。",
  "Understand SVG fill": "理解 SVG fill",
  'The fill attribute is inherited by paths that do not set their own fill. It does not replace a path’s explicit fill="none", and it cannot turn an outline into a carefully designed filled variant.':
    'fill 会被未自行设置填充色的路径继承。它不会替换路径上显式的 fill="none"，也无法将线框变为经过精心设计的填充版本。',
  "Do not guess a -filled name. Some collections use different names, or do not include a corresponding filled drawing.":
    "不要猜测 -filled 名称。某些图标集使用其他命名，或没有对应的填充图形。",
  "Switch between variants": "切换图标版本",
  "Use altName and showAlt when an icon has two known states. The Alternative guide explains explicit variant selection.":
    "当图标有两个已知状态时，使用 altName 和 showAlt。“备选图标”章节介绍显式选择版本。",
  "Use alt-name and show-alt when an icon has two known states. The Alternative guide explains explicit variant selection.":
    "当图标有两个已知状态时，使用 alt-name 和 show-alt。“备选图标”章节介绍显式选择版本。",
  "Use icon-alt-name and icon-show-alt when an icon has two known states. The Alternative guide explains explicit variant selection.":
    "当图标有两个已知状态时，使用 icon-alt-name 和 icon-show-alt。“备选图标”章节介绍显式选择版本。",
  "Start with one shared size. Then override a single icon and give a group its own defaults. Loading and caching are optional next steps.":
    "从一个共享尺寸开始，再覆盖单个图标，并为一组图标设置独立默认值。加载和缓存是后续可选内容。",
  "Complete Getting started first. Keep its Vite setup, and include both tabler/data/star.json and tabler/data/heart.json in dataDir for this lesson. Shared appearance settings do not load artwork.":
    "请先完成“快速开始”，保留其中的 Vite 配置，并确保 dataDir 包含本课使用的 tabler/data/star.json 和 tabler/data/heart.json。共享外观设置不会加载图形数据。",
  "Two icons share a 24px default, one can override it, and a toolbar can use 16px icons.":
    "两个图标共享 24px 默认值；单个图标可覆盖它，工具栏则可使用 16px 图标。",
  "First, display an icon": "先显示一个图标",
  "1. Set one shared default": "1. 设置一个共享默认值",
  "When several icons repeat the same size, move that value into shared configuration. Start with just defaultSize: 24. Leave the other options alone.":
    "多个图标重复使用同一尺寸时，将其移入共享配置。先只设置 defaultSize: 24，其他选项暂时不动。",
  "Replace your example component with the code below. IconConfig shares its settings with the icons inside it, without adding an HTML wrapper. defaultSize belongs on the configuration; size belongs on an individual Icon.":
    "用下方代码替换示例组件。IconConfig 向内部图标共享设置，不会添加 HTML 包装元素。defaultSize 属于配置，size 属于单个 Icon。",
  "Keep your existing loading setup. If no drawing appears, finish Getting started before continuing; changing defaultSize cannot supply missing icon data.":
    "保留现有加载配置。如果图形没有显示，请先完成“快速开始”；修改 defaultSize 无法补上缺失的图标数据。",
  "Both the star and the heart render at 24px even though neither icon has a size prop.":
    "星形和心形都显示为 24px，尽管两个图标都没有 size 属性。",
  "2. Override one icon": "2. 覆盖单个图标",
  "Keep defaultSize at 24. Give only the heart a size of 32; the complete replacement component is below.":
    "保持 defaultSize 为 24，只给心形设置 size 为 32。下方是完整替换组件。",
  "An explicit icon size wins over the shared default. You do not need a second configuration for one exception.":
    "显式的图标尺寸优先于共享默认值。单个例外不需要再建一份配置。",
  "The star stays at 24px. The heart grows to 32px. Remove its size to return to 24px.":
    "星形保持 24px，心形变为 32px。移除心形的 size 即可恢复为 24px。",
  "3. Give a group its own default": "3. 为一组图标设置独立默认值",
  "Now imagine a compact toolbar. Its icons should be 16px, while the rest of the page stays at 24px. Remove the heart’s explicit size from step 2 so it can inherit again.":
    "假设有一个紧凑的工具栏：其中的图标应为 16px，而页面其余图标保持 24px。先移除第 2 步中心形的显式尺寸，让它恢复继承。",
  "Put a second IconConfig around the toolbar icons and set defaultSize to 16. It affects only its descendants; the star outside keeps the parent default.":
    "在工具栏图标外添加第二个 IconConfig，将 defaultSize 设为 16。它只影响后代图标，外部星形仍使用父级默认值。",
  "You can stop here. Shared defaults, per-icon overrides and group defaults cover everyday configuration. Open the sections below only when you need them.":
    "你可以在这里结束。共享默认值、单个图标覆盖和分组默认值已覆盖日常配置。下方内容仅在需要时展开阅读。",
  "The page’s star is 24px and the toolbar’s heart is 16px. An explicit size would still override either default.":
    "页面星形为 24px，工具栏心形为 16px。显式 size 仍会优先于任一默认值。",
  "Next: share colors with CSS": "接下来：用 CSS 共享颜色",
  "Register local JSON for offline use": "注册本地 JSON，实现离线使用",
  "Use this only when you want to register artwork yourself instead of using static extraction. sources maps an exact icon name to an array of [tag, attributes] tuples, matching the JSON files in icons. Keep SVG attributes in camelCase, such as strokeWidth and strokeLinecap; no serialized SVG body is needed. Local sources are checked before the configured fallback API; child sources take priority over inherited sources.":
    "仅在希望自行注册图形、而非使用静态提取时使用。sources 将准确的图标名称映射到 [tag, attributes] 元组数组，与 icons 中的 JSON 文件一致。SVG 属性保持 camelCase，如 strokeWidth 和 strokeLinecap，无需序列化的 SVG body。本地 sources 优先于回退 API，子级来源优先于继承的来源。",
  "Set api to false to disable fallback API loading. This does not disable explicit per-icon loaders, lazy source functions or statically compiled icons. Use trusted artwork; icon data is not an HTML sanitizer.":
    "将 api 设为 false 可禁用回退 API 加载，但不会禁用单个图标的显式加载器、延迟来源函数或静态编译的图标。请使用可信图形，图标数据处理不是 HTML 安全净化器。",
  'The variable iconName leaves this application-owned name to runtime sources instead of Vite extraction. You can also import a tuple JSON file, such as icons/brand/data/4chan.json, and register it as sources: { "brand:4chan": parseElementData(logoJSON) }. Keep the imported array intact; do not wrap it in a body property.':
    '变量 iconName 将此应用自有名称交由运行时 sources 处理，而非 Vite 提取。也可导入元组 JSON 文件，例如 icons/brand/data/4chan.json，再注册为 sources: { "brand:4chan": parseElementData(logoJSON) }。保留导入数组原样，不要包裹 body 属性。',
  "Load dynamic names from an API": "通过 API 加载动态名称",
  "Skip this if all your icons already come from static extraction or local sources. Use api to resolve names that are not statically collected or found in sources. The fetch configuration reads the Iconify-compatible endpoint /<set>.json?icons=<name>. Replace the example origin with your own deployed icon service; this setting does not create the server.":
    "若所有图标均来自静态提取或本地 sources，可跳过此节。api 用于解析未被静态收集、也未在 sources 中找到的名称。fetch 配置读取兼容 Iconify 的 /<set>.json?icons=<name> 接口。将示例源地址换成已部署的图标服务，此配置不会创建服务器。",
  'For external SVG symbols, use api: { type: "symbol", baseUrl: "/icons" } with a same-origin symbol service. Symbol mode creates a reference without fetching JSON in JavaScript. A custom API loader can also be supplied as a function.':
    '外部 SVG symbol 可通过 api: { type: "symbol", baseUrl: "/icons" } 使用同源服务。symbol 模式直接创建引用，不会在 JavaScript 中获取 JSON。也可传入函数形式的自定义 API 加载器。',
  "Runtime api and the Vite plugin’s build-time loadIcon are separate. Statically collected names bypass runtime loading. Server-side fetches need an absolute URL, as shown here.":
    "运行时 api 与 Vite 插件构建时的 loadIcon 相互独立。静态收集的名称会跳过运行时加载。服务端请求需要绝对 URL，如示例所示。",
  "Named presets and option reference": "命名预设与选项参考",
  "The component providers and explicit scopes share these options. Use defaultSize, not size, on configuration; color, fill, rotate and accessibility labels belong on individual icons or in CSS.":
    "配置组件与显式作用域共享这些选项。配置上使用 defaultSize，而非 size；color、fill、rotate 和无障碍标签属于单个图标或 CSS。",
  Option: "选项",
  "Default / behavior": "默认值 / 行为",
  'defaultSize accepts one size for every icon, or a map such as { tabler: "lg", default: "md" }. Keys are set prefixes, not categories or styles. An individual size takes priority, followed by the matching set, then default, then the built-in md (20px). Map values can also be numbers or CSS lengths.':
    'defaultSize 可为所有图标设置一个尺寸，也可使用 { tabler: "lg", default: "md" } 这样的映射。键是图标集前缀，不是分类或样式。优先级为：图标自身的 size → 匹配的图标集 → default → 内置 md（20px）。映射值也支持数值和 CSS 长度。',
  "The same set/default format also applies to sizeValues, strokeWidth, absoluteStrokeWidth and api. Individual icon properties take priority over appearance defaults. The currently displayed alternative determines the set. Anonymous tuple/JSON data uses default. Register collections in sources and select an icon by name to apply its set defaults. sources and store keep their existing formats.":
    "sizeValues、strokeWidth、absoluteStrokeWidth 和 api 同样支持 set/default 格式。图标自身的属性优先于外观默认值；切换备用图标时，按当前显示的图标集匹配。匿名元组或 JSON 数据使用 default。将图标集注册到 sources 后，通过名称引用图标即可应用对应 set 的默认值。sources 和 store 保持原有格式。",
  "In this example, the Tabler star is 24px, the Lucide star uses the 20px fallback, and the heart explicitly overrides its set to 32px.":
    "下面的示例中，Tabler 星形为 24px，Lucide 星形使用兜底值 20px，心形通过自身的 size 覆盖图标集配置，显示为 32px。",
  "md (20px); accepts a size or a set-to-size map with a default fallback":
    "md（20px）；支持单个尺寸，或按图标集配置的尺寸映射，以 default 兜底",
  "xs: 12, sm: 16, md: 20, lg: 24, xl: 28; shared or per-set preset dictionaries, merged by preset key":
    "xs: 12、sm: 16、md: 20、lg: 24、xl: 28；支持共享或按图标集配置预设字典，按预设名称合并",
  "1.5 on a 24-unit canvas; a number or a set-to-number map with default":
    "1.5，以 24 单位画布为基准；支持数值或按图标集配置的数值映射，以 default 兜底",
  "false; a boolean or a set-to-boolean map with default; enable with numeric pixel dimensions for a fixed rendered stroke":
    "false；支持布尔值或按图标集配置的布尔值映射，以 default 兜底；配合数值像素尺寸启用，可固定渲染后的描边粗细",
  "Local data, sets or lazy loaders; inherits parent sources":
    "本地数据、图标集或延迟加载器；继承父级来源",
  "Shared or per-set API with default; inherits the parent or application fallback; false disables requests for the selected set":
    "支持共享 API 或按图标集配置的 API 映射，以 default 兜底；继承父级或应用兜底加载器；false 禁用对应图标集的回退请求",
  "An existing IconStore; takes priority over sources and api on the same configuration":
    "已有 IconStore；优先于同一配置中的 sources 和 api",
  "Shared stores and SSR": "共享存储与 SSR",
  "Skip this until you need explicit cache management or server rendering. For cache limits, timeouts, concurrency or preloading, create an IconStore and pass it through the store option. Keep store, sources and API object identities stable within a mounted application so rerenders can reuse the cache.":
    "需要显式缓存管理或服务端渲染时再阅读。要设置缓存上限、超时、并发或预加载，请创建 IconStore 并通过 store 传入。在已挂载的应用中保持 store、sources 和 API 对象引用稳定，让重复渲染复用缓存。",
  "Create a separate store for each SSR request, not a module-level server singleton. Preload required icons before rendering and safely serialize store.snapshot() through your framework. Hydrate with createIconStore({ initialData, ... }) and enough maxEntries to retain the page’s icons.":
    "为每个 SSR 请求创建独立 store，不要使用服务端模块级单例。渲染前预加载所需图标，通过框架安全地序列化 store.snapshot()。水合时使用 createIconStore({ initialData, ... })，并设置足够的 maxEntries 保留页面图标。",
  "Creating configuration does not itself fetch icons during SSR. Use preloaded or inline data, static extraction or symbol references to keep server and client output consistent.":
    "创建配置本身不会在 SSR 中获取图标。使用预加载或内联数据、静态提取或 symbol 引用，保持服务端与客户端输出一致。",
  "Replace your example component with the code below. createIconConfig creates a scope: an object holding shared settings. Pass that object through scope on each Icon; Astro does not need a provider component.":
    "用下方代码替换示例组件。createIconConfig 创建一个保存共享设置的作用域对象。通过每个 Icon 的 scope 传入该对象；Astro 不需要配置组件。",
  "Create a child scope by passing the original scope as the second argument. Pass toolbarScope to the toolbar icon and keep scope on the page icon.":
    "将原作用域作为第二个参数，创建子作用域。工具栏图标使用 toolbarScope，页面图标继续使用 scope。",
  "Astro waits for icon loading on the server. Create request-local scopes in frontmatter; no client hydration is required for the SVG itself.":
    "Astro 在服务端等待图标加载。在 frontmatter 中创建请求级作用域，SVG 本身无需客户端水合。",
  "Configure the icones-icon tag with createIconConfig and defineIconElement. Start with a shared size, then override one icon and a group.":
    "使用 createIconConfig 和 defineIconElement 配置 icones-icon 标签。先共享尺寸，再覆盖单个图标和一组图标。",
  "In index.html, replace the @icones/vanilla/web-element import with the script below, then reload the page. createIconConfig creates a scope: an object holding shared settings. defineIconElement({ scope }) registers the HTML tag with those settings. Keep the icons in HTML.":
    "在 index.html 中，将 @icones/vanilla/web-element 导入替换为下方脚本，再刷新页面。createIconConfig 创建保存共享设置的作用域对象，defineIconElement({ scope }) 使用这些设置注册 HTML 标签。图标声明保留在 HTML 中。",
  "Use one registration path. Remove the automatic web-element import, do not add the new script beside it. A repeated defineIconElement call does not replace the first registration’s defaults; reload after changing this setup.":
    "只使用一种注册方式。移除 web-element 自动导入，不要将新脚本追加在它旁边。重复调用 defineIconElement 不会替换首次注册的默认值；修改配置后请刷新页面。",
  'Keep the same scope. Add size="32" to the heart in your HTML; the complete replacement example is below.':
    '保持原作用域，在 HTML 中为心形添加 size="32"。下方是完整替换示例。',
  "Create a child scope by passing the original scope as the second argument. Assign toolbarIcon.scope in JavaScript. A scope is an object, not an HTML string attribute; placing an icon inside a section does not assign a scope automatically.":
    "将原作用域作为第二个参数，创建子作用域。在 JavaScript 中设置 toolbarIcon.scope。作用域是对象，不是 HTML 字符串属性；把图标放进 section 不会自动为它分配作用域。",
  "Registration is safe to import on the server, but Web Components render only in a browser. Set element.scope to change a mounted icon’s scope. Disconnection cleans up automatically. For server-generated SVG markup, use core renderIcon; manually created SVG handles still require update and destroy.":
    "注册模块可安全地在服务端导入，但 Web 组件只在浏览器中渲染。设置 element.scope 可更改已挂载图标的作用域，断开连接会自动清理。服务端生成 SVG 请使用核心包的 renderIcon；手动创建的 SVG 句柄仍需调用 update 和 destroy。",
  "Configure ordinary i elements with createIconConfig and bindIcons. Start with a shared size, then override one icon and a group.":
    "使用 createIconConfig 和 bindIcons 配置普通 i 元素。先共享尺寸，再覆盖单个图标和一组图标。",
  "In index.html, replace the @icones/vanilla/standard-element import with the script below, then reload. createIconConfig creates a scope: an object holding shared settings. bindIcons({ scope }) uses it for the i elements it observes. Keep the icons in HTML.":
    "在 index.html 中，将 @icones/vanilla/standard-element 导入替换为下方脚本，再刷新页面。createIconConfig 创建保存共享设置的作用域对象，bindIcons({ scope }) 将其用于观察到的 i 元素。图标声明保留在 HTML 中。",
  "Remove the automatic standard-element import; do not keep it beside explicit initialization. Repeating bindIcons for the same root and attrPrefix returns its first handle without replacing its scope. Reload the page to try the replacement example.":
    "移除 standard-element 自动导入，不要与显式初始化并存。相同 root 和 attrPrefix 重复调用 bindIcons 会返回首次绑定，不会替换其作用域。刷新页面后再尝试替换示例。",
  'Keep the same scope. Add icon-size="32" to the heart in your HTML; the complete replacement example is below.':
    '保持原作用域，在 HTML 中为心形添加 icon-size="32"。下方是完整替换示例。',
  "Create a child scope by passing the original scope as the second argument. Initialize two separate roots: page-icons uses the page scope and toolbar uses toolbarScope. Replace the previous example and reload; do not keep a document-wide initializer that would already own both groups.":
    "将原作用域作为第二个参数，创建子作用域。初始化两个独立根节点：page-icons 使用页面作用域，toolbar 使用 toolbarScope。替换之前的示例并刷新；不要保留已经接管两组图标的文档级初始化器。",
  "The standard initializer is safe to import on the server and is a no-op without a DOM. In a browser it observes its configured root. Keep each handle and call destroy() when that view is disposed; removing individual hosts releases their SVG subscriptions. Use core renderIcon for server-generated SVG.":
    "标准元素初始化器可安全地在服务端导入，没有 DOM 时不执行操作。在浏览器中，它观察配置的根节点。保留每个绑定对象，在视图销毁时调用 destroy()；移除单个宿主会释放其 SVG 订阅。服务端生成 SVG 请使用核心包的 renderIcon。",
  "Keep icon props and local JSON data checked at the boundary.":
    "在边界处校验图标属性与本地 JSON 数据。",
  "Check your props": "检查属性类型",
  "Each adapter exports IconProps. Use satisfies to check an object while retaining the specific values inferred by TypeScript.":
    "各适配器均导出 IconProps。使用 satisfies 检查对象，同时保留 TypeScript 推断的具体值类型。",
  'IconName is provided by the lightweight @icones/names package and re-exported by every adapter, without installing the icon artwork. Use satisfies IconName to validate an exact bundled name, including its style suffix. IconName<"tabler"> narrows suggestions to one set. Name and IconProps still accept dynamic strings and custom sources; they do not guarantee that a name exists in the local collection.':
    'IconName 由轻量的 @icones/names 包提供，并经各适配器重新导出，无需安装图标图形数据。使用 satisfies IconName 校验完整的内置名称，包括样式后缀；IconName<"tabler"> 可将补全限定到一个集合。Name 和 IconProps 仍接受动态字符串与自定义来源，不保证名称一定存在于本地图标集中。',
  "IconName is provided by the lightweight @icones/names package and re-exported by the adapter. Validate a name with satisfies IconName before assigning it to an HTML attribute; native setAttribute and literal HTML attributes are still strings, not compile-time name checks.":
    "IconName 由轻量的 @icones/names 包提供，并经适配器重新导出。赋值 HTML 属性前可通过 satisfies IconName 校验名称；原生 setAttribute 和直接编写的 HTML 属性仍是字符串，不会自动进行名称类型检查。",
  "Validate local JSON": "校验本地 JSON",
  "Know your data format": "理解数据格式",
  "Type-check the initialization and updates for your selected HTML element.":
    "为所选 HTML 元素的初始化与更新提供类型检查。",
  "Type the initialization options": "初始化选项类型",
  "Use DefineIconElementOptions for registration. The package also types the icones-icon tag in HTMLElementTagNameMap, so querySelector can return an IconElement.":
    "使用 DefineIconElementOptions 检查注册选项。包还在 HTMLElementTagNameMap 中声明了 icones-icon 标签类型，因此 querySelector 可以返回 IconElement。",
  "Update the HTML attribute": "更新 HTML 属性",
  "Query the dedicated tag to get its typed load() method. A scope is a JavaScript object property; do not serialize it into an HTML attribute.":
    "查询专用标签即可获得类型化的 load() 方法。作用域是 JavaScript 对象属性，不要序列化为 HTML 属性。",
  "Use parseElementData to validate imported tuple JSON before adding it to a scope’s sources. HTML hosts do not have a JSON data attribute. The configuration chapter shows how to connect sources to this element.":
    "将导入的元组 JSON 加入作用域 sources 之前，使用 parseElementData 校验。HTML 宿主没有 JSON data 属性。配置章节会介绍如何将 sources 接入此元素。",
  "Register local data for this element": "为此元素注册本地数据",
  "Use IconBindingOptions for the initializer, not IconProps on the HTML host. HTML icon-* attributes remain strings.":
    "初始化器使用 IconBindingOptions，不要在 HTML 宿主上使用 IconProps。HTML 中的 icon-* 属性仍为字符串。",
  "Keep native DOM types on i. The initializer’s handle waits for mounted icons; it does not force deferred hosts to activate.":
    "保留 i 元素的原生 DOM 类型。初始化器返回的绑定对象等待已挂载图标完成，不会强制激活延迟渲染的宿主。",
  Accessibility: "无障碍",
  "Decide whether the icon adds meaning or simply accompanies visible text.":
    "区分图标是在传递信息，还是仅陪衬可见文本。",
  "Decorative icons": "装饰性图标",
  "Unlabelled icons are hidden from assistive technology by default. This is appropriate when adjacent text already explains the action, such as an icon next to the word Search.":
    "没有标签的图标默认对辅助技术隐藏。当相邻文本已说明操作时，这是合适的做法，例如“搜索”文字旁的图标。",
  "Meaningful icons": "传递信息的图标",
  'Give an icon that conveys information its own accessible label. role="img" identifies it as an image; aria-label provides the text alternative.':
    '为传递信息的图标提供无障碍标签。role="img" 将其标识为图像，aria-label 提供替代文本。',
  "Interactive controls": "交互控件",
  "For an icon-only action, use a real button or link and label that control. Keep the icon decorative inside it. The SVG should not have to reproduce keyboard focus, activation and disabled behavior itself.":
    "纯图标操作应使用真正的按钮或链接，并为该控件添加标签；内部图标保持装饰性。无需让 SVG 自行实现键盘焦点、激活和禁用行为。",
  "Do not rely on color alone to communicate a state, and keep labels meaningful when switching to alternative artwork.":
    "不要仅靠颜色表达状态，切换备选图形时也要保持标签含义清晰。",
  'Use svg-role="img" and label to label the generated SVG. Native role and aria-label remain on the host.':
    '使用 svg-role="img" 和 label 为生成的 SVG 添加标签。原生 role 和 aria-label 保留在宿主上。',
  'Use icon-role="img" and icon-label to label the generated SVG. Native role and aria-label remain on the host.':
    '使用 icon-role="img" 和 icon-label 为生成的 SVG 添加标签。原生 role 和 aria-label 保留在宿主上。',
  Alternative: "备选图标",
  "Switch between primary and alternative artwork, using names or inline data.":
    "使用名称或内联数据，在主图标与备选图标之间切换。",
  "Use inline data for either state": "为任一状态使用内联数据",
  "data and altData accept an individual Iconify data object or an element tuple array. You can use names for both states, data for both states, or a name in one group and data in the other.":
    "data 和 altData 支持单个 Iconify 数据对象或元素元组数组。两个状态可以都使用名称、都使用数据，也可以一组用名称、另一组用数据。",
  "Do not pass a name string or an entire icon collection to data or altData. Register collections in sources, then select the primary and alternative icons with name and altName.":
    "不要将名称字符串或整个图标集传给 data 或 altData。请先将图标集注册到 sources，再通过 name 和 altName 选择主图标与备选图标。",
  "With showAlt enabled, altData takes priority over altName. Without an alternative source, the primary icon remains selected. A missing or failed alternative does not switch back to the primary icon.":
    "启用 showAlt 时，altData 优先于 altName。未提供任何备选来源时保留主图标；已指定的备选图标缺失或加载失败时，不会自动切回主图标。",
  "Object-valued data and altData belong to the JavaScript createIcon/mountIcon API, not HTML attributes. For standard elements and Web Components, register data in sources and use the name and alternative-name attributes.":
    "对象形式的 data 和 altData 用于 JavaScript 的 createIcon/mountIcon API，不是 HTML 属性。标准元素和 Web 组件应先将数据注册到 sources，再通过主图标与备选图标的名称属性引用。",
  "For a whole icon set, register it in sources and select icons by name or altName instead of passing the set alongside a name prop.":
    "使用整套图标集时，先将其注册到 sources，再通过 name 或 altName 选择图标，不要同时传入整套数据和名称属性。",
  "Switch to a second, explicitly named drawing for a different state.":
    "通过第二个明确命名的图形表示不同状态。",
  "Define an alternative": "定义备选图标",
  "altName identifies the second icon. showAlt selects it; false or an omitted attribute keeps the primary name.":
    "altName 指定第二个图标，showAlt 选择它；false 或省略属性时保留主图标名称。",
  "Follow application state": "跟随应用状态",
  "Bind showAlt to your framework’s boolean state. When using names, keep them explicit so the Vite plugin can collect both drawings.":
    "将 showAlt 绑定到框架中的布尔状态。使用名称时，保持名称显式可见，让 Vite 插件收集两份图形。",
  "An alternative is not a fallback": "备选图标不是加载回退",
  "Alternative selection is intentional, not an error recovery mechanism. If the active drawing cannot load, use fallback content or handle the loading state. The adapter does not invent a filled counterpart.":
    "备选图标是有意的状态选择，并非错误恢复机制。当前图形无法加载时，请使用回退内容或处理加载状态。适配器不会自动生成填充版本。",
  "Set showAlt from your server-side state when rendering the page. For changes after page load, use a client framework component or the vanilla adapter.":
    "服务端渲染页面时，根据服务端状态设置 showAlt。页面加载后需要更新时，使用客户端框架组件或 Vanilla 适配器。",
  "alt-name identifies the second icon. show-alt selects it; false or an omitted attribute keeps the primary name.":
    "alt-name 指定第二个图标，show-alt 选择它；false 或省略属性时保留主图标名称。",
  'Keep name and alt-name on the host, then use element.setAttribute("show-alt", "true") or "false". The Web Component observes the change.':
    '在宿主上保留 name 和 alt-name，再使用 element.setAttribute("show-alt", "true") 或 "false"。Web 组件会观察此变化。',
  "icon-alt-name identifies the second icon. icon-show-alt selects it; false or an omitted attribute keeps the primary name.":
    "icon-alt-name 指定第二个图标，icon-show-alt 选择它；false 或省略属性时保留主图标名称。",
  'Keep icon-name and icon-alt-name on the host, then use element.setAttribute("icon-show-alt", "true") or "false". The standard initializer observes the change.':
    '在宿主上保留 icon-name 和 icon-alt-name，再使用 element.setAttribute("icon-show-alt", "true") 或 "false"。标准元素初始化器会观察此变化。',
  "Global Styling": "全局样式",
  "Let icons share the colors and dimensions of your design system.":
    "让图标共享设计系统的颜色与尺寸。",
  "Use a shared class": "使用共享样式类",
  "Apply a class directly to the icon. The adapter forwards it to the root SVG, so your stylesheet works with both inline drawings and external symbols.":
    "直接为图标添加 class。适配器会将其传递给根 SVG，让样式表同时适用于内联图形和外部 symbol。",
  "Connect design tokens": "接入设计变量",
  "Use CSS to control the root SVG’s color and dimensions. Keep strokeWidth on the icon when you need a specific outline weight.":
    "使用 CSS 控制根 SVG 的颜色和尺寸。需要特定描边粗细时，在图标上保留 strokeWidth。",
  "Respect rendering boundaries": "注意渲染边界",
  "Prefer styling the root SVG. A selector aimed at an internal path cannot reach inside an external symbol document. Fixed colors and explicit fill values in the original artwork remain intentional.":
    "优先为根 SVG 设置样式。针对内部 path 的选择器无法进入外部 symbol 文档。原始图形中的固定颜色与显式 fill 值仍会保留。",
  "Share application defaults with IconConfig":
    "通过 IconConfig 共享应用默认值",
  "Use svg-class to style the generated SVG directly; class and style remain on the icones-icon host. Because there is no Shadow DOM, global CSS can also target icones-icon > svg.":
    "用 svg-class 直接设置生成 SVG 的样式；class 和 style 保留在 icones-icon 宿主上。由于没有 Shadow DOM，全局 CSS 也可选择 icones-icon > svg。",
  "Use CSS to control the root SVG’s color and dimensions. Keep stroke-width on the icon when you need a specific outline weight.":
    "使用 CSS 控制根 SVG 的颜色和尺寸。需要特定描边粗细时，在图标上保留 stroke-width。",
  "Use icon-class to style the generated SVG directly; class and style remain on the i host. Because there is no Shadow DOM, global CSS can also target i[icon-name] > svg.":
    "用 icon-class 直接设置生成 SVG 的样式；class 和 style 保留在 i 宿主上。由于没有 Shadow DOM，全局 CSS 也可选择 i[icon-name] > svg。",
  "Use CSS to control the root SVG’s color and dimensions. Keep icon-stroke-width on the icon when you need a specific outline weight.":
    "使用 CSS 控制根 SVG 的颜色和尺寸。需要特定描边粗细时，在图标上保留 icon-stroke-width。",
  Overview: "概览",
  "Independent collections, one workflow.": "独立图标集，统一使用流程。",
  "Your use case": "使用场景",
  "A starting point": "建议起点",
  "A few fixed graphics": "少量固定图形",
  "Export standalone SVG. No Icones runtime is required.":
    "导出独立 SVG，无需 Icones 运行时。",
  "Component props and known icon names": "使用组件属性，且名称已知",
  "Use your framework adapter with Vite extraction and local collections.":
    "使用对应框架适配器，通过 Vite 提取本地图标集中的图形。",
  "Runtime names without network requests": "动态名称，不允许网络请求",
  "Register the required local data in sources and disable the runtime API.":
    "将所需本地数据注册到 sources，并禁用运行时 API。",
  "Runtime names from a larger catalog": "从较大目录中动态选择图标",
  "Configure a loader or HTTP API and provide a loading or error fallback.":
    "配置加载器或 HTTP API，并提供加载中或失败时的回退内容。",
  "Installing an adapter or importing name types does not load the full catalog. Choose where the artwork comes from before relying on a named icon.":
    "安装适配器或导入名称类型不会加载整个目录。使用名称引用图标前，请先明确图形数据的来源。",
  "Adjust icons drawn with SVG strokes. Filled paths keep their original shape.":
    "调整使用 SVG 描边绘制的图标；以填充路径绘制的图形保持原样。",
  "An Outline label does not guarantee editable strokes: bootstrap:star is a filled path. Phosphor Regular uses strokes that respond to strokeWidth, while Phosphor Fill uses filled shapes that keep their geometry.":
    "Outline 标签不代表一定能调整描边：bootstrap:star 使用填充路径。Phosphor Regular 使用可通过 strokeWidth 调整的描边，而 Phosphor Fill 使用填充图形，其形状不会随线宽变化。",
  "defaultSize, sizeValues, strokeWidth and absoluteStrokeWidth accept shared values or maps keyed by set. Use default for unmatched sets. For sizeValues, each set contains its own preset dictionary; missing presets fall back to default, then the built-in values. The original flat form, such as sizeValues: { lg: 28 }, still works for shared presets.":
    "defaultSize、sizeValues、strokeWidth 和 absoluteStrokeWidth 都支持共享值或按图标集配置的映射，未匹配的图标集使用 default。sizeValues 在每个图标集下保存独立的预设字典，缺失的预设依次回退到 default 和内置值。原来的扁平写法（如 sizeValues: { lg: 28 }）仍可用于共享预设。",
  "To route sets independently, pass a per-set map to api, as in the second example. Tabler uses fetch, Flag uses same-origin symbols, and default: false disables fallback requests for other sets. Each entry also accepts a URL string or custom loader function. Local sources still take priority; explicit per-icon loaders are not disabled by api: false.":
    "需要为不同图标集选择加载方式时，将第二个示例中的映射传给 api：Tabler 使用 fetch，Flag 使用同源 symbol，default: false 禁用其他图标集的回退请求。每一项也支持 URL 字符串或自定义加载函数。本地 sources 仍然优先；api: false 不会禁用图标自身显式指定的 loader。",
  "API maps inherit parent entries and the parent or application fallback. An entry replaces that set’s entire API configuration, rather than merging URL or request options. A shared API value, including false, replaces the whole inherited map. API option keys such as type, baseUrl, url and fetch are reserved for shared API objects, not set prefixes.":
    "API 映射继承父级条目以及父级或应用的兜底加载器。覆盖某一项时会替换该图标集的完整 API 配置，不会合并 URL 或请求选项。传入共享 API 值（包括 false）会替换整个继承的映射。type、baseUrl、url、fetch 等 API 选项名是共享 API 对象的保留键，不能作为此映射的图标集前缀。",
}
