# @icones/names

Icones 的图标名称声明包，无依赖，不包含图形或运行时名称清单。

```sh
npm install --save-dev @icones/names
```

```ts
import type { IconName, IconSetName, IconNamesBySet } from "@icones/names"
import type { IconName as TablerIconName } from "@icones/names/tabler"

const icon = "tabler:star" satisfies IconName
const set = "tabler" satisfies IconSetName
type TablerName = IconNamesBySet["tabler"]
```

Core 与各框架适配器继续重新导出这些类型。类型检查不负责加载图形，也不保证运行时数据源包含该名称。

从旧版迁移时，将 `@icones/icon-types`、`@icones/icons` 的类型导入改为 `@icones/names`；单集合类型从 `@icones/names/<set>` 导入。