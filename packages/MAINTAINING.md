# Packages 维护说明

本文件面向仓库维护者。各 `packages/*/README.md` 面向 npm 使用者，只说明安装、公开 API 和运行时行为。

从仓库根目录安装依赖并执行全量检查：

```sh
bun install
bun run check
bun run test
```

`bun run build:packages` 按依赖顺序构建公开包。最终 npm 清单与 tarball 由 `scripts/package-builder` 生成，不直接发布源码目录；图标资源和名称声明由 `scripts/icon-builder` 维护。

框架示例可以分别运行：

```sh
bun run --cwd packages/react play
bun run --cwd packages/vue play
bun run --cwd packages/svelte play
bun run --cwd packages/solidjs play
bun run --cwd packages/astro play
bun run --cwd packages/vanilla play
```

包测试使用对应目录的 `test` 脚本。部分浏览器测试需要本机 Chrome；Svelte 开发时可先运行其 `dev` 脚本监听库输出。

Core 的源码职责与依赖边界见 [Core 维护说明](core/MAINTAINING.md)。MCP 文档快照来自网站 Guide，修改 Guide 后运行：

```sh
bun run --cwd packages/mcp-server build
bun run --cwd packages/mcp-server check:docs
```

不要手动编辑 `packages/mcp-server/src/generated/documentation.json`。图标导入、名称生成、静态集合构建及部署命令见 [`scripts/icon-builder`](../scripts/icon-builder/README.md)。