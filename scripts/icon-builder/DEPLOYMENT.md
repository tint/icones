# Cloudflare 静态部署

网站和每个图标集分别部署，均不包含 Worker 脚本。`packages/icons/` 仍是纯资源包；部署配置、校验和命令只属于本工具包。

## 构建结果

从仓库根目录执行 `bun run build`，或者在依赖包构建后执行 `bun run --cwd app build`：

```text
dist/
  client/                       → icones.go-slim.dev
    icons/catalog.json          # 生产搜索索引，不含被排除的集合
    icons/index.html            # 图标页面，不是数据服务入口
    assets/                     # 网站自身使用的 JS、CSS 和少量图标
    ...                         # 预渲染页面
  icons/
    tabler/                     → tabler.icones.go-slim.dev
      wrangler.jsonc
      build-report.json         # 文件数、字节数、最大文件、目标域名
      .icones-generated.json    # 生成目录归属标记，不上传
      public/                   # 只有此目录上传
        index.html              # 集合介绍、示例地址、来源和许可链接
        data/*.json
        symbols/*.svg
        manifest.json
        license.txt
        _headers
    ...                         # 其他获准发布的集合
  server/                       # 预渲染中间产物，不部署
```

`ICONES_BUILD_DIRECTORY` 可指定独立输出根目录，网站写入其 `client/`，图标部署写入其 `icons/`，不覆盖默认 `dist/`。部署自定义输出时，请使用该目录下的配置；根 `wrangler.jsonc` 始终指向默认 `dist/client/`。

`build-report.json` 的 `configFile` 固定为 `./wrangler.jsonc`，相对于报告所在目录解析，不包含构建机器的绝对路径。整个集合部署目录可以移动；部署命令在该集合目录中执行 Wrangler。

`public/index.html` 在构建期间生成，无 JavaScript 或外部样式依赖，包含真实图标数量、样式别名（Flag 保留形状／宽高比）、可用 JSON/SVG 示例、manifest、来源和许可证链接。它与其他资源一起计入文件数和大小校验；不会修改资源包 `packages/icons/`。

### 生成标记中的 v1

`.icones-generated.json` 的 `owner: "@icones/icon-builder/collection-v1"` 是工具手动定义的第一版**生成目录格式标识**，只用来判断目录能否安全替换或清理。它不是图标数据版本、上游 revision、npm 包版本，也不是每次 build 自动递增的版本号。

只有生成目录布局或归属／清理规则发生不兼容变化时，才需要修改该标识，并实现旧目录的显式迁移。本次新增介绍页、改用相对报告路径不改变目录布局和归属规则，继续使用 v1。未知标识不会被自动覆盖或删除。

只更新图标部署文件，不重建网站：

```sh
bun run build:icons
bun run build:icons --set tabler
bun run build:icons --set tabler --set flag
```

这些命令不上传、不登录，也不重新下载图标。`build:icons` 和 `deploy:icons` 固定生成默认 `dist/icons/`；增删图标或修改部署策略后还要重新构建网站，使搜索索引保持一致。

## 域名与发布策略

修改 [config/deployment.json](config/deployment.json)：

- `domain`：集合域名后缀，同时用于网站生产环境的图标 URL 模板。主站域名另外在根 `wrangler.jsonc` 维护。
- `maxFiles`：单个集合部署的文件数上限，默认 20,000。统计保守地包含 `_headers`。
- `maxFileBytes`：单文件上限，默认 25 MiB；不是集合总大小上限。
- `excludedCollections`：不生成公开部署、不进入生产搜索索引和集合选择器的集合及原因。开发和 `build:local` 不受此过滤影响。

当前排除配置为空，8 个集合均参与构建。新增集合 `bootstrap`、`antd` 分别部署到 `bootstrap.icones.go-slim.dev`、`antd.icones.go-slim.dev`；两者的 MIT 版权与许可原文都随资源发布。以后需要暂停某个集合时可添加排除项；移除排除项并不代表工具替你确认了分发授权。

