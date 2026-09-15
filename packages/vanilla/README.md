# @icones/vanilla

无框架依赖的 SVG 适配器，提供 **Light DOM Web Component**、普通 `<i>` 元素和手动 DOM API，复用核心加载器、缓存和渲染逻辑。

## Web Component

```html
<icones-icon name="tabler:star" size="24"></icones-icon>
<icones-icon name="tabler:heart" color="#7712f7"></icones-icon>

<script type="module">
  import "@icones/vanilla/web-element"
</script>
```

未配置 `api` 时，明确的 `set:name` 会从 `https://<set>.icones.go-slim.dev/data/<name>.json` 加载。Vite 静态收集和本地 `sources` 优先；显式 scope 可用 `api: false` 关闭网络回退，或通过 `api` 覆盖为自建数据或 symbol 服务。

只需导入一次，无需调用初始化函数。已有标签会自动升级，之后新增元素、属性更新、移除和重新插入都由浏览器生命周期处理。SVG 是标签的直接子元素，**不创建 Shadow DOM**，全局 CSS 可以直接选择 `icones-icon > svg`。

`web-element` 仅注册专用标签，不观察普通元素；下面的 `standard-element` 仅观察 `<i icon-name>`，不注册 Web Component。两个入口可单独导入，也可以同时导入，同一宿主不会重复渲染。原 `@icones/vanilla/register` 入口已更名为 `@icones/vanilla/web-element`。

模块导入由 Vite 等构建工具解析，也可自行配置 import map。注册不改变应用已有的图标加载配置；配合 `@icones/vite`，HTML 入口中的 `name` / `alt-name` 字面量会静态提取（包括 template 内容）。动态名称和 JS 中的 HTML 字符串仍需要运行时 API 或本地 sources。

## 普通 HTML 元素

```html
<i icon-name="tabler:star" icon-size="24"></i>
<i icon-name="tabler:heart" icon-color="#7712f7" icon-defer="intersect"></i>

<script type="module">
  import "@icones/vanilla/standard-element"
</script>
```

导入后自动扫描已有的 `i[icon-name]`，通过 MutationObserver 跟踪新增、移除和 `icon-*` 属性变化。SVG 直接追加到原有 i 内部，不替换宿主、删除原有子节点或监听器，也不创建 Shadow DOM。

只识别 HTML `i` 标签的 `icon-name`；`<span icon-name>`、其他组件的 `icon` 属性以及 `data-icon*` / `data-defer` 都不会触发渲染。裸 `icon` 不是图标名别名。核心 SVG 的 `data-icon`、`data-state` 仍是输出元数据，不是声明式输入。

普通元素中，给下表的 Web Component 属性加 `icon-` 前缀即可，例如 `name → icon-name`、`stroke-width → icon-stroke-width`、`defer → icon-defer`。三个 SVG 属性映射为 `decorative → icon-hidden`、`svg-role → icon-role`、`svg-class → icon-class`。

用 `element.setAttribute("icon-name", "tabler:heart")` 或 `element.setAttribute("icon-show-alt", "true")` 更新；变化在 MutationObserver 回调中生效。原生 `class`、`style`、`aria-*` 和 `hidden` 留在 i 上，`icon-label`、`icon-hidden`、`icon-role`、`icon-class` 作用于 SVG。

需要局部范围、scope 或自定义属性前缀时，使用主入口的显式 API，替代自动导入：

```ts
import { bindIcons, createIconConfig } from "@icones/vanilla"

const icons = bindIcons({
  root: document.querySelector("#toolbar")!,
  scope: createIconConfig({ defaultSize: "lg" }),
})

await icons?.load() // 等待当前已激活的图标，不强制触发 icon-defer
// 页面/视图销毁时：
icons?.destroy()
```

`root` 支持 Document、Element（包含自身）、DocumentFragment；不会自动穿透 Shadow DOM。省略时使用 document，没有 DOM 时为 no-op。默认观察变化；`observe: false` 时调用 `refresh()` 手动同步。重复初始化同一个 root 和 attrPrefix 返回现有句柄，不替换 scope；重叠 root 不会接管其他初始化器已持有的图标。原 `initIcons` API 不恢复。

自动入口也导出 `standardElements` 句柄，可用于 `load()` 或 `destroy()`。`destroy()` 断开监听、取消延迟任务，并且只移除自身生成的 SVG；需要重新启动时调用 `bindIcons()`。

