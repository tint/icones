# 使用 Icones

查找图标、调整外观，然后将 SVG、JSON 或框架代码用于你的项目。浏览和导出图标不需要安装软件包，也不需要下载或运行 Icones 仓库。

## 找到并导出图标

在站点的 `/icons` 页面选择图标集，按名称或分类搜索，再打开图标详情：

- **SVG**：下载可直接使用的图形，适合设计稿或固定图标，不需要 Icones 运行时。
- **框架代码**：选择 React、Vue、Svelte、SolidJS、Astro 或 Vanilla，复制示例，并按照对应指南配置数据来源。
- **JSON**：保存原始图标数据，便于在应用内使用或交给 Vite 插件处理。

颜色、尺寸和描边设置用于调整显示效果；线框与填充图标是不同的图形。多色图标中的固定颜色不会被统一颜色设置覆盖。

## 在应用中使用

访问 `/guide` 选择框架，再进入“快速开始”（例如 `/guide/react/getting-started`）。对于 Vite 应用，安装适配器和 Vite 插件，例如：

```sh
npm install @icones/react
npm install -D @icones/vite
```

在你自己的应用目录中运行命令，页面可切换 npm、pnpm、yarn、bun 或 deno。安装需要包仓库提供兼容的 `@icones` 版本；找不到包时，请先确认仓库访问权限或获取可用版本。SVG 导出与纯文本文档不受包安装条件影响。

按照 `/guide?page=getting-started` 完成数据配置和首次渲染。示例路径均相对于你的应用：

```text
your-app/
  icons/tabler/data/star.json
  vite.config.ts
```

从图标详情的 JSON 标签保存 `tabler:star` 到上述位置，将 `dataDir` 设为 `./icons`。不要直接引用 Icones 网站仓库内部的目录。Astro 在 `astro.config.mjs` 的 `vite.plugins` 中配置插件。

仅安装适配器不会加载全部图标。已知名称可由 Vite 收集；运行时选择的名称需要本地 sources 或你配置的数据加载器。详细用法见 `/guide?page=icon-config`。

## 为助手提供图标与文档

- **只需要 API 文档**：打开 `/solutions/llms`，找到对应框架，将 `llms.txt` 链接提供给助手，或附上 `llms-full.txt` 完整指南。文件为英文 Markdown，Vanilla 提供两种元素类型的独立指南。
- **需要搜索和读取图标**：按照 `/solutions/mcp` 的步骤安装 `@icones/mcp-server`，配置支持 stdio 的客户端启动已安装的 CLI。需要 Node.js 22.18+，不需要运行图标网站。默认读取随包图标集，也可指定自己的数据目录。

MCP 只读取图标和文档，不修改应用代码或图标文件。`/icons` HTTP 地址不是 MCP 端点。

## 保留原始许可

使用或分发图标前，请到 `/licenses` 查看所用图标集的原始许可、作者和来源。下载图形不会替换原始许可；需要保留的署名和声明应随项目一并提供。

## 语言与页面链接

英文使用默认路径，简体中文使用 `/zh-CN` 前缀。搜索条件、指南框架和主题保存在 URL 中，可以直接分享或收藏。网站提供浅色、深色与跟随系统三种主题。

## 维护图标网站

如果你要修改或部署 Icones 网站本身，请阅读 [维护说明](MAINTAINING.md)。网站构建流程不是使用图标包的前置步骤。