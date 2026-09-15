# @icones/svelte

Svelte 5.20+ 的原生 runes 组件。通过 svelte-package 输出可由消费项目编译的 .svelte 文件和类型声明。

```sh
npm install @icones/svelte
```

```svelte
<script lang="ts">
  import { Icon, IconConfig } from "@icones/svelte"
  let selected = $state(false)
</script>

<IconConfig defaultSize="lg">
  <Icon name="tabler:star" altName="tabler:heart" showAlt={selected}
    aria-label="收藏" onclick={() => selected = !selected} fallback="加载中" />
</IconConfig>
```

未配置 `api` 时，明确的 `set:name` 会从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。Vite 静态收集和本地 `sources` 优先；使用 `api={false}` 可关闭网络回退，也可通过 `api` 覆盖为自建数据或 symbol 服务。

`IconProvider` 是 `IconConfig` 的别名。组件保留原生 SVG 属性、事件和 CSS 字符串样式。`fallback` 支持字符串或 Snippet；未提供时保留空 SVG 和 `data-state`。可以传入 `scope={createIconScope(...)}` 显式共享请求缓存。

SSR 使用同步数据、symbol、Vite 静态提取或预加载 store，不会在服务端启动客户端 effect。使用 `$props.id()` 隔离内部 SVG ID。客户端 hydration 必须使用相同初始数据。

完整配置、静态收集和 SSR 注意事项见 [Svelte 使用指南](https://icones.go-slim.dev/guide/svelte/getting-started)。