## 自定义属性前缀

使用主入口显式初始化，不要同时导入默认的 `standard-element` 自动入口：

```ts
import { bindIcons } from "@icones/vanilla"

bindIcons({ attrPrefix: "ui-" })
```

```html
<i ui-name="tabler:deer" ui-size="24" ui-defer="intersect"></i>
```

`attrPrefix` 默认是 `icon-`，包含末尾的连字符；接受以小写字母开头、由小写字母/数字及连字符分段组成的前缀，例如 `ui-`、`app-icon-`、`data-app-`。空值、不带结尾连字符、空白、大写字母或选择器字符会报错。

所有属性统一使用配置的前缀，包括 name、size、width、height、color、fill、stroke-width、rotate、alt-name、show-alt、label、hidden、role、class 和 defer，不会回退到其他前缀。显式指定 `data-app-` 是自定义配置，并不是恢复 `data-icon*` 兼容别名。

同一 root 可以分别初始化多个前缀，句柄与清理互不影响。一个宿主如同时声明多个已启用前缀的名称，由先初始化的句柄持有，建议每个元素只使用一个前缀。

Vite 静态提取不会推断运行时 bindIcons 参数，需同步配置：

```ts
icones({ attrPrefixes: ["ui-"] })
```

该列表替换默认的 `["icon-"]`；同时使用两种前缀时配置 `["icon-", "ui-"]`。空列表关闭普通元素静态提取，不影响 Web Component。没有静态提取的动态名称仍需要本地 sources 或运行时 API。

## Web Component 属性

| 属性                     | 用法                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `name`                   | 图标名，例如 `tabler:star`；删除或设为空值会移除生成的 SVG |
| `size`                   | 像素数、`xs`–`xl` 预设或 CSS 长度，如 `24`、`lg`、`1.5rem` |
| `width` / `height`       | 单独设置宽高；显式 size 优先                               |
| `color` / `fill`         | CSS 颜色 / SVG 填充                                        |
| `stroke-width`           | 数字；`original` 保留原图描边                              |
| `rotate`                 | 旋转四分之一圈的次数，`1` = 90°                            |
| `h-flip` / `v-flip`      | 水平 / 垂直翻转                                            |
| `absolute-stroke-width`  | 保持像素描边宽度                                           |
| `alt-name` / `show-alt`  | 备用图标 / 是否显示备用图标                                |
| `label` / `decorative`   | 生成 SVG 的 aria-label / aria-hidden                       |
| `svg-role` / `svg-class` | 生成 SVG 的 role / class                                   |
| `defer`                  | `intersect` 或 `domready`，延迟首次渲染                    |

布尔图标属性接受空值或 `"true"` 表示开启，`"false"` 表示关闭；移除恢复配置默认值。无效数字和布尔值被忽略。颜色和尺寸按 CSS 值传入。

原生 `class`、`style`、`hidden`、`role`、`aria-*` 保留在宿主上，遵循 HTML 语义（例如 `hidden="false"` 仍是隐藏）。不要用 `hidden` 表示装饰性，请用 `decorative`。默认 SVG 是装饰性的；有意义的独立图标用 `label`，图标按钮则给外层 button 添加 `aria-label`：

```html
<button aria-label="收藏">
  <icones-icon name="tabler:star"></icones-icon>
</button>

<icones-icon name="tabler:heart" label="已收藏"></icones-icon>
```

用 `element.setAttribute("name", "tabler:heart")` 或 `element.setAttribute("show-alt", "true")` 更新。无需 MutationObserver 或全局 DOM 扫描。只管理自身生成的 SVG，不替换宿主、不删除其他子节点或监听器。移除元素会解除图标订阅并移除 SVG，共享缓存仍保留。

## 样式

```css
icones-icon {
  color: var(--icon-color, currentColor);
}

icones-icon > svg {
  vertical-align: -0.125em;
}

.toolbar icones-icon > svg {
  width: 1.5rem;
  height: 1.5rem;
}
```

也可以使用 `svg-class="product-icon"` 给 SVG 添加专用类。组件不注入样式表，也不改写宿主的 class 或内联样式。外部 SVG symbol 的内部 path 仍受跨文档边界限制，与是否使用 Shadow DOM 无关。

