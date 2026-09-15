/** Editorial content shared by the landing and resource pages. */
export const pageMessages: Readonly<Record<string, string>> = {
  "Give your assistant the guide for your framework so its examples match your application. Use the index for browsing or attach the complete guide when links cannot be opened.":
    "向助手提供你所用框架的指南，让示例与你的应用匹配。可以分享索引供助手浏览；如果助手无法打开链接，就附上完整指南。",
  "Choose how your assistant works with icons.": "选择助手使用图标的方式。",
  "Use MCP when your assistant needs to search and read icon data. Use a plain-text guide when it only needs API documentation.":
    "需要助手搜索和读取图标数据时，使用 MCP；只需要 API 文档时，提供纯文本指南即可。",
  "Your assistant can search and read the included collections or a directory you provide. It cannot download or change your icon files. Reconnect after adding icons to a custom collection.":
    "助手可以搜索和读取随包提供的图标集，也可以使用你指定的目录，但不会下载或修改图标文件。向自定义图标集添加图标后，请重新连接。",
  "ready for your next interface.": "让界面表达更清晰。",
  "Find icons across independent collections, preview the details and export SVG, original JSON or code for your framework.":
    "浏览独立图标集，预览并调整细节，导出 SVG、原始 JSON 或适用于你的框架的代码。",
  "From finding an icon to using it.": "从找到图标，到用进界面。",
  "Start with the artwork. Add an integration only when your application needs one.":
    "先选好图形，再根据应用需要选择接入方式。",
  "Find a consistent style": "选择一致的风格",
  "Choose a collection, narrow it by category and compare its available variants. Keep related interface icons in the same family for a more consistent result.":
    "选择图标集，按分类缩小范围，再对比可用变体。同一组界面图标尽量来自同一系列，让视觉风格保持一致。",
  "Explore the catalog →": "浏览图标目录 →",
  "Preview the details": "调整图形细节",
  "Open an icon to adjust size, color, stroke width and rotation. Fixed-color artwork keeps its original colors; a filled variant is a separate drawing, not a paint setting.":
    "打开图标，调整尺寸、颜色、描边宽度和旋转角度。固定配色的图形保留原色；填充变体是独立绘制的图形，不是简单地改变填色。",
  "Understand color and styles →": "了解颜色与风格 →",
  "Choose your output": "选择导出方式",
  "Download a standalone SVG for direct use, copy component code for your framework, or keep the original JSON in your app. Component examples need an icon data source.":
    "下载可直接使用的 SVG，复制框架组件代码，或将原始 JSON 保存在应用中。使用组件示例前，需要先接入图标数据。",
  "Render your first icon →": "显示第一个图标 →",
  "The resources behind your icons.": "图标之外，也有完整的接入参考。",
  "Keep implementation details, assistant context and source notices close to your project.":
    "从开发接入到 AI 上下文，再到来源与许可，在这里找到所需参考。",
  "Choose the packages you need": "按需选择包",
  "Pick one framework adapter, then decide whether Vite extraction, local data or an HTTP service fits your application. You do not need to install every package.":
    "选择一个框架适配器，再决定使用 Vite 提取、本地数据还是 HTTP 服务。无需安装所有包。",
  "Compare packages →": "了解各包用途 →",
  "Give your assistant the right context": "为 AI 助手提供上下文",
  "Get AI documentation →": "获取 AI 文档 →",
  "Keep track of the source": "保留来源信息",
  "Review the original author, imported revision and license for each collection. Exporting an icon does not replace its original terms.":
    "查看各图标集的原作者、导入版本与许可证。导出图标不会改变其原始许可条款。",
  "Review collection licenses →": "查看图标集许可 →",
  "Start with your framework.": "从你使用的框架开始。",
  "Follow a first-icon tutorial for your stack. Each guide covers installation, connecting artwork and checking the rendered result.":
    "选择对应框架的入门教程，逐步完成安装、接入图形数据，并检查渲染结果。",
  "Framework tutorials": "框架入门教程",
  "Three parts, different responsibilities.": "三个部分，各司其职。",
  "Rendering, artwork and build integration are separate choices. Start with the smallest setup that covers your use case.":
    "渲染组件、图形数据和构建集成可以分别选择，从满足当前需求的最小配置开始。",
  "The adapter renders": "适配器负责渲染",
  "Choose React, Vue, Svelte, SolidJS, Astro or Vanilla to match your app. Adapters expose familiar props and share the same icon names; they do not bundle every drawing.":
    "根据应用选择 React、Vue、Svelte、SolidJS、Astro 或 Vanilla。适配器提供符合框架习惯的属性，并共享图标名称，但不内置全部图形。",
  "Explore the component API →": "查看组件 API →",
  "The collection supplies artwork": "图标集提供图形",
  "@icones/icons contains per-icon data, SVG symbols, manifests, licenses and generated name types. A type import checks a name; it does not load the corresponding artwork.":
    "@icones/icons 包含逐个图标的数据、SVG symbol、清单、许可证及生成的名称类型。导入类型只用于检查名称，不会加载对应图形。",
  "Understand names and data →": "了解名称与数据 →",
  "Vite collects known names": "Vite 收集静态名称",
  "@icones/vite handles literal names at build time. For names chosen at runtime, register local sources or configure a loader through your adapter.":
    "@icones/vite 在构建时处理字面量名称。运行时才确定的名称，可以通过所用适配器注册本地 sources 或配置加载器。",
  "Choose a loading setup →": "选择加载方式 →",
  "This example reads local data from ./icons and disables API fallback. Keep that directory inside your app, include the required collections and use literal names for build-time extraction.":
    "此示例从 ./icons 读取本地数据，并禁用 API 回退。在应用内准备这个目录及所需图标集，再使用字面量名称供构建时提取。",
  "Compare six framework adapters, the Vite plugin and the MCP server. Choose the packages and loading setup your application needs.":
    "比较六种框架适配器、Vite 插件和 MCP 服务端，选择应用需要的包与加载方式。",
  "Give your assistant a focused starting point.": "让 AI 助手从相关文档开始。",
  "How to use these files →": "如何使用这些文件 →",
  "Documentation explains the API. Your project supplies the framework, data paths and requirements that make an example usable.":
    "文档说明 API 的用法；结合项目的框架、数据路径与约束，示例才能真正接入应用。",
  "1. Choose a scope": "1. 选择文档范围",
  "Use your framework’s section below. For Vanilla, choose standard elements or Web Components to match your markup. Use all frameworks only when comparing integrations.":
    "在下方找到对应框架。使用 Vanilla 时，按实际标签选择标准元素或 Web 组件教程；需要比较不同接入方式时，再使用全部框架文档。",
  "2. Choose the amount of context": "2. 选择上下文长度",
  "llms.txt is a short index for tools that can follow links. llms-full.txt contains the complete selected guide and is more useful as an attachment when the assistant cannot browse.":
    "llms.txt 是精简索引，适合能继续读取链接的工具。llms-full.txt 包含对应范围的完整指南；助手无法浏览链接时，更适合作为附件提供。",
  "3. Include your project constraints": "3. 补充项目约束",
  "Share your framework, build tool, icon data directory and whether runtime requests are allowed. Ask for exact catalog names, then verify the result in your app.":
    "说明框架、构建工具、图标数据目录，以及是否允许运行时请求。要求助手使用目录中准确的图标名称，并在应用中验证结果。",
  "For assistants: framework documentation": "AI 助手：使用框架文档",
  "Give your assistant a framework-specific llms.txt or llms-full.txt file, then supply exact icon names from the catalog. No MCP connection is needed for this workflow.":
    "向助手提供对应框架的 llms.txt 或 llms-full.txt，再补充图标目录中的准确名称。这种用法无需 MCP 连接。",
  "Know what each source file tells you.": "如何阅读来源文件？",
  "Check the collection you actually use, including its import revision. A collection can combine artwork from more than one source.":
    "以实际使用的图标集及其导入版本为准。一个图标集可能合并了多个来源的图形。",
  "license.txt: the bundled notice": "license.txt：随附许可声明",
  "Read the original terms shipped with the collection. Keep the applicable notices with copied artwork; the short license label on a card is not the full text.":
    "阅读随图标集提供的原始条款，并随复制的图形保留相应声明。卡片上的简短许可名称不能代替完整文本。",
  "manifest.json: inventory and provenance": "manifest.json：清单与来源",
  "Inspect the collection’s variants, categories and recorded sources. The imported revision identifies the snapshot bundled here, which may differ from the author’s latest release.":
    "查看图标集的变体、分类与来源记录。导入版本标识本站使用的数据快照，可能不同于原作者的最新发布版本。",
  "Original collection: upstream context": "原始图标集：上游信息",
  "Follow the source link for the author’s documentation and updates. Brand marks may also have usage guidelines; the gallery does not grant additional rights to them.":
    "通过来源链接查看作者文档与更新。品牌标志也可能有单独的使用规范，图标库不会授予额外的品牌使用权。",
  "Find an icon by name or keyword, choose a style, then open it to preview and export SVG, code or original JSON.":
    "按名称或关键词查找图标，选择风格，再打开详情预览，导出 SVG、代码或原始 JSON。",
  "Try a shorter keyword, another style or a different collection. Search uses the original icon names and keywords.":
    "试试更短的关键词，或切换风格、图标集。搜索匹配原始图标名称与关键词，可尝试英文词汇。",
}
