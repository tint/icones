import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import {
  readFile,
  readdir,
  mkdtemp,
  mkdir,
  cp,
  writeFile,
  rm,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../../../", import.meta.url))
const source = (file: string) =>
  fileURLToPath(new URL("../../../../" + file, import.meta.url))
const manifest = async (name: string) =>
  JSON.parse(await readFile(source(`packages/${name}/package.json`), "utf8"))

test("packages are non-private while the workspace, app and internal tooling stay private", async () => {
  // Inspect workspace manifests only; artwork can also be named package.json.
  const packages = (await readdir(source("packages"), { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(source(`packages/${entry.name}/package.json`))
    )
    .map((entry) => entry.name)
  expect(packages.length).toBeGreaterThan(0)
  for (const name of packages)
    expect((await manifest(name)).private).not.toBe(true)

  for (const file of [
    "package.json",
    "app/package.json",
    "scripts/icon-builder/package.json",
    "scripts/verify/package.json",
  ])
    expect(JSON.parse(await readFile(source(file), "utf8")).private).toBe(true)
})

test("public source manifests keep internal packages as workspace links", async () => {
  const packageNames = new Set(
    (await readdir(source("packages"), { withFileTypes: true }))
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(source(`packages/${entry.name}/package.json`))
      )
      .map((entry) => `@icones/${entry.name}`)
  )
  for (const packageName of packageNames) {
    const pkg = await manifest(packageName.slice("@icones/".length))
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ])
      for (const [dependency, range] of Object.entries(pkg[field] ?? {}))
        if (packageNames.has(dependency)) expect(range).toBe("workspace:*")
  }
})

async function checkGraph(
  entries: string[],
  target: "browser" | "node",
  imports: RegExp,
  files?: RegExp
) {
  // Resolve real package graphs outside the test runner's module cache/mocks.
  execFileSync(
    process.execPath,
    [
      "-e",
      `
      import assert from "node:assert/strict";
      const files = ${files ?? "undefined"};
      const result = await Bun.build({
        entrypoints: ${JSON.stringify(entries.map(source))},
        target: ${JSON.stringify(target)},
        plugins: [{
          name: "layer-boundary",
          setup(build) {
            build.onResolve({ filter: ${imports} }, ({ path }) => {
              throw new Error("Unexpected dependency: " + path);
            });
            if (files) build.onLoad({ filter: files }, ({ path }) => {
              throw new Error("Unexpected implementation: " + path);
            });
          }
        }]
      });
      assert.deepEqual(result.logs, []);
      assert.equal(result.success, true);
      `,
    ],
    { cwd: root, stdio: "pipe" }
  )
}

test("component runtime has no resource, tooling or parser package dependency", async () => {
  const core = await manifest("core")
  expect(
    Object.keys(core.exports).some((key) =>
      /^\.\/(server|protocol)(\/|$)/.test(key)
    )
  ).toBe(false)
  for (const dependency of [
    "@icones/catalog",
    "@icones/converter",
    "@icones/server",
    "@icones/vite",
    "saxes",
  ])
    expect(core.dependencies).not.toHaveProperty(dependency)
  for (const name of ["react", "vue", "svelte", "solidjs", "vanilla", "astro"])
    expect((await manifest(name)).dependencies).toEqual({
      "@icones/core": "workspace:*",
    })
  expect(core.dependencies).toEqual({ "@icones/names": "workspace:*" })
  for (const name of [
    "core",
    "mcp-server",
    "react",
    "vue",
    "svelte",
    "solidjs",
    "vanilla",
    "astro",
  ])
    for (const field of [
      "dependencies",
      "peerDependencies",
      "optionalDependencies",
    ])
      expect(
        Object.keys((await manifest(name))[field] ?? {}).some((key) =>
          key.startsWith("@iconify/")
        )
      ).toBe(false)
  for (const dependency of ["@icones/vite", "@icones/server", "saxes"])
    expect((await manifest("mcp-server")).dependencies).not.toHaveProperty(
      dependency
    )
  for (const name of ["catalog", "converter", "utils", "server"])
    expect(existsSync(source(`packages/${name}`))).toBe(false)
  for (const file of [
    "package.json",
    "app/package.json",
    "packages/vite/package.json",
    "scripts/icon-builder/package.json",
    "scripts/verify/package.json",
    "bun.lock",
  ])
    expect(await readFile(source(file), "utf8")).not.toContain("@icones/server")
})

test("Core runtime does not pull catalog data tools into component bundles", async () => {
  await checkGraph(
    ["packages/core/src/index.ts"],
    "browser",
    /^(node:|@iconify\/|saxes$|xmlchars(?:\/|$)|@icones\/(?:server|vite|icons)(?:\/|$))/,
    /\/core\/(?:src\/resources\/(?:catalog|manifest|types)\.|dist\/(?:catalog|manifest|resource-types)\.)/
  )
})

test("built component declarations and JavaScript have no Iconify dependency or default endpoint", async () => {
  for (const name of [
    "core",
    "react",
    "vue",
    "svelte",
    "solidjs",
    "vanilla",
    "astro",
  ]) {
    const directory = source(`packages/${name}/dist`)
    for (const file of await readdir(directory, { recursive: true })) {
      if (!/\.(?:m?js|ts|svelte|astro)$/.test(file)) continue
      expect(await readFile(`${directory}/${file}`, "utf8")).not.toMatch(
        /@iconify\/|api\.iconify\.design/
      )
    }
  }
})

