# @icones/icon-builder

私有图标维护与构建工具包，统一管理导入、名称声明生成和静态资源打包。产物分工为：`@icones/icons` 保存图形，`@icones/names` 保存名称声明；两个产物包均无依赖、无 scripts。

工具包位于 `scripts/icon-builder/`，通过根目录的 `scripts/*` workspace 管理；构建产物写入 `packages/icons/`、`packages/names/`、`dist/client/` 和 `dist/icons/`。

名称生成与文件仓库共用 `@icones/core/manifest` 的校验器，不再各自解释 manifest。该子入口不加载组件运行时或名称声明，Core 尚未构建时也可以通过 Bun 源码条件生成 names。SVG 转换和集合生产预设从 `@icones/vite/tooling` 的独立子入口复用。

除 Flag 外，生成的集合统一使用 outline/solid 分类；原始类型通过 manifest 的 `variantAliases` 保存，例如 Phosphor 的 regular/fill、Ant Design 的 outlined/filled、Tabler 的 outline/filled。Lucide/Huge 当前只有 outline。Phosphor 官方归档中的其他字重、Ant Design 的 twotone 不会导入；API 全集/分类选择也会过滤，显式指定排除的类型则在下载图形前报错。Flag 的圆形和宽高比单独处理。详见 [集合样式约定](../../packages/vite/TOOLING.md)。

Bootstrap 固定为 v1.13.1 对应 revision，读取官方 SVG 和网站 YAML 分类；缺失分类的图标归入 general。原始文件名不变，`fill` 可以位于名称中间，例如 `building-fill-add` 仍归入 solid。Ant Design 固定上游 revision，只读取 outlined/filled 两个目录；原文件同名，扁平输出分别为 `star` / `star-filled`，归入 general，不虚构上游分类或缺失的样式配对。两个图标集的 MIT 原文随资源保留。

```text
config/
  icons.json             # API 导入选择配置
  deployment.json        # 集合域名、文件限制和公开部署排除项
src/
  paths.ts               # 工作区路径，统一由模块位置定位
  cli/                   # 命令参数与流程编排
  import/                # 官方/API 导入、上游目录与来源配置
  generate/              # 名称声明与 symbol 生成
  build/                 # 网站索引与每集合纯静态部署
  shared/                # 原子文件写入、下载缓存
  benchmark/             # 包性能基准
  legacy/                # 旧图标布局迁移工具
```

在工作区根目录运行：

- `bun run download:icons`：从官方来源导入图标；写入工作区后刷新名称声明。
- `bun run download:api`：按 `config/icons.json` 或命令行选择导入图标；写入工作区后刷新名称声明。
- `bun run generate:names`：读取资源清单，仅更新 `packages/names/types/`。
- `bun run check:names`：只读检查声明是否同步；过期时退出失败。
- `bun run generate:symbols`：根据清单从 JSON 生成 SVG symbol。
- `bun run build`：app 在预渲染后生成网站索引到 `dist/client/icons/`，每集合资源和配置到 `dist/icons/<set>/`，不需要 Worker 脚本、不上传；单独的 `app build` 也包含此步骤。
- `bun run build:icons [--set tabler]`：只准备集合部署，不重建网站。
- `bun run deploy:app --dry-run`：完整构建并检查主站静态部署；移除 `--dry-run` 后发布 `dist/client/`。
- `bun run deploy:icons --set tabler --dry-run`：重建单集合并运行 Wrangler 本地检查；移除 `--dry-run` 才实际上传。`--all` 显式选择所有未被排除的集合。
- `bun run build:local`：完整同源网站，用于域名未上线时离线预览。包内旧 `build:static` 仅用于重新复制全部本地资源，不用于拆分部署。

目录结构、首次发布、跨域、许可策略和自定义输出见 [Cloudflare 静态部署](DEPLOYMENT.md)。

本包的 `build` 只生成名称声明，不下载图标。包内 `typecheck` 同时检查声明新鲜度与工具源码。原 `generate:types` / `check:types` 保留为命令别名。`legacy/` 工具不参与默认构建。

默认资源和名称输出路径相对于 `src/paths.ts` 定位。显式 `--out` / `--dir` 相对于进程工作目录解析。给名称生成器传入自定义 `--dir` 时，仅更新自定义目录的 `types/`，不修改工作区包。

类型生成先验证全部清单和输出归属，再更新有变化的声明、清理失效的生成文件。手写声明不会被覆盖；下载的 `--dry-run` 不写图标或名称声明。包的 `package.json`、README、名称包空运行时入口仍是维护文件，不由生成器创建。