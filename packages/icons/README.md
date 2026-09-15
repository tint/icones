# @icones/icons

纯图标资源包，包含各集合的原始 tuple JSON、SVG symbol、manifest 与许可证，无依赖、无 scripts、无名称类型。

除 Flag 外，manifest 的 `variants` 使用 `outline` / `solid` 两个分类键，按字典序排列。`variantAliases` 保存上游显示名称，例如 `{ "outline": "regular", "solid": "fill" }`。分类不会重命名 `star-filled.json` 等原始文件；Flag 保留 `1x1`、`4x3`、`circle`。`aliases` 则是独立的旧集合命名空间兼容规则。

Phosphor 仅收录 Regular（outline）和 Fill（solid），共 3,024 个图标；bold/duotone/light/thin 不属于正式资源、manifest 或 names。Bootstrap 共 2,078 个图标，保留原始名称，含独立 fill 段的名称归入 solid（包括 `building-fill-add`）。Ant Design 共 698 个图标，仅收录 outlined/filled；两个源目录扁平映射为 `star` / `star-filled`，不包含 twotone。所有 8 个集合共 20,823 个图标。

```text
packages/icons/
  tabler/                # antd、bootstrap、brand、flag、huge、lucide、phosphor 同理
    data/*.json
    symbols/*.svg
    manifest.json
    license.txt
  package.json
  README.md
```

图标文件可通过 `@icones/icons/tabler/data/star.json` 等资源路径使用；本包不提供根运行时入口或 `types` 入口。

名称类型统一从 `@icones/names` 或框架适配器导入：

```ts
import type { IconName } from "@icones/names"
import type { IconName as TablerIconName } from "@icones/names/tabler"

const icon = "tabler:star" satisfies IconName
const tabler = "tabler:star-filled" satisfies TablerIconName
```

维护命令集中在私有包 `@icones/icon-builder`，请在工作区根目录执行：

```sh
bun run download:icons --help
bun run download:api --help
bun run generate:symbols
bun run generate:names
bun run check:names
```

官方导入会生成资源、清单和许可证，并刷新 `packages/names/types/`。API 导入更新工作区后同样刷新名称声明；仅导入所选图标，不替代完整官方来源与许可流程。本包不会再生成 `types/`。手动修改 manifest 后运行 `generate:names`；`check:names` 只读检查声明是否过期。

根构建将各集合的资源复制到 `dist/icons/<set>/public/`，供独立域名静态托管；网站搜索索引写入 `dist/client/icons/catalog.json`。`bun run build:local` 才将完整资源放入 `dist/client/icons/`，用于同源离线预览。Bootstrap 与 Ant Design 的 MIT 原文保存在各自的 `license.txt`，再分发时需要保留。