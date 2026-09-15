import { expect, test } from "bun:test"
import { createReleaseManifest } from "../src/build.ts"

test("release manifests contain only final outputs and registry dependency ranges", () => {
  const manifest = createReleaseManifest(
    {
      name: "@icones/example",
      version: "0.0.0",
      license: "MIT",
      private: false,
      files: ["src", "dist"],
      sideEffects: ["./src/register.ts", "./dist/register.js"],
      scripts: { build: "tsdown" },
      exports: {
        ".": {
          development: "./src/index.ts",
          bun: "./src/index.ts",
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      },
      dependencies: { "@icones/core": "workspace:*", external: "^1.0.0" },
      devDependencies: { typescript: "latest" },
    },
    "1.2.3",
    new Map([["@icones/core", "2.3.4"]])
  )

  expect(manifest).not.toHaveProperty("private")
  expect(manifest).not.toHaveProperty("files")
  expect(manifest).not.toHaveProperty("scripts")
  expect(manifest).not.toHaveProperty("devDependencies")
  expect(manifest.exports).toEqual({
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
    },
  })
  expect(manifest.dependencies).toEqual({
    "@icones/core": "2.3.4",
    external: "^1.0.0",
  })
  expect(manifest.publishConfig).toEqual({ access: "public" })
  expect(manifest.license).toBe("MIT")
  expect(manifest.sideEffects).toEqual(["./dist/register.js"])
  expect(JSON.stringify(manifest)).not.toContain("workspace:")
})
