import { expect, test } from "bun:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = fileURLToPath(new URL("../", import.meta.url))
const sourceRoot = path.join(root, "src")
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
const groups = ["data", "options", "resources", "runtime", "svg"]

test("Core implementations are grouped by purpose, without flat forwarding modules", () => {
  const entries = readdirSync(sourceRoot, { withFileTypes: true })
  expect(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted()
  ).toEqual(groups)
  expect(
    entries
      .filter((entry) => entry.name.endsWith(".ts"))
      .map((entry) => entry.name)
  ).toEqual(["index.ts"])
})

test("source organization preserves all existing public subpaths and flat dist entry names", () => {
  expect(Object.keys(pkg.exports).toSorted()).toEqual([
    ".",
    "./catalog",
    "./controller",
    "./data",
    "./element-types",
    "./elements",
    "./icon-data",
    "./loaders",
    "./manifest",
    "./presentation",
    "./registry",
    "./resource-types",
    "./runtime",
    "./set-options",
    "./sizes",
    "./slug",
    "./store",
    "./svg",
    "./svg-data",
    "./symbol",
    "./types",
    "./view-box",
  ])
  for (const [key, entry] of Object.entries(pkg.exports) as [
    string,
    Record<string, string>,
  ][]) {
    const name = key === "." ? "index" : key.slice(2)
    expect(entry.development).toBe(entry.bun)
    expect(existsSync(path.join(root, entry.bun))).toBe(true)
    expect(entry.import).toBe(`./dist/${name}.js`)
    expect(entry.default).toBe(entry.import)
    expect(entry.types).toBe(`./dist/${name}.d.ts`)
    if (key !== ".") expect(groups).toContain(entry.bun.split("/")[2]!)
  }
})

test("data tools do not import component runtime, and runtime does not import resource management", () => {
  for (const relative of readdirSync(sourceRoot, { recursive: true })) {
    if (typeof relative !== "string" || !relative.endsWith(".ts")) continue
    const file = path.join(sourceRoot, relative)
    const group = relative.split(path.sep)[0]!
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true
    )
    for (const node of source.statements) {
      if (
        !(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ||
        !node.moduleSpecifier ||
        !ts.isStringLiteral(node.moduleSpecifier)
      )
        continue
      const imported = node.moduleSpecifier.text
      if (!imported.startsWith(".")) {
        // The only external source dependency is the generated name declaration.
        expect(imported, relative).toBe("@icones/names")
        expect(
          ts.isImportDeclaration(node)
            ? node.importClause?.isTypeOnly
            : node.isTypeOnly,
          relative
        ).toBe(true)
        continue
      }
      const target = path.resolve(
        path.dirname(file),
        imported.endsWith(".ts") ? imported : imported + ".ts"
      )
      expect(existsSync(target), `${relative}: ${imported}`).toBe(true)
      const targetRelative = path.relative(sourceRoot, target)
      expect(targetRelative.startsWith(".."), relative).toBe(false)
      const targetGroup = targetRelative.split(path.sep)[0]!
      if (["data", "svg", "options", "resources"].includes(group)) {
        expect(["runtime", "index.ts"], relative).not.toContain(targetGroup)
      }
      if (["data", "svg", "options", "runtime"].includes(group)) {
        expect(targetGroup, relative).not.toBe("resources")
      }
    }
  }
})
