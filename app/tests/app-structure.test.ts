import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import routes from "../src/routes.ts"

const source = fileURLToPath(new URL("../src/", import.meta.url))
const files = [...new Bun.Glob("**/*.{ts,tsx}").scanSync(source)]

function modulePaths(file: string) {
  const ast = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  )
  const modules: string[] = []
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      modules.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      modules.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return modules.filter((specifier) => specifier.startsWith("."))
}

test("route declarations point to existing page modules in routes", () => {
  for (const route of routes) {
    expect(route.file).toStartWith("routes/")
    expect(existsSync(resolve(source, route.file))).toBe(true)
  }
  const ids = routes.flatMap((route) => (route.id ? [route.id] : []))
  expect(new Set(ids).size).toBe(ids.length)
})

test("relocated source imports resolve and shared modules stay independent", () => {
  for (const file of files) {
    for (const specifier of modulePaths(resolve(source, file))) {
      const target = resolve(source, dirname(file), specifier.split(/[?#]/)[0]!)
      const label = file + " → " + specifier
      expect(
        ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].some((suffix) =>
          existsSync(target + suffix)
        ),
        label
      ).toBe(true)
      const destination = relative(source, target).split(sep)[0]
      if (file.startsWith("shared/")) {
        expect(["app", "features", "routes"], label).not.toContain(destination)
      }
      if (file.startsWith("features/")) {
        expect(["app", "routes"], label).not.toContain(destination)
      }
    }
  }
})
