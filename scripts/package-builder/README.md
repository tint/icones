# @icones/package-builder

私有 npm 发布工具。它不编译组件、不生成图标，也不发布自身；职责是把 `packages/*` 的源码工作区转换为可直接发布的最终包。

## 源码与发布清单

`packages/<name>/package.json` 是开发清单。公开包之间使用 `workspace:*`，并可包含 `development` / `bun` 源码条件、构建脚本和开发依赖。这些清单不能直接发布。

构建后的 `dist/packages/<name>/package.json` 是发布清单。工具会：

- 默认保留每个源码包自己的 `version`；传入 `--version <semver>` 时统一覆盖所有公开包。
- 将 `workspace:*` 改为被依赖包的目标版本。例如 Astro 依赖 Core 时，使用 Core 的发布版本，而不是 Astro 自身版本。
- 移除 `development` / `bun` 源码条件、`src` sideEffects、scripts、devDependencies 和 files 白名单。
- 仅复制运行文件、类型声明、包 README 和必要的附加文档；MIT 软件包同时复制仓库根 `LICENSE`。
- 检查发布清单中没有 `workspace:` 或源码路径，并验证所有非通配 exports、bin 和 types 文件存在。
- 再次对照源码依赖与目标版本；不一致时在生成 tarball 或上传前失败。

## 命令

从工作区根目录执行：

```sh
bun run build:release
# 生成 dist/packages/<name>/，版本来自各源码 package.json

bun run build:release --version 0.1.0
# 临时将全部最终包和内部依赖统一为 0.1.0；不修改源码清单

bun run pack:packages
# 构建后生成 dist/packages/tarballs/*.tgz

bun run publish:packages --dry-run
# 对全部 tarball 执行发布演练，不上传

bun run publish:packages --all
# 按依赖顺序正式发布
```

`--version` 对以上命令均为可选参数。`--out <directory>` 可修改最终目录；`publish:packages` 还支持 `--tag <tag>` 和 `--registry <url>`。

正式发布必须明确选择 `--all`，发布演练必须明确选择 `--dry-run`，两者不能同时省略或同时使用。发布顺序为 names、icons、core、各组件包、Vite、MCP Server。npm 发布不是事务操作；正式发布前应先完成 dry-run，并确认所有源码包版本符合预期。