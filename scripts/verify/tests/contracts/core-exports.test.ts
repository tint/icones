import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

test("every Core export loads in plain Node from dist alone", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "icones-core-package-"))
  try {
    const source = new URL("../../../../packages/core/", import.meta.url)
    const target = path.join(root, "node_modules/@icones/core")
    await mkdir(target, { recursive: true })
    const pkg = JSON.parse(
      await readFile(new URL("package.json", source), "utf8")
    )
    await writeFile(path.join(target, "package.json"), JSON.stringify(pkg))
    await cp(new URL("dist", source), path.join(target, "dist"), {
      recursive: true,
    })
    for (const entry of Object.values(pkg.exports) as {
      types: string
      import: string
      default: string
    }[]) {
      expect(entry.import).toMatch(/^\.\/dist\/.*\.js$/)
      expect(entry.default).toBe(entry.import)
      expect(entry.types).toMatch(/^\.\/dist\/.*\.d\.ts$/)
      await readFile(path.join(target, entry.types))
    }
    const names = Object.keys(pkg.exports).map((key) =>
      key === "." ? pkg.name : pkg.name + key.slice(1)
    )
    execFileSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `
      import assert from "node:assert/strict";
      for (const name of ${JSON.stringify(names)}) await import(name);
      const { parseViewBox, toAsciiSlug, isElementData } = await import("@icones/core");
      assert.deepEqual(parseViewBox("0 0 24 24"), [0, 0, 24, 24]);
      assert.equal(toAsciiSlug("Hello World"), "hello-world");
      assert.equal(isElementData([["path", { d: "M0 0" }]]), true);
    `,
      ],
      { cwd: root, stdio: "pipe" }
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