构建会检查清单引用的 JSON/SVG 配对、原始许可证、常规文件类型和尺寸限制。未列入清单的图标不上传。先验证所有选中集合，再替换生成快照；只替换带本工具归属标记的目录。全量构建会清理已移除或被排除的旧生成集合，单集合构建不会影响其他集合。不要在生成目录中保存手写文件。

Cloudflare 当前限制见 [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)。确认自己的账户套餐后才调整文件数上限。

## 发布命令

前提：`go-slim.dev` 已在同一 Cloudflare 账户中激活，当前账号有部署和管理对应域名的权限。每个完整主机名分别配置 Custom Domain，不使用泛域名自动分配集合。Cloudflare 会为 Custom Domain 创建 DNS 和证书，见 [官方说明](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

首次登录：

```sh
bunx wrangler@4 login
```

本地检查，**不上传**：

```sh
bun run deploy:icons --set tabler --dry-run
bun run deploy:icons --all --dry-run
bun run deploy:app --dry-run
```

`deploy:icons` 会先重建选中集合，`deploy:app` 会先执行完整网站构建，然后调用 Wrangler。首次使用 `bunx` 可能需要下载 Wrangler。`--dry-run` 不是线上域名、证书或账户额度验证。

正式发布，**以下命令会上传并变更线上部署／域名绑定**：

```sh
# 先发布资源，可选择一个或全部获准发布的集合
bun run deploy:icons --set tabler
bun run deploy:icons --all

# 各集合可用后，再发布网站
bun run deploy:app
```

`deploy:icons` 必须显式指定 `--set` 或 `--all`，出错即停止后续集合。`deploy:app` 固定使用根 `wrangler.jsonc`，只上传完整构建后的 `dist/client/`，不会上传 `dist/server/` 或 `dist/icons/`。各集合是独立部署，不保证与网站一起原子更新。先发布数据、后发布网站；删除或改名图标时，需要兼顾仍缓存旧目录的客户端。

验证目标响应：

```sh
curl -I https://tabler.icones.go-slim.dev/data/star.json
curl -I https://tabler.icones.go-slim.dev/symbols/star.svg
curl -I https://tabler.icones.go-slim.dev/data/nonexistent-icon.json
```

前两个应返回 200、正确 Content-Type 和 `Access-Control-Allow-Origin: *`，缺失文件应为 404，而不是网站 HTML。配置和构建报告位于 `public/` 外，不对外提供。

## 网站加载与本地预览

开发默认读取同源 `/icons/<set>/data/<name>.json`，无需已部署的域名。默认生产构建使用：

```text
/icons/catalog.json
https://<set>.icones.go-slim.dev/data/<name>.json
https://<set>.icones.go-slim.dev/symbols/<name>.svg#icon
https://<set>.icones.go-slim.dev/manifest.json
https://<set>.icones.go-slim.dev/license.txt
```

浏览器通过 Fetch 加载 JSON 并内联渲染图形。跨域响应头不会解除浏览器对外部 SVG `<use>` 的同源限制，不应直接依赖跨域 `symbol.svg#icon` 显示图标。

构建时可覆盖：

- `VITE_ICON_COLLECTION_URL`：每集合根地址模板，必须包含 `{set}`，例如 `https://cdn.example.com/icons/{set}`。优先于共享根地址。
- `VITE_ICON_DATA_BASE_URL`：已有共享资源根地址，其下仍为 `<set>/data`、`<set>/symbols`。显式设置后不使用默认集合子域名。
- `VITE_ICON_CATALOG_BASE_URL`：独立的目录元数据根地址，默认同源 `/icons`，不会跟随资源域名改变。生产读取其 `catalog.json`，开发仍使用实时 `/catalog` 查询。

域名未上线时，默认生产构建的动态画廊无法远程加载图标。需要完全离线预览旧的单目录产物时使用：

```sh
bun run build:local
bun run --cwd app preview
```

此模式将所有集合复制到 `dist/client/icons/`，不生成新的集合部署，不适合直接上传 Cloudflare 免费套餐。重新运行 `bun run build` 即恢复拆分产物。组件包的默认加载策略没有被此网站部署配置改变。