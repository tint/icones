# @icones/names

Icones 的图标名称声明包，无依赖，不包含图形或运行时名称清单。

```ts
import type { IconName, IconSetName, IconNamesBySet } from "@icones/names"
import type { IconName as TablerIconName } from "@icones/names/tabler"

const icon = "tabler:star" satisfies IconName
const set = "tabler" satisfies IconSetName
type TablerName = IconNamesBySet["tabler"]
```

Core 与各框架适配器继续重新导出这些类型。类型检查不负责加载图形，也不保证运行时数据源包含该名称。

私有工具包 `@icones/icon-builder` 根据 `packages/icons/*/manifest.json` 生成本包的 `types/`。资源包 `@icones/icons` 不再保存或导出名称声明。

在工作区根目录运行 `bun run generate:names` 更新声明，运行 `bun run check:names` 只读检查是否同步。原 `generate:types` 命令保留为别名。消费者使用构建好的声明即可，无需安装工具包或图标数据包。

从旧版迁移时，将 `@icones/icon-types`、`@icones/icons` 的类型导入改为 `@icones/names`；单集合类型从 `@icones/names/<set>` 导入。