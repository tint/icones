/** Rendering guide and contextual links from the appearance tutorials. */
export const renderingMessages: Readonly<Record<string, string>> = {
  "Ant Design": "Ant Design",
  "Rendering fundamentals": "渲染原理",
  "Choose a framework": "选择框架",
  "Rendering methods": "渲染方式",
  "Vite and API loading": "Vite 与 API",
  "Prop support": "属性支持",
  "Collection differences": "图标集差异",
  "These are options to pass to your adapter, not a standalone renderer. With showAlt: true, the inline arrowData is selected even if the primary name was compiled as a symbol. Change showAlt to false to return to the named icon.":
    "这些是传给适配器的选项，不是独立渲染器。showAlt: true 时选择内联 arrowData，即使主图标名称被编译为 symbol；改为 false 后回到命名图标。",
  "The examples are shared configuration objects, not code that starts requests by itself. Pass one to the configuration API of your chosen adapter. Choose your framework in the sidebar for the provider or initialization syntax; the loading rules here do not change.":
    "示例是共享配置对象，不会自行发起请求。将其中一个传给所用适配器的配置 API。通过侧栏选择框架，可查看对应的 provider 或初始化语法；本章的加载规则不随框架变化。",
  "Understand icon data, external symbols and source selection before choosing a framework integration.":
    "先理解图标数据、外部 symbol 和来源选择，再选择框架接入方式。",
  "Choose build-time output and runtime loading independently, then deploy the endpoints each path needs.":
    "分别选择构建时输出与运行时加载方式，并部署它们所需的资源或接口。",
  "Compare each prop in data and symbol rendering, with concrete examples and shared defaults.":
    "逐项对照属性在 data 与 symbol 渲染下的效果，并通过具体示例理解默认值和限制。",
  "Choose artwork that responds to your intended color, stroke and size adjustments.":
    "根据图形画法选择图标，确认颜色、描边和尺寸调整能达到预期。",
  "Supply a single icon’s data": "传入单个图标的数据",
  "Icones accepts an element tuple array or an icon object with an SVG body and viewport dimensions. These are data formats, not a third rendering mode. Both produce inline SVG nodes; a whole collection belongs in sources, not the data prop.":
    "Icones 接收元素元组数组，或包含 SVG body 和视口尺寸的图标对象。它们是数据格式，不是第三种渲染模式；两者都生成内联 SVG 节点。整个图标集应注册到 sources，而不是传给 data。",
  "This small arrow is self-contained. The first example is the tuple form; the second represents the same drawing as an icon object. Use one form at a time. For imported JSON, validate tuples with your adapter’s parseElementData export rather than wrapping the array in a body property.":
    "下面的箭头无需额外加载数据。第一个示例使用元组，第二个用图标对象表达相同图形，选择其一即可。导入 JSON 时，可用适配器导出的 parseElementData 校验元组，不要把数组包进 body 属性。",
  "Anonymous data uses shared/default appearance settings. Register data under a name such as custom:arrow in sources if it needs per-set defaults. Do not supply name and data together just to attach a set name.":
    "匿名数据使用共享/default 外观设置。需要按图标集配置时，应将数据以 custom:arrow 等名称注册到 sources。不要为了指定图标集而同时传入 name 和 data。",
  "Connect and verify your endpoints": "接入并检查实际接口",
  "Setting an API URL does not create a server. The default fetch protocol expects a collection JSON endpoint; if your deployment serves one JSON file per icon instead, provide url. That response must contain supported icon data, such as the tuple array from Rendering methods.":
    "配置 API URL 不会创建服务。默认 fetch 协议请求图标集 JSON 接口；如果部署的是每个图标一个 JSON 文件，应提供 url。响应必须包含支持的图标数据，例如“渲染方式”中的元组数组。",
  "A custom symbol URL must include the fragment ID of a real symbol. Serve the SVG from the same origin as the page and make viewBox match that symbol. A JSON URL is not a substitute for an SVG URL.":
    "自定义 symbol URL 必须带有实际 symbol 的片段 ID。SVG 应与页面同源，并确保 viewBox 与该 symbol 一致。JSON URL 不能代替 SVG URL。",
  "For fetch, inspect the requested JSON, HTTP status and response shape. Use transform only to unwrap your own response envelope; use fetch/requestInit for request options. Never embed server secrets in browser configuration.":
    "fetch：检查 JSON 请求、HTTP 状态和响应结构。自定义响应外壳可通过 transform 解包，请求选项使用 fetch/requestInit。不要把服务端密钥写进浏览器配置。",
  "For symbol, inspect the SVG request and its symbol ID. There is no JavaScript JSON response to transform, and symbol configuration does not accept fetch/requestInit. A ready reference is not a confirmed download.":
    "symbol：检查 SVG 请求及其中的 symbol ID。它没有可供 transform 处理的 JavaScript JSON 响应，也不接收 fetch/requestInit。引用已就绪不代表下载已成功。",
  "Deploy the Vite-generated Sprite or per-icon symbol assets together with the app. Deploy runtime API endpoints separately when needed. Test a collected name, a runtime-only name and direct data so all configured paths are covered.":
    "将 Vite 生成的 Sprite 或逐图标 symbol 资源与应用一同部署；按需单独部署运行时 API。分别检查已收集名称、仅运行时名称和直接传入的数据，覆盖实际使用的各条路径。",
  "Review accepted data formats": "查看支持的数据格式",
  "Check property behavior after loading": "检查加载后的属性效果",
  "A hollow shape is not necessarily a stroke": "中空图形不一定是描边",
  "These two squares look similar, but their geometry is different. The first is a stroked rectangle; the second is a filled path with a hole. strokeWidth changes the first one, not the second. This distinction survives both data and symbol rendering.":
    "下面两个方框外观相近，但结构不同：第一个是描边矩形，第二个是中间留空的填充路径。strokeWidth 能调整前者，不能调整后者；data 与 symbol 渲染都遵循这个区别。",
  "Change the standalone SVG’s stroke-width from 2 to 4: only the stroked square gets heavier. In an Icones adapter, use strokeWidth for the same kind of adjustment. Choose a separately designed filled variant when you want a different silhouette.":
    "把独立 SVG 的 stroke-width 从 2 改成 4，只有描边方框会变粗。使用 Icones 适配器时，通过 strokeWidth 进行同类调整。需要不同轮廓时，应选择专门绘制的填充版本。",
  "Preserve colors and source proportions": "保留原始配色与比例",
  "color changes currentColor paint, not a fixed palette. A brand mark or flag with explicit colors keeps them. size changes the display box, not the geometry: equal pixel sizes across collections can still look different in weight and occupied area.":
    "color 改变 currentColor，不会替换固定配色。显式指定颜色的品牌标志或旗帜会保留原色。size 调整显示区域而非几何形状，因此不同图标集即使像素尺寸相同，视觉粗细和占比仍可能不同。",
  "Keep the original viewport when importing data. Named Flag variants use their own coordinates; a 4:3 flag remains a 4:3 drawing inside a square display box. Select the square or circle variant when that is the artwork you need.":
    "导入数据时应保留原始视口。命名 Flag 版本有各自的坐标；4:3 旗帜放进正方形显示区域后，仍是 4:3 图形。需要正方形或圆形画法时，应选择对应版本。",
  "Changing color recolors the left circle; the right one stays red. The same rule applies to inline data and compatible external symbols. Inspect the original SVG or JSON before assuming a prop is broken.":
    "修改 color 时，左侧圆形会变色，右侧仍保持红色。内联 data 与兼容的外部 symbol 都遵循该规则。怀疑属性失效前，先检查原始 SVG 或 JSON。",
  "Runtime symbol viewport": "运行时 symbol 的视口",
  "Vite registers the generated symbol’s viewBox. A symbol API builds a URL without reading the file: it assumes 24 × 24 except for the built-in Flag names. Icones’ symbol service follows that contract; set api.viewBox to the actual symbol viewport when using a custom service.":
    "Vite 会注册生成 symbol 的 viewBox。symbol API 只拼接 URL、不读取文件，除内置 Flag 名称外，默认按 24 × 24 处理。Icones 的 symbol 服务遵循这一约定；自定义服务应通过 api.viewBox 指定实际 symbol 视口。",
  "With tabler:star available through either data or an Icones symbol, this example produces a 48px box, purple strokes at 2px and a 90° rotation. Removing absoluteStrokeWidth makes the stroke 4px at this size. Switching to tabler:star-filled keeps size, color and rotation working, but strokeWidth cannot reshape its filled silhouette.":
    "当 tabler:star 通过 data 或 Icones symbol 可用时，此例都会得到 48px 显示区域、2px 紫色描边和 90° 旋转。移除 absoluteStrokeWidth 后，在该尺寸下描边会变为 4px。换成 tabler:star-filled 时，尺寸、颜色和旋转仍生效，但 strokeWidth 无法改变填充轮廓。",
  "See how Vite mode and API type select data or symbol rendering, then check exactly which props work in each path.":
    "先弄清 Vite mode 与 API type 如何决定 data 或 symbol 渲染，再对照各属性在两种渲染下的效果与限制。",
  "Two rendering results: data or symbol": "先看最终结果：data 还是 symbol",
  "Both paths render an SVG element. The difference is what is inside it: data renders the actual paths in the page; symbol renders a use element that references an external SVG file. Symbol is not an image tag, and it does not mean all appearance props are disabled.":
    "两种方式都会渲染 SVG 元素，区别在于里面放什么：data 把 path 等图形节点直接放进页面；symbol 使用 use 元素引用外部 SVG 文件。symbol 不是 img，也不代表外观属性全部失效。",
  'Here, data means inline rendering, not only the data prop. It can come from data/altData, local sources, a fetch API, or Vite mode: "svg". A symbol reference can come from Vite mode: "sprite" or "symbol", or api.type: "symbol".':
    '本页的 data 指内联渲染，不仅指 data 属性。data/altData、本地 sources、fetch API、Vite mode: "svg" 都可以提供数据；symbol 引用则可来自 Vite mode: "sprite"、"symbol" 或 api.type: "symbol"。',
  "These simplified output shapes show the distinction; the real renderer also supplies sizing, stroke configuration, accessibility and transforms.":
    "下面是简化后的输出结构，实际渲染还会添加尺寸、描边配置、无障碍属性和变换。",
  "To identify the path, inspect the rendered SVG: actual drawing nodes such as path/circle mean data; a use element with an external href means symbol. Do not infer it from the Vite setting alone.":
    "判断方式：检查渲染后的 SVG。内部有实际 path、circle 等图形节点时是 data；通过 use 的外部 href 引用图形时是 symbol。不要只看 Vite 配置来判断。",
  "Vite mode and API type control different stages":
    "Vite mode 与 API type 管的是不同阶段",
  "Vite mode controls build output for names the plugin collects. API type controls runtime resolution only when the selected name is not already compiled or available from the store’s data sources. They are independent settings; neither overrides the other globally.":
    "Vite mode 决定插件收集到的名称如何输出；API type 决定运行时未命中已编译图标或 store 数据来源的名称如何加载。它们是独立设置，不存在一个全局覆盖另一个的关系。",
  "Computed icon names are not collected automatically. When an interface can select from a known list of complete collections, map each allowed prefix to an explicit dynamic import of virtual:icones/set/<prefix>. Loading that module registers every name in the set against the generated Sprite chunks, so components can use dynamic names without per-icon JSON requests.":
    "动态计算的图标名称不会被自动收集。如果界面会从一组已知的完整图标集中选择，请把每个允许的前缀映射到 virtual:icones/set/<prefix> 的显式动态导入。加载该模块会把集合中的所有名称注册到生成的 Sprite chunk，因此组件可以使用动态名称，而无需逐图标请求 JSON。",
  Setting: "配置",
  "When it applies": "何时生效",
  "Rendering result": "渲染结果",
  'mode: "sprite" (default)': 'mode: "sprite"（默认）',
  'mode: "svg"': 'mode: "svg"',
  'mode: "symbol"': 'mode: "symbol"',
  'api: { type: "fetch" }': 'api: { type: "fetch" }',
  'api: { type: "symbol" }': 'api: { type: "symbol" }',
  "Build time: collected names.": "构建时：插件收集到的名称。",
  "One or more generated SVG sprite chunks + registered fragment URLs → external use references.":
    "生成一个或多个 SVG Sprite chunk 并注册片段 URL → use 引用外部图形。",
  "Data in the JavaScript module → inline SVG nodes.":
    "数据写入 JavaScript 模块 → 内联 SVG 节点。",
  "One generated SVG per icon + registered URL → external use reference.":
    "每个图标生成一个 SVG 并注册 URL → use 引用外部图形。",
  "Runtime: a name not resolved by compiled artwork or local sources.":
    "运行时：未被编译图形或本地 sources 解析的名称。",
  "JavaScript requests JSON → data → inline SVG nodes.":
    "JavaScript 请求 JSON → data → 内联 SVG 节点。",
  "Build a URL → external use reference; the browser loads the SVG.":
    "生成 URL → use 引用外部图形；由浏览器加载 SVG。",
  'Vite defaults to mode: "sprite" and spriteGroupBy: "all". It emits one <assetsDir>/sprite.svg while the generated SVG is at most 256 KiB, then automatically emits numbered chunks such as sprite-1.svg. Set spriteGroupBy: "set" to emit <assetsDir>/<set>/sprite.svg and apply the size limit independently within each set. Configure the raw-byte limit with spriteMaxBytes or set it to false to disable size chunking. Use mode: "symbol" for one SVG per icon or mode: "svg" for inline data; there is no mode: "data" or mode: "inline". A normal API options object defaults to type: "fetch". Omitting api uses the parent/application loader, whose root default is https://<set>.icones.go-slim.dev/data/<name>.json, so omission is not an offline setting. emitData only controls emitted JSON files, not the rendering path. fallbackToApi: false disables the plugin’s build-time fallback, not the runtime service; use IconConfig api: false for offline runtime behavior.':
    'Vite 默认 mode: "sprite" 且 spriteGroupBy: "all"。生成的 SVG 不超过 256 KiB 时输出一个 <assetsDir>/sprite.svg，超过后自动输出 sprite-1.svg 等编号 chunk。设置 spriteGroupBy: "set" 后会输出 <assetsDir>/<set>/sprite.svg，并在每个图标集内分别应用大小限制。可通过 spriteMaxBytes 配置原始字节上限，或设为 false 关闭大小分块。mode: "symbol" 会为每个图标输出一个 SVG，mode: "svg" 则使用内联数据；不存在 mode: "data" 或 mode: "inline"。普通 API 选项对象省略 type 时按 fetch 处理；省略 api 会使用父级或应用加载器，其根默认值是 https://<set>.icones.go-slim.dev/data/<name>.json，因此不表示离线。emitData 只控制是否输出 JSON 文件，不决定渲染方式。fallbackToApi: false 关闭插件的构建期回退，不会关闭运行时服务；离线运行请设置 IconConfig api: false。',
  "Combine mode and type: what actually renders?":
    "mode 与 type 组合后，实际怎么渲染？",
  "Read each column separately. “Collected name” means its Vite-generated module has loaded; “runtime-only name” means it is absent from compiled artwork, the store cache and local sources. The table assumes no per-icon loader override.":
    "请分列阅读：已收集名称指对应的 Vite 生成模块已经加载；仅运行时名称指编译图形、store 缓存及本地 sources 均未命中。下表假设没有为单个图标指定 loader。",
  "Collected name": "已收集名称",
  "Runtime-only name": "仅运行时名称",
  "Data: from the bundle.": "data：来自构建产物。",
  "Data: after a JSON request.": "data：请求 JSON 后渲染。",
  "Symbol: reference the API’s SVG URL.": "symbol：引用 API 的 SVG URL。",
  "Symbol: reference the generated sprite.": "symbol：引用构建生成的 Sprite。",
  "Symbol: reference a generated asset.": "symbol：引用构建生成的资源。",
  "Direct data / altData and data resolved from sources always render inline, including when Vite or the runtime API uses symbols. A name alone does not tell you which path is used.":
    "直接传入 data / altData，以及从 sources 解析得到的数据，始终内联渲染，即使 Vite 或运行时 API 使用 symbol。仅凭 name 属性无法判断渲染方式。",
  "With api: false, unresolved runtime names have no API fallback. Already compiled data/symbols and local data still work; a compiled Sprite or per-icon symbol still requires its SVG asset to be served.":
    "api: false 只关闭未解析名称的 API 回退。已编译的 data/symbol 和本地数据仍可用；编译出的 Sprite 或逐图标 symbol 仍需能够访问对应的 SVG 资源。",
  'With baseUrl: "/icons", fetch requests /icons/tabler.json?icons=star and reads JSON. Symbol references /icons/tabler/star.svg#icon. These are different endpoints; changing type does not convert a JSON service into a symbol service.':
    '当 baseUrl: "/icons" 时，fetch 请求 /icons/tabler.json?icons=star 并读取 JSON；symbol 引用 /icons/tabler/star.svg#icon。这是两种不同接口，切换 type 不会把 JSON 服务转换为 symbol 服务。',
  "For symbol, no JavaScript JSON fetch does not mean no network request: the browser loads the external SVG. Serve it from the page’s origin with the matching symbol ID; configuring api does not create these files or a server.":
    "symbol 不发起 JavaScript JSON 请求，不等于没有网络请求：外部 SVG 由浏览器加载。应以同源 URL 提供包含正确 symbol ID 的 SVG；配置 api 本身不会创建文件或服务。",
  "Choose one configuration for your application, not both. A runtime symbol is marked referenced when its URL is ready, not when the browser successfully loads it. Missing external SVG files are not reported as the JSON loader’s missing/error state; check the browser Network panel. Data fetches, by contrast, can report loading, missing and error through the store.":
    "应用时选择其中一种配置，不要同时使用两者。运行时 symbol 的 referenced 只表示 URL 已就绪，不代表浏览器已成功加载；外部 SVG 丢失不会被报告为 JSON 加载器的 missing/error 状态，应检查浏览器 Network 面板。data 的 fetch 请求则可通过 store 报告 loading、missing 和 error。",
  "Apply API configuration in your framework": "在当前框架中接入 API 配置",
  "Vite mode": "Vite 输出模式",
  "API type": "API 加载类型",
  "Prop support: data versus symbol": "属性对照：data 与 symbol",
  "Yes means the prop controls the rendered SVG. Conditional means the artwork must support it. The symbol column assumes symbols generated by Icones (from Vite or the symbol service), not arbitrary third-party SVG files.":
    "“生效”表示属性能够控制渲染结果；“有条件”表示还要看图形本身。symbol 列以 Icones 生成的 symbol 为前提（Vite 产物或 symbol 服务），不代表任意第三方 SVG 都支持。",
  "The prop names below are JavaScript names. Use the documented attribute spellings for Vanilla HTML. Astro renders these values on the server; changing client-side state requires a client integration. Mode and type do not add client reactivity to an adapter.":
    "下表使用 JavaScript 属性名，Vanilla HTML 请使用对应属性写法。Astro 在服务端渲染这些值，客户端状态变化需要客户端集成；mode 和 type 不会给适配器增加客户端响应能力。",
  "Data · inline SVG": "data · 内联 SVG",
  "Symbol · external use": "symbol · 外部 use",
  "size / width / height": "size / width / height",
  "rotate / hFlip / vFlip": "rotate / hFlip / vFlip",
  "altName / altData / showAlt": "altName / altData / showAlt",
  "class / className / style": "class / className / style",
  "aria-label / aria-hidden / role": "aria-label / aria-hidden / role",
  "Yes. Changes the SVG box; explicit size wins over width/height.":
    "生效。调整 SVG 显示区域；显式 size 优先于 width/height。",
  "Yes. Changes the SVG box around the reference, not the source file.":
    "生效。调整引用外层 SVG 的显示区域，不修改源文件。",
  "Conditional. Changes currentColor paint; fixed colors remain unchanged.":
    "有条件。改变 currentColor 颜色；固定颜色不变。",
  "Conditional. currentColor inherits through use; fixed internal colors remain unchanged.":
    "有条件。currentColor 可通过 use 继承；内部固定颜色不变。",
  "Conditional. Inherits only where artwork has no explicit fill; can supply missing fills in tuple data.":
    "有条件。仅影响未显式设置 fill 的图形；可补充元组数据缺失的 fill。",
  'Conditional. Explicit internal fill wins. Generated tuple symbols bake missing root fills as fill="none", so the prop cannot fill those shapes afterward.':
    '有条件。内部显式 fill 优先。元组生成 symbol 时，缺失的根级 fill 会固定为 fill="none"，之后无法通过此属性填充这些形状。',
  "Conditional. Changes eligible SVG strokes on a 24-unit basis, not the outline of a filled path. Default: 1.5.":
    "有条件。以 24 单位为基准调整支持改写的 SVG 描边，不会改变填充路径的轮廓。默认值：1.5。",
  "Conditional, not disabled. Icones symbols inherit --icones-stroke-width. Filled paths and fixed-color strokes keep their drawing; arbitrary symbols with fixed widths may ignore it.":
    "有条件，并非不支持。Icones symbol 继承 --icones-stroke-width；填充路径和固定颜色描边保持原画法，固定线宽的第三方 symbol 可能不响应。",
  "Conditional. Requires eligible strokes and resolved dimensions in numeric pixels or px strings; later CSS resizing and relative units are not measured.":
    "有条件。需要可调整的描边，且最终尺寸为数值像素或 px 字符串；无法测量相对单位或后续 CSS 调整。",
  "Same conditions. Keeps compatible symbol strokes at a fixed pixel weight; it is not a way to make filled artwork thinner.":
    "条件相同。可固定兼容 symbol 的像素描边宽度，但不能把填充图形变细。",
  "Yes. Transforms the drawing; rotate: 1 means 90°.":
    "生效。变换图形；rotate: 1 表示 90°。",
  "Yes. Transforms the referenced drawing without editing its source SVG.":
    "生效。变换被引用图形，无需修改外部 SVG。",
  "Yes. Selects the alternative source; it may render as data or symbol.":
    "生效。选择备选来源，备选图标可渲染为 data 或 symbol。",
  "Yes. Can switch from a primary symbol to inline altData, or another named symbol.":
    "生效。可从主图标 symbol 切换到内联 altData，或另一个命名 symbol。",
  "Yes. Styles the root SVG using the adapter’s supported attributes.":
    "生效。使用适配器支持的属性设置根 SVG 样式。",
  "Yes on the root SVG. This does not grant access to paths inside the external file.":
    "对根 SVG 生效，但不表示能够访问外部文件内部的路径。",
  "Yes. Internal nodes are in the page DOM; selectors depend on the drawing.":
    "生效。内部节点位于页面 DOM 中；选择器取决于图形结构。",
  "No. Page selectors cannot target paths inside the external SVG. Use root props or edit the source artwork.":
    "不生效。页面选择器无法选中外部 SVG 内的路径，请使用根属性或修改源图形。",
  "Yes. Labels or hides the root SVG.":
    "生效。为根 SVG 添加语义或隐藏装饰图标。",
  "Yes. Labels or hides the root SVG containing use.":
    "生效。为包含 use 的根 SVG 添加语义或隐藏装饰图标。",
  "CSS path selectors": "CSS 路径选择器",
  "Import one option into your existing IconConfig setup. For Astro, pass it as the Icon config; for Vanilla, pass it to createIconConfig and connect the resulting scope to your elements. The IconConfig guide shows the complete wiring for your selected framework.":
    "将其中一个配置导入已有的 IconConfig 用法中。Astro 将它作为 Icon 的 config；Vanilla 传给 createIconConfig 后，将生成的作用域连接到元素。IconConfig 指南提供当前框架的完整接入代码。",
  "Within the selected group, data wins over name and altData wins over altName. Supplying both in either group logs console.error, including an inactive alternative group. showAlt selects the alternative group only when one is provided; otherwise the primary remains selected.":
    "在被选中的组内，data 优先于 name，altData 优先于 altName。同组两者同时传入会输出 console.error，未显示的备选组也会检查。只有提供了备选来源，showAlt 才切换到备选组；否则仍显示主图标。",
  "Rendering and prop support": "渲染与属性支持",
  "Understand which props change your artwork, what Vite’s output modes produce, and where their behavior differs.":
    "了解不同图形支持哪些属性、Vite 的各输出模式分别产生什么，以及不同渲染路径的行为差异。",
  "Check the drawing, not just the collection name":
    "判断图形的画法，而不只看图标集名称",
  "IconProps has the same meaning across collections, but not every drawing can respond to every prop. size changes the SVG box; color only reaches currentColor; strokeWidth only changes actual SVG strokes. A hollow-looking shape may be a filled path with a hole, not a stroke.":
    "IconProps 在不同图标集中含义一致，但不是每个图形都会响应所有属性。size 改变 SVG 的显示尺寸；color 只影响 currentColor；strokeWidth 只调整真正的 SVG 描边。看起来中空的线框，也可能是中间留空的填充路径，而不是描边。",
  "The following describes the collections currently available in this catalog. Individual icons and separately imported versions can differ. In the icon detail dialog, inspect the original JSON or exported SVG when an adjustment has no visible effect.":
    "下表描述的是当前目录中提供的图标集；单个图标或自行导入的其他版本可能不同。调整属性后看不到变化时，可在图标详情弹窗中检查原始 JSON 或导出的 SVG。",
  "Color behavior": "颜色表现",
  Collection: "图标集",
  "Stroke-width behavior": "描边宽度的影响",
  "Outline drawings use currentColor strokes; filled variants use currentColor fills.":
    "线框图形使用 currentColor 描边，填充版本使用 currentColor 填充。",
  "Changes outline strokes, e.g. tabler:star; does not reshape tabler:star-filled.":
    "可调整 tabler:star 等线框图标的描边；不会改变 tabler:star-filled 的形状。",
  "Primarily currentColor strokes.": "主要使用 currentColor 描边。",
  "Changes strokes, e.g. lucide:star.": "可调整描边，例如 lucide:star。",
  "Mostly currentColor outlines, with some filled details.":
    "主要是 currentColor 线框，部分细节使用填充。",
  "Changes stroke-based parts; filled details keep their shape. Check each drawing.":
    "可调整描边部分；填充细节保持原有形状，需要逐个图形判断。",
  "This catalog offers Regular and Fill. Regular uses currentColor strokes; Fill uses currentColor filled shapes.":
    "本站仅提供 Regular 和 Fill。Regular 使用 currentColor 描边，Fill 使用 currentColor 填充图形。",
  "Changes Regular strokes, e.g. phosphor:star; does not reshape phosphor:star-fill.":
    "可调整 phosphor:star 等 Regular 图标的描边；不会改变 phosphor:star-fill 的形状。",
  "Both outline and fill variants commonly use currentColor filled paths.":
    "outline 和 fill 版本通常都使用 currentColor 填充路径。",
  "Does not change the apparent line weight of bootstrap:star; its outline is a filled path.":
    "不会改变 bootstrap:star 的视觉线宽，因为它的轮廓由填充路径绘制。",
  "This catalog offers Outlined and Filled, both using currentColor filled paths. TwoTone is not included.":
    "本站提供 Outlined 和 Filled，两者均使用 currentColor 填充路径，不包含 TwoTone。",
  "Does not change the apparent line weight of antd:star; choose antd:star-filled for a solid silhouette.":
    "不会改变 antd:star 的视觉线宽；需要实心图形时请选择 antd:star-filled。",
  "This catalog includes monochrome outline marks, such as brand:react; do not assume all brand artwork has fixed colors.":
    "本站包含 brand:react 等单色线框标志，不能认为所有品牌图标都使用固定颜色。",
  "Changes actual strokes in these outline marks. Other imported logos may be filled or multicolor.":
    "可调整这些线框标志的实际描边；自行导入的其他标志可能使用填充或多色画法。",
  "Fixed colors preserve the flag’s design; color is not a palette replacement.":
    "固定颜色保留旗帜原有设计；color 不能整体替换配色。",
  "Not a general weight control for flags. Drawings containing fixed-color strokes skip automatic stroke-width rewriting.":
    "不能作为旗帜的通用粗细调节。图形中包含固定颜色描边时，会跳过自动描边宽度改写。",
  "Color and currentColor": "颜色与 currentColor",
  "Choose outline or filled artwork": "选择线框或填充图形",
  "What each prop controls": "各属性控制什么",
  "These rules apply to inline SVG and compatible external symbols. The names below are JavaScript props; Vanilla HTML uses its documented attribute spellings. Neither a prop nor a rendering mode converts one collection’s drawing style into another.":
    "这些规则适用于内联 SVG 和兼容的外部 symbol。下表使用 JavaScript 属性名；Vanilla HTML 请使用对应文档中的属性写法。无论修改属性还是渲染模式，都不会把一个图标集的画法转换成另一个图标集的风格。",
  Props: "属性",
  "Effect and limits": "作用与限制",
  "Select the primary artwork by exact name or supply it directly. data wins if both are present, and the conflict logs console.error.":
    "通过完整名称选择主图标，或直接传入图形数据。两者同时存在时 data 优先，并通过 console.error 提示冲突。",
  "Select the alternative group with showAlt. altData wins over altName and the conflict logs console.error, even when that group is inactive. Without an alternative, the primary remains selected.":
    "通过 showAlt 选择备选组。altData 优先于 altName；两者冲突时，即使备选组尚未显示，也会输出 console.error。没有提供备选图标时，仍选择主图标。",
  "Set the display box, not the source coordinates. Explicit size wins over width and height. Equal boxes do not guarantee equal visual weight or occupied area across collections.":
    "设置显示区域，而非修改原始坐标。显式 size 优先于 width 和 height。即使尺寸相同，不同图标集的视觉重量和图形占比也不一定相同。",
  'Changes paint values that use currentColor, not fixed colors or fill="none". Omit it to inherit the surrounding text color.':
    '改变使用 currentColor 的颜色属性，不会替换固定颜色或 fill="none"。不设置时继承周围文字颜色。',
  "Only affects paint that inherits it. Explicit fill values in the artwork take priority; use the exact alternative name for a designed filled variant.":
    "只影响继承该属性的填充。图形中显式设置的 fill 优先；需要设计好的填充版本时，请使用其完整图标名称。",
  "A normalized width on a 24-unit canvas, defaulting to 1.5. It does not add a stroke to filled paths, and eligible source stroke widths are overridden even when this prop is omitted.":
    "以 24 单位画布为基准的归一化宽度，默认为 1.5。它不会为填充路径增加描边；即使省略此属性，可调整的原始描边宽度也会被默认值覆盖。",
  "Keeps eligible strokes at a fixed pixel weight when the resolved width and height are numeric pixels or px strings. rem, em, percentages and later CSS resizing cannot be measured by this calculation.":
    "最终 width 和 height 为数值像素或 px 字符串时，可固定支持调节的描边粗细。此计算无法测量 rem、em、百分比或后续 CSS 调整产生的实际尺寸。",
  "Transform the selected drawing in either mode. rotate uses quarter turns: 1 is 90°, not 1°. These props do not change its colors or drawing style.":
    "两种模式都可变换所选图形。rotate 以四分之一圈为单位：1 表示 90°，不是 1°。这些属性不改变颜色或画法。",
  "Use the attributes supported by your adapter to style and label the root SVG. External symbols do not expose their internal paths to page CSS selectors.":
    "使用框架适配器支持的属性，为根 SVG 设置样式和无障碍标签。页面 CSS 选择器无法选中外部 symbol 内部的路径。",
  "With no custom configuration, icons use md (20px), strokeWidth: 1.5 and absoluteStrokeWidth: false. Per-set appearance defaults follow the selected name. Anonymous data and altData use default, not a set inferred from their shape; register them under a name in sources when per-set defaults are needed.":
    "没有自定义配置时，图标使用 md（20px）、strokeWidth: 1.5 和 absoluteStrokeWidth: false。按图标集配置的外观默认值跟随当前选中的名称。匿名 data、altData 使用 default，不会根据形状推断所属图标集；需要按图标集配置时，请在 sources 中为数据注册名称。",
  "Configure defaults by collection": "按图标集配置默认值",
  "Source weight is not always the displayed weight":
    "原始线宽不一定等于显示线宽",
  "Omitting strokeWidth still uses the shared default of 1.5; it does not request the original width. For example, tabler:star has a source width of 2 on a 24-unit canvas, but its eligible strokes render at 1.5px in a 24px box with default configuration, in every Vite mode.":
    "省略 strokeWidth 仍会使用共享默认值 1.5，并不代表使用原始线宽。例如 tabler:star 在 24 单位画布中的原始线宽为 2，但在默认配置和 24px 显示尺寸下，可调整的描边会显示为 1.5px；所有 Vite 模式都遵循此规则。",
  "Phosphor Regular uses a 256-unit canvas. For phosphor:star, its source width of 16 corresponds to strokeWidth: 1.5 on a 24-unit basis, so the default preserves this example’s weight. Set a different numeric strokeWidth to customize Regular; it will not reshape phosphor:star-fill.":
    "Phosphor Regular 使用 256 单位画布。以 phosphor:star 为例，原始线宽 16 换算到 24 单位基准后，对应 strokeWidth: 1.5，因此默认值会保留这个示例的线宽。可以设置其他数值自定义 Regular 的描边，但这不会改变 phosphor:star-fill 的形状。",
  'The component strokeWidth prop accepts a number, not an "original" string. Vanilla’s HTML stroke-width="original" is an attribute-specific escape hatch, not a cross-framework prop value.':
    '组件的 strokeWidth 属性接收数值，不支持 "original" 字符串。Vanilla HTML 的 stroke-width="original"（标准元素写作 icon-stroke-width）是该 HTML 属性的专用能力，不是跨框架通用的属性值。',
  "Stroke scaling and source artwork": "描边缩放与原始图形",
  "Choose Vite’s output mode": "选择 Vite 的输出模式",
  'The @icones/vite option is mode: "sprite", mode: "symbol" or mode: "svg". sprite is the plugin default. There is no mode: "inline". Keep your framework plugin and change only this option when comparing output.':
    '@icones/vite 的选项为 mode: "sprite"、mode: "symbol" 或 mode: "svg"，插件默认使用 sprite。不存在 mode: "inline"。比较输出时，保留已有框架插件，只切换此选项即可。',
  "mode controls the representation of statically collected names. It is not an Icon prop, does not freeze runtime props, and does not turn every icon in the application into a symbol.":
    "mode 决定静态收集到的名称采用哪种输出形式。它不是 Icon 属性，不会锁定运行时属性，也不会将应用中的所有图标都转换成 symbol。",
  "Choose sprite to combine collected icons into one browser-cacheable file, symbol for one file per icon, or svg for self-contained artwork after JavaScript loads and direct access to individual paths. No mode makes filled paths respond to strokeWidth.":
    "选择 sprite 可将已收集图标合并为一个可缓存文件；选择 symbol 可让每个图标使用独立文件；选择 svg 可在 JavaScript 加载后获得自包含图形并直接访问内部路径。任何模式都不会让填充路径响应 strokeWidth。",
  Behavior: "行为",
  "Static artwork": "静态图形",
  "Icon data is included in the JavaScript module; each instance renders inline SVG elements.":
    "图标数据包含在 JavaScript 模块中，每个实例渲染内联 SVG 元素。",
  "A separate SVG asset is emitted; each instance renders a use reference to its symbol.":
    "输出独立 SVG 资源，每个实例通过 use 引用其中的 symbol。",
  "Loading and deployment": "加载与部署",
  "No separate artwork request for a collected icon after its JavaScript module is available.":
    "对应 JavaScript 模块可用后，已收集图标无需额外请求图形资源。",
  "The browser loads the referenced SVG asset. Deploy generated assets with the app, keeping symbol URLs same-origin.":
    "浏览器加载被引用的 SVG 资源。部署应用时应同时部署生成的资源，保持 symbol URL 与页面同源。",
  "Appearance props": "外观属性",
  "Size, transforms, currentColor and eligible stroke widths remain configurable.":
    "尺寸、变换、currentColor 和支持调节的描边宽度仍可配置。",
  "The same controls work with symbols generated by Icones. Fixed colors and filled paths keep the same limitations.":
    "Icones 生成的 symbol 支持同样的调节；固定颜色和填充路径仍受相同限制。",
  "Styling individual paths": "设置内部路径样式",
  "Paths are in the page DOM and can be targeted by CSS; selectors remain artwork-specific.":
    "路径位于页面 DOM 中，可通过 CSS 选择；具体选择器仍取决于图形结构。",
  "Page selectors cannot reach paths inside the external SVG document. Style the root SVG instead.":
    "页面选择器无法访问外部 SVG 文档中的路径，请优先设置根 SVG 的样式。",
  "Direct data renders inline.": "直接传入的数据以内联方式渲染。",
  "Direct data still renders inline; it is not extracted into a symbol by this option.":
    "直接传入的数据仍以内联方式渲染，不会因该选项被提取为 symbol。",
  "Prepare every collected icon in dataDir before using this offline configuration. emitData controls JSON output separately; emitData: false does not disable the SVG assets needed by sprite or symbol mode. Changing mode requires restarting Vite or rebuilding the app.":
    "使用此离线配置前，请在 dataDir 中准备好所有被收集图标。emitData 单独控制 JSON 输出；emitData: false 不会关闭 sprite 或 symbol 模式所需的 SVG 资源输出。修改 mode 后需要重启 Vite 或重新构建应用。",
  "Separate static collection from runtime loading": "区分静态收集与运行时加载",
  "Think about the selected source first, then its representation. A literal name in a supported Icon call can be collected at build time, including altName even when showAlt starts as false. Computed names are not automatically enumerated from application state.":
    "先判断选中了哪个来源，再判断如何渲染。插件可在构建时收集受支持 Icon 调用中的字面量名称，包括初始 showAlt 为 false 时的 altName；不会自动枚举应用状态中所有可能的动态名称。",
  "Direct data or altData: render inline without a name lookup. Do not add a name just to associate anonymous data with a collection.":
    "直接传入 data 或 altData：无需查找名称，直接内联渲染。不要为了给匿名数据指定图标集而同时传入 name。",
  "A name already registered by a loaded Vite-generated module: use that compiled svg, Sprite or per-icon symbol representation. This also applies when a dynamic value happens to match the registered name.":
    "名称已由加载完成的 Vite 生成模块注册：使用对应的 svg、Sprite 或逐图标 symbol 编译结果。动态值恰好匹配已注册名称时，也遵循此规则。",
  "Other names: resolve through the icon’s store, local sources and configured API. A fetch API returns data to render inline; a symbol API supplies an external reference. These runtime API choices are separate from Vite mode.":
    "其他名称：通过图标的 store、本地 sources 和 API 配置解析。fetch API 返回数据后内联渲染，symbol API 提供外部引用。运行时 API 类型与 Vite mode 是不同配置。",
  "An explicit per-icon loader bypasses compiled-name resolution. Local sources can still resolve the name before that loader; supplying a loader does not stop Vite from collecting a literal name at build time.":
    "单个图标显式传入 loader 时，会跳过编译名称解析，但本地 sources 仍可能先于 loader 解析该名称。传入 loader 并不会阻止 Vite 在构建时收集字面量名称。",
  "Changing IconConfig sources or api alone does not replace artwork already resolved from Vite’s compiled registry. Changing showAlt selects another source; a primary symbol and alternative inline data can coexist in one component.":
    "仅修改 IconConfig 的 sources 或 api，不会替换已经从 Vite 编译注册表解析到的图形。修改 showAlt 会切换来源，同一个组件可以同时使用主图标 symbol 和备选内联数据。",
  "Local data and runtime APIs": "本地数据与运行时 API",
  "Select primary and alternative sources": "选择主图标与备选来源",
  "Check these cases before switching modes": "切换模式前需要检查的情况",
  "All Vite modes share presentation rules, but inline data and external symbols are not guaranteed to produce pixel-identical output for every custom data shape. Keep the original viewport and explicit paint attributes when importing artwork, then compare both rendering paths if you rely on internal SVG details.":
    "所有 Vite 模式共享外观规则，但内联数据与外部 symbol 不保证对每种自定义数据都产生逐像素一致的结果。导入图形时应保留原始视口和显式颜色属性；如果依赖 SVG 内部细节，请比较两种渲染路径的实际输出。",
  Case: "情况",
  "Current behavior and what to do": "当前行为与处理方式",
  "Custom tuples without fill": "自定义元组缺少 fill",
  'Inline tuple rendering can use the icon’s fill prop as a missing-fill default. Generated symbols bake in fill="none" for missing root fills, so the same prop cannot replace it later. Set fill explicitly in the source data.':
    '内联元组可使用图标的 fill 属性补充缺失的默认填充。生成 symbol 时，缺少根级 fill 的节点会被写入 fill="none"，之后无法用同一个属性替换。请在源数据中显式指定 fill。',
  "Separate top-level tuples with opacity": "顶层独立元组设置了 opacity",
  "Inline rendering moves top-level tuples carrying opacity before other top-level tuples; symbol generation preserves their source order. Overlapping layers can differ. Group layers deliberately and compare the actual outputs.":
    "内联渲染会把带 opacity 的顶层元组排到其他顶层元组之前，symbol 生成则保留原始顺序，因此重叠图层可能出现差异。请明确组织图层分组，并比较实际输出。",
  "Hand-authored or third-party symbols": "手写或第三方 symbol",
  "Size and currentColor can inherit, but fixed internal stroke widths may ignore strokeWidth. Use Icones-generated symbols for its configurable-stroke convention; mode cannot rewrite arbitrary remote SVG files.":
    "尺寸和 currentColor 可以继承，但内部固定描边宽度可能不响应 strokeWidth。需要 Icones 的可配置描边规则时，请使用其生成的 symbol；mode 不会改写任意远程 SVG 文件。",
  "Non-square artwork and flags": "非正方形图形与旗帜",
  "Keep the original viewBox when passing data directly. The display box is not the drawing’s aspect ratio; a square size does not redraw a 4:3 flag as a square flag. Choose the exact square or landscape variant.":
    "直接传入数据时应保留原始 viewBox。显示区域不等于图形的宽高比；正方形 size 不会将 4:3 旗帜重绘为正方形旗帜。请选用对应的正方形或横向版本。",
  "Style the root SVG": "为根 SVG 设置样式",
  "Compare prop support and Vite modes": "了解属性支持与 Vite 模式差异",
  "This calculation uses the resolved width and height, not a browser layout measurement. Numeric pixels and px strings work; relative CSS units or a later CSS size override do not guarantee a fixed pixel stroke.":
    "此计算使用解析后的 width 和 height，不会测量浏览器布局。数值像素和 px 字符串可参与计算；相对 CSS 单位或后续通过 CSS 覆盖尺寸时，不能保证固定像素描边。",
  'Omitting strokeWidth still uses the shared default of 1.5 in every Vite mode. Component props accept a numeric width; there is no cross-framework strokeWidth="original" value. Set an explicit weight when you need a thinner or bolder drawing.':
    '所有 Vite 模式下，省略 strokeWidth 都会使用共享默认值 1.5。组件属性接收数值线宽，没有跨框架通用的 strokeWidth="original" 值。需要更细或更粗的图形时，请显式指定线宽。',
  "For custom tuple data, specify fill in the artwork. Inline rendering can supply a missing fill from the prop, but generated symbols bake missing root fills as none; the root SVG fill prop cannot override that explicit value.":
    "自定义元组数据应在图形中显式指定 fill。内联渲染可通过属性补充缺失的填充，而生成 symbol 时会将缺失的根级填充固定为 none，之后无法用根 SVG 的 fill 属性覆盖。",
}
