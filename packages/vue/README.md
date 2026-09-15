# @icones/vue

Vue 3.5+ 图标组件，支持原生 SVG 属性/事件、响应式配置、异步数据、SSR 和 Vite 静态提取。

```sh
npm install @icones/vue
```

```vue
<script setup lang="ts">
import { ref } from "vue"
import { Icon, IconConfig } from "@icones/vue"
const selected = ref(false)
</script>

<template>
  <IconConfig default-size="lg">
    <Icon
      name="tabler:star"
      alt-name="tabler:heart"
      :show-alt="selected"
      aria-label="收藏"
      @click="selected = !selected"
    >
      <template #fallback>加载中</template>
    </Icon>
  </IconConfig>
</template>
```

未配置 `api` 时，明确的 `set:name` 会从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。Vite 静态收集和本地 `sources` 优先；使用 `:api="false"` 可关闭网络回退，也可通过 `api` 覆盖为自建数据或 symbol 服务。

`IconConfig`（别名 `IconProvider`）可嵌套，支持 `sources`、`api`、`store`、尺寸与线宽配置。只覆盖外观的子配置共享父缓存。`Icon` 也可传入 `scope={createIconScope(...)}`；`useIconScope()` 返回当前配置的只读 ref。备用内容可用 `fallback` 字符串或具名 slot，未提供时显示空 SVG 和 `data-state`。

SSR 不会在渲染期间自动请求网络。使用内联数据、symbol 引用、Vite 静态收集，或每请求创建 store 并预加载；客户端使用相同数据进行 hydration。

完整配置、静态收集和 SSR 示例见 [Vue 使用指南](https://icones.go-slim.dev/guide/vue/getting-started)。