## 配置和本地图标

需要配置默认 scope 时，**用显式注册代替自动 web-element 导入**：

```ts
import { defineIconElement, createIconConfig } from "@icones/vanilla"

const scope = createIconConfig({
  api: false,
  defaultSize: "lg",
  sources: {
    "app:check": [
      [
        "path",
        {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          d: "m5 12 4 4L19 6",
        },
      ],
    ],
  },
})

defineIconElement({ scope })
```

然后使用 `<icones-icon name="app:check"></icones-icon>`。普通元素模式可将同一个 scope 传入 `bindIcons({ scope })`，再使用 `<i icon-name="app:check"></i>`。两种方式共享核心配置、缓存和加载器。本地元组 JSON 可经 `parseElementData` 校验后加入 sources。

同一 CustomElementRegistry 只注册一次；重复调用安全，但不覆盖首次注册的默认 scope。浏览器不支持取消注册；修改组件实现后需刷新页面。如果同名标签已经被其他实现注册，会抛出明确错误。

每个元素可以设置独立 scope（也支持注册前赋值）：

```ts
const icon = document.createElement("icones-icon")
icon.scope = createIconConfig({ defaultSize: "sm" }, scope)
icon.setAttribute("name", "app:check")
document.body.append(icon)

await icon.load() // 仅等待当前已激活的图标，不会强制触发 defer
icon.scope = undefined // 恢复本窗口首次注册时的默认 scope
icon.remove() // 自动清理
```

`scope` 是 JS 属性，不是 HTML 字符串属性。显式注册可传入 `window` 用于 iframe 等独立环境。导入包或注册模块不要求 DOM；没有浏览器时注册不执行。服务端 SVG 输出请使用核心 `renderIcon`；Web Component 只在连接到浏览器文档后渲染。template 和脱离文档的元素在插入文档后才激活。

## 延迟渲染

```html
<icones-icon name="tabler:star" size="24" defer="intersect"></icones-icon>
<icones-icon name="tabler:heart" size="24" defer="domready"></icones-icon>

<i icon-name="tabler:star" icon-size="24" icon-defer="intersect"></i>
<i icon-name="tabler:heart" icon-size="24" icon-defer="domready"></i>
```

- `intersect`：同一文档共享 IntersectionObserver，首次进入视口后停止观察；无此 API 时立即渲染。
- `domready`：文档仍在 loading 时等待 DOMContentLoaded；已 interactive / complete 时立即渲染。
- 未设置、空值或未知值：立即渲染。

延迟期间不创建 SVG、不订阅或发起运行时图标请求；触发时读取最新属性和 scope。修改待激活元素的 defer（普通元素为 icon-defer）会切换等待条件，移除延迟属性会立即渲染。移除元素或删除名称属性会取消等待。首次激活后不再延迟，包括同一组件/初始化器生命周期中的移除后重新插入。

避免布局跳动时，自行给空宿主预留尺寸：

```css
icones-icon[defer="intersect"],
i[icon-defer="intersect"] {
  display: inline-block;
  width: 24px;
  height: 24px;
}
```

Vite 仍会静态提取延迟元素的名称；已内联的数据不会因此拆成懒加载模块。

## 手动控制

```ts
import { mountIcon, createIconConfig } from "@icones/vanilla"

const scope = createIconConfig({
  api: { type: "symbol", baseUrl: "/icons" },
  defaultSize: "lg",
})
const icon = mountIcon(
  document.querySelector("#toolbar")!,
  { name: "tabler:star", "aria-label": "收藏" },
  scope
)

icon.update({ name: "tabler:heart", size: 32, color: "red" })
await icon.load()
icon.destroy()
```

`createIcon(props, { scope, document })` 创建未挂载实例，返回 `element`、`update`、`load`、`destroy`。`mountIcon(target, props, scope?)` 同时挂载。`update` 接收完整 props；手动 API 仍需调用 `destroy` 解除订阅并移除 SVG。样式可使用 CSS 字符串或 CSS 属性名对象，额外 SVG 属性通过 `attributes` 传入，事件使用 `element.addEventListener`。

开发：`bun run --cwd packages/vanilla play`。测试：`bun run --cwd packages/vanilla test`。完整 API 和 Vite 用法见[项目文档](../../README.md)。