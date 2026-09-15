# 测试归属与运行

测试跟随被验证的模块，不能仅凭导入了多个包就判定为跨包测试。

`scripts/verify/` 是私有工作区 `@icones/verify`，只负责跨包契约、产物消费及静态部署验证，不发布，也不提供运行时 API。根目录不再保留 `tests/`；各包与网站的单元测试仍归各自所有。

| 位置                                | 职责                                                |
| ----------------------------------- | --------------------------------------------------- |
| `packages/<name>/tests/`            | 包自身行为；Core 不依赖框架、网站或生成器测试夹具   |
| `app/tests/`                        | 网站组件、路由、语言、教程及网站服务                |
| `scripts/icon-builder/tests/`       | 导入、生成、恢复与维护流程                          |
| `scripts/package-builder/tests/`    | npm 发布清单转换、依赖版本与源码清理规则            |
| `scripts/verify/tests/contracts/`   | 架构边界、生产 exports、独立消费者、资源/声明一致性 |
| `scripts/verify/tests/integration/` | 跨包构建、资源消费、真实静态部署                    |
| `scripts/verify/tests/types/`       | 生产声明与跨框架类型契约                            |

## 运行入口

首次运行集成、框架或产物检查前，先执行 `bun run build:packages`。

```sh
bun run test              # 构建库，再运行包、网站、跨包及框架测试
bun run test:packages     # Bun 包测试及私有生成器测试
bun run test:app          # 网站测试
bun run test:integration  # 架构/发布契约与跨包构建
bun run test:frameworks   # Vanilla、Vue、Svelte、Solid、Astro
bun run typecheck        # 所有工作区、测试及类型契约
```

单独调试可执行 `bun run --cwd packages/core test` 或 `bun run --cwd app test`。包测试中的产物/CLI 检查仍需事先构建相应包。

跨包验证也可以独立运行：

```sh
bun run --cwd scripts/verify test
bun run --cwd scripts/verify typecheck
```

本工作区的 `tsconfig.json` 覆盖常规用例和名称类型用例；`tsconfig.frameworks.json` 关闭源码条件导出，专门验证生产声明的跨框架类型契约。MCP 文档生成脚本由该包的 `tsconfig.scripts.json` 检查。根 `typecheck` 通过各自的工作区脚本调用这些配置。

不要从根目录用无路径的 `bun test` 扫描所有文件：Vue/Svelte/Solid 的浏览器测试使用 Vitest，Astro 使用构建验证；Vue、Solid 的 Bun SSR 入口与浏览器入口独立。React 的类型增补用例也由独立 TypeScript 配置检查。

`icons`、`names` 保持纯产物包，不添加测试脚本或开发依赖。图标生成逻辑在 icon-builder 中测试，npm 清单转换在 package-builder 中测试，产物消费在 verify 中验证。`package-boundaries.test.ts` 同时保证源码内部依赖保留 `workspace:*`；最终发布目录不得包含该协议。测试需要的 `@iconify/utils` 只作为 verify 的开发依赖用于兼容性比对，不进入 CSR/SSR 运行时依赖。`test-layout.test.ts` 检查测试文件的类型检查覆盖、运行时单元测试的依赖边界，以及根目录不再出现测试目录。