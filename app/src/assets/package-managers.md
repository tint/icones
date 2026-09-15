# Package-manager marks

The package-manager selector supports npm, pnpm, Yarn, Bun and Deno. It reuses the workspace's Brand icons for npm, pnpm, Yarn and Deno.

The Bun path in `components/package-manager-select.tsx` comes from [Simple Icons](https://github.com/simple-icons/simple-icons/blob/develop/icons/bun.svg), distributed under [CC0-1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Its path is unchanged; the wrapper uses `currentColor` and is decorative.

Command references:

- [npm](https://docs.npmjs.com/cli/commands/npm-install/)
- [pnpm](https://pnpm.io/cli/add)
- [Yarn](https://yarnpkg.com/cli/add)
- [Bun](https://bun.sh/docs/cli/add)
- [Deno](https://docs.deno.com/runtime/reference/cli/add/)

All selectors show installation commands for the reader’s application, with registry package names in both dev and build. The website’s own package manager and build mode do not affect these examples. Registry access and a compatible package release are required; the selector does not guarantee publication.