test("a standalone component consumer runs and typechecks with no Iconify installation", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "icones-native-consumer-")
  )
  try {
    for (const name of ["core", "names", "vanilla"]) {
      const target = path.join(directory, "node_modules/@icones", name)
      await mkdir(target, { recursive: true })
      await cp(
        source(`packages/${name}/package.json`),
        path.join(target, "package.json")
      )
      const entries = name === "names" ? ["types", "index.js"] : ["dist"]
      for (const entry of entries)
        await cp(
          source(`packages/${name}/${entry}`),
          path.join(target, entry),
          { recursive: true }
        )
    }
    expect(existsSync(path.join(directory, "node_modules/@iconify"))).toBe(
      false
    )
    const consumer = `
      import { createIconStore, createStaticIconLoader, type IconData, type IconProps } from "@icones/vanilla";
      const data: IconData = { body: "<path/>", width: 24, height: 24 };
      const props: IconProps = { name: "tabler:star", data };
      const store = createIconStore({
        api: createStaticIconLoader({ baseUrl: "/icons", fetch: async () => Response.json(data) })
      });
      if (!(await store.load(props.name!))) throw new Error("Expected native icon data");
      if (await createIconStore().load("demo:missing")) throw new Error("Expected no default service");
    `
    await writeFile(path.join(directory, "consumer.mts"), consumer)
    await writeFile(
      path.join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: "NodeNext",
          target: "ES2023",
          types: [],
          lib: ["ES2023", "DOM", "DOM.Iterable"],
        },
        files: ["consumer.mts"],
      })
    )
    execFileSync(
      "node",
      [source("node_modules/typescript/bin/tsc"), "-p", directory],
      { cwd: directory, stdio: "pipe" }
    )
    execFileSync("node", ["consumer.mts"], { cwd: directory, stdio: "pipe" })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("gallery query and manifest tools remain browser-safe without the Vite plugin", async () => {
  await checkGraph(
    [
      "app/src/features/catalog/query.ts",
      "app/src/features/catalog/client.ts",
      "packages/core/src/resources/manifest.ts",
    ],
    "browser",
    /^(node:|@iconify\/|saxes$|xmlchars(?:\/|$)|@icones\/(?:server|vite)(?:\/|$))/,
    /\/core\/src\/(?:index\.|runtime\/)/
  )
})

test("Vite's server subpath does not initialize component state, plugin hooks or XML parsing", async () => {
  await checkGraph(
    ["packages/vite/src/server/index.ts"],
    "node",
    /^(saxes|xmlchars|parse5|vite|@iconify|@icones\/vite)(\/|$)/,
    /\/core\/src\/(?:index\.|runtime\/)/
  )
})

test("MCP owns its read-only file catalog without Vite or the former Server package", async () => {
  await checkGraph(
    ["packages/mcp-server/src/catalog.ts"],
    "node",
    /^(saxes|xmlchars|parse5|vite|@iconify|@icones\/(?:vite|server))(\/|$)/,
    /\/core\/src\/(?:index\.|runtime\/)/
  )
})

test("tooling exports do not initialize Vite hooks or import private scripts", async () => {
  await checkGraph(
    ["packages/vite/src/tooling/index.ts"],
    "node",
    /^(vite|parse5)(\/|$)/,
    /(?:\/scripts\/icon-builder\/|\/vite\/src\/(?:index|collect|collect-html)\.)/
  )
  await checkGraph(
    ["packages/vite/src/tooling/symbol.ts"],
    "node",
    /^(saxes|xmlchars)(\/|$)/
  )
})

test("public utility, server and tooling entries load built JavaScript and declarations", async () => {
  const entries = (
    await Promise.all(
      ["core", "vite"].map(async (name) => {
        const pkg = await manifest(name)
        return Promise.all(
          Object.entries(pkg.exports)
            .filter(
              ([key]) =>
                name !== "vite" ||
                key === "./server" ||
                key.startsWith("./tooling")
            )
            .map(async ([key, value]) => {
              const entry = value as { types: string }
              await readFile(source(`packages/${name}/${entry.types}`))
              return pkg.name + (key === "." ? "" : key.slice(1))
            })
        )
      })
    )
  ).flat()
  execFileSync(
    "node",
    [
      "--input-type=module",
      "-e",
      `
    import assert from "node:assert/strict";
    for (const entry of ${JSON.stringify(entries)}) {
      assert.match(import.meta.resolve(entry), /\\/dist\\/.*\\.m?js$/);
      await import(entry);
    }
    const { createIconManifest, addManifestEntry, manifestEntries } = await import("@icones/core/manifest");
    const { svgToElementData, createIconSymbolDocument, createCollectionManifest } = await import("@icones/vite/tooling");
    const manifest = createIconManifest("flag");
    assert.equal(manifest.aliases, undefined);
    assert.deepEqual(createCollectionManifest("flag").aliases, {"circle-flags": {suffix: "-circle"}});
    addManifestEntry(manifest, { prefix: "flag", slug: "star", category: "shapes", variant: "outline" });
    assert.equal(manifestEntries(manifest)[0].slug, "star");
    const data = svgToElementData('<svg viewBox="0 0 24 24"><path d="M2 12h20"/></svg>');
    assert.match(createIconSymbolDocument(data), /<symbol id="icon"/);
  `,
    ],
    { cwd: root, stdio: "pipe" }
  )
})
