import { expect, test } from "bun:test"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = fileURLToPath(new URL("../../../../", import.meta.url))
const workspaces = [
  "app",
  ...["packages", "scripts"].flatMap((parent) =>
    readdirSync(path.join(root, parent), { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(path.join(root, parent, entry.name, "package.json"))
      )
      .map((entry) => `${parent}/${entry.name}`)
  ),
]

test("every test, type fixture and package script belongs to its owner's TypeScript project", () => {
  expect(existsSync(path.join(root, "tests"))).toBe(false)
  expect(workspaces).toContain("scripts/verify")
  for (const owner of workspaces) {
    const directory = path.join(root, owner)
    const sources = ["tests", "scripts"].filter((name) =>
      existsSync(path.join(directory, name))
    )
    if (!sources.length) continue
    const included = new Set<string>()
    for (const file of readdirSync(directory).filter((entry) =>
      /^tsconfig.*\.json$/.test(entry)
    )) {
      const config = ts.readConfigFile(
        path.join(directory, file),
        ts.sys.readFile
      )
      expect(config.error).toBeUndefined()
      const parsed = ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        directory,
        undefined,
        undefined,
        undefined,
        [
          {
            extension: ".svelte",
            isMixedContent: true,
            scriptKind: ts.ScriptKind.Deferred,
          },
        ]
      )
      for (const source of parsed.fileNames) included.add(path.resolve(source))
    }
    for (const name of sources) {
      const sourceDirectory = path.join(directory, name)
      for (const file of readdirSync(sourceDirectory, { recursive: true })) {
        if (typeof file !== "string" || !/\.(ts|tsx|svelte)$/.test(file))
          continue
        if (!statSync(path.join(sourceDirectory, file)).isFile()) continue
        expect(
          included.has(path.join(sourceDirectory, file)),
          `${owner}/${name}/${file} is not typechecked`
        ).toBe(true)
      }
    }
    const pkg = JSON.parse(
      readFileSync(path.join(directory, "package.json"), "utf8")
    )
    expect(pkg.scripts.test, `${owner} must expose its tests`).toBeString()
    expect(
      pkg.scripts.typecheck,
      `${owner} must expose typechecking`
    ).toBeString()
  }
})

test("runtime unit tests do not depend on website, generator or build implementations", () => {
  for (const owner of ["core", "react"]) {
    const directory = path.join(root, "packages", owner, "tests")
    for (const file of readdirSync(directory, { recursive: true })) {
      if (typeof file !== "string" || !/\.tsx?$/.test(file)) continue
      const content = readFileSync(path.join(directory, file), "utf8")
      const source = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      )
      function visit(node: ts.Node) {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const imported = node.moduleSpecifier.text
          if (owner === "core")
            expect(imported, `${owner}/${file}`).not.toMatch(
              /^@icones\/(?!(?:core|names)(?:\/|$))/
            )
          expect(imported, `${owner}/${file}`).not.toMatch(
            /@iconify\/|@icones\/(vite|icons|icon-builder|verify)(\/|$)|(?:^|\/)(app|scripts)\//
          )
          if (owner !== "react")
            expect(imported, `${owner}/${file}`).not.toMatch(
              /^(react(?:-dom)?(?:\/|$)|@icones\/(react|vue|svelte|solidjs|astro|vanilla)(?:\/|$))/
            )
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
})
