import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { createIconRepository } from "@icones/vite/server"
import {
  generateNames,
  readIconNames,
} from "../../../../scripts/icon-builder/src/generate/names.ts"

const directory = fileURLToPath(
  new URL("../../../../packages/icons/", import.meta.url)
)

const typeDirectory = fileURLToPath(
  new URL("../../../../packages/names/", import.meta.url)
)

test("icons is a workspace package and generated names exactly match the real catalog", async () => {
  expect(
    existsSync(new URL("../../../../packages/icon-types", import.meta.url))
  ).toBe(false)
  expect(
    existsSync(new URL("../../../../packages/icons-scripts", import.meta.url))
  ).toBe(false)
  const pkg = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8")
  )
  expect(pkg.name).toBe("@icones/icons")
  expect(pkg.dependencies).toBeUndefined()
  expect(pkg.scripts).toBeUndefined()
  expect(pkg.types).toBeUndefined()
  expect(pkg.exports).toEqual({ "./*": "./*" })
  expect(pkg.files).not.toContain("types")
  expect(existsSync(path.join(directory, "types"))).toBe(false)
  expect((await generateNames(directory)).changed).toBe(false)
  expect(existsSync(path.join(directory, "types"))).toBe(false)
  expect(await generateNames(directory, { check: true })).toEqual({
    sets: 8,
    icons: 20823,
    changed: false,
  })
  const sets = await readIconNames(directory)
  const names = [...sets.values()].flat().sort()
  const repository = createIconRepository(directory)
  await repository.ready()
  expect(names).toEqual([...repository.records.keys()].sort())
  const index = await readFile(
    path.join(typeDirectory, "types/index.d.ts"),
    "utf8"
  )
  expect(index.split("\n").length).toBeLessThan(25)
  expect(index).not.toContain('"tabler:star"')
  expect((await readdir(path.join(typeDirectory, "types"))).sort()).toEqual(
    ["index", ...sets.keys()].map((name) => `${name}.d.ts`).sort()
  )
  for (const [set, expectedNames] of sets) {
    const declarations = await readFile(
      path.join(typeDirectory, `types/${set}.d.ts`),
      "utf8"
    )
    expect(index).toContain(`"${set}": import("./${set}.js").IconName`)
    expect(
      [...declarations.matchAll(/^\s*\| "([^"]+)"$/gm)].map((match) => match[1])
    ).toEqual(expectedNames)
  }
  expect(sets.get("flag")).toContain("flag:us-circle")
  expect(sets.get("flag")).toContain("flag:us-square")
  expect(sets.get("flag")).toContain("flag:us")
  expect(sets.has("circle-flags")).toBe(false)
  expect(sets.has("huge")).toBe(true)
  expect(sets.has("hugeicons")).toBe(false)
  expect(sets.get("phosphor")).toHaveLength(3024)
  expect(sets.get("phosphor")).toContain("phosphor:star")
  expect(sets.get("phosphor")).toContain("phosphor:star-fill")
  expect(
    sets
      .get("phosphor")!
      .some((name) => /-(bold|duotone|light|thin)$/.test(name))
  ).toBe(false)
})

test("type exports add no runtime icon inventory to Core", async () => {
  expect(Object.keys(await import("@icones/names"))).toEqual([])
  expect(Object.keys(await import("@icones/names/tabler"))).toEqual([])
  expect(
    (await import("@icones/icons/tabler/data/star.json")).default
  ).toBeArray()
  const output = new URL("../../../../packages/core/dist/", import.meta.url)
  for (const file of (await readdir(output)).filter((file) =>
    file.endsWith(".js")
  )) {
    const code = await readFile(new URL(file, output), "utf8")
    expect(code).not.toContain('from "@icones/icons"')
    expect(code).not.toContain('from "@icones/names"')
    expect(code).not.toContain('"tabler:accessible-off-filled"')
  }
})

test("Core name types depend only on the artwork-free declarations package", async () => {
  const core = JSON.parse(
    await readFile(
      new URL("../../../../packages/core/package.json", import.meta.url),
      "utf8"
    )
  )
  const types = JSON.parse(
    await readFile(path.join(typeDirectory, "package.json"), "utf8")
  )
  expect(core.dependencies["@icones/icons"]).toBeUndefined()
  expect(core.dependencies["@icones/names"]).toBe("workspace:*")
  expect(types.dependencies).toBeUndefined()
  expect(types.private).not.toBe(true)
  expect(types.files).toEqual(["types", "index.js", "README.md"])
  expect(
    await readFile(
      new URL(
        "../../../../packages/core/src/runtime/types.ts",
        import.meta.url
      ),
      "utf8"
    )
  ).not.toContain('from "@icones/icons"')
})

test("a production adapter consumer resolves types without loading the icons package", () => {
  const file = path.join(typeDirectory, "__consumer.ts")
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
    target: ts.ScriptTarget.ES2023,
  }
  const host = ts.createCompilerHost(options)
  const read = host.readFile
  host.readFile = (name) =>
    name === file
      ? 'import type { IconProps, IconName } from "@icones/react"; export const props: IconProps = { name: "tabler:star" satisfies IconName };'
      : read(name)
  const program = ts.createProgram([file], options, host)
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      )
  ).toEqual([])
  const files = program.getSourceFiles().map((source) => source.fileName)
  expect(files.some((name) => name.startsWith(directory))).toBe(false)
  expect(files.some((name) => /@iconify[+/]/.test(name))).toBe(false)
  expect(files).toContain(path.join(typeDirectory, "types/index.d.ts"))
})

test.each([
  "antd",
  "bootstrap",
  "brand",
  "flag",
  "huge",
  "lucide",
  "phosphor",
  "tabler",
])("%s type subpath loads only its own collection", (set) => {
  const file = path.join(directory, "__set_type_test.ts")
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const originalReadFile = host.readFile
  host.readFile = (name) =>
    name === file
      ? `import type { IconName } from "@icones/names/${set}"; export type Name = IconName;`
      : originalReadFile(name)
  const program = ts.createProgram([file], options, host)
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      )
  ).toEqual([])
  expect(
    program
      .getSourceFiles()
      .map((source) => source.fileName)
      .filter((name) => name.startsWith(path.join(directory, "types/")))
  ).toEqual([])
  expect(
    program
      .getSourceFiles()
      .map((source) => source.fileName)
      .filter((name) =>
        [directory, typeDirectory].some((root) =>
          name.startsWith(path.join(root, "types/"))
        )
      )
  ).toEqual([path.join(typeDirectory, `types/${set}.d.ts`)])
})

test.each(["IconName", "Name", "IconProps"])(
  "%s offers complete catalog name completions",
  (type) => {
    const file = path.join(
      fileURLToPath(new URL("../../../../", import.meta.url)),
      "__icon_name_completion_test.tsx"
    )
    const source = `import type { ${type} } from "@icones/react"; const value: ${type} = ${type === "IconProps" ? '{ name: "tabler:star" }' : '"tabler:star"'};`
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => [file],
      getScriptVersion: () => "1",
      getScriptSnapshot: (name) => {
        const content = name === file ? source : ts.sys.readFile(name)
        return content === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(content)
      },
      getCurrentDirectory: () => path.dirname(file),
      getCompilationSettings: () => ({
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        customConditions: ["development"],
        jsx: ts.JsxEmit.ReactJSX,
        types: [],
      }),
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    }
    const service = ts.createLanguageService(host)
    try {
      expect(
        service
          .getSemanticDiagnostics(file)
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
          )
      ).toEqual([])
      const result = service.getCompletionsAtPosition(
        file,
        source.indexOf("tabler:st") + "tabler:st".length,
        {}
      )
      expect(
        result?.entries.some((entry) => entry.name === "tabler:star")
      ).toBe(true)
      expect(
        result?.entries.some((entry) => entry.name === "tabler:star-filled")
      ).toBe(true)
      expect(service.getSemanticDiagnostics(file)).toHaveLength(0)
    } finally {
      service.dispose()
    }
  }
)
