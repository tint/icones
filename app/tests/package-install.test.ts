import { expect, test } from "bun:test"
import { build } from "vite"
import { execFileSync } from "node:child_process"
import {
  packageInstall,
  packageInstallFilename,
  packageInstallNote,
  packageManagers,
  isPackageManager,
} from "../src/shared/integrations/package-install.ts"
import {
  getGuideArticle,
  guideFrameworks,
} from "../src/features/guide/content.ts"

test("installation commands target the consumer application in both dev and build", () => {
  for (const name of [
    "react",
    "vue",
    "svelte",
    "solidjs",
    "astro",
    "vanilla",
    "core",
    "vite",
  ]) {
    expect(packageInstall("@icones/" + name, true)).toBe(
      "bun add @icones/" + name
    )
    expect(packageInstall("@icones/" + name, false)).toBe(
      "bun add @icones/" + name
    )
  }
  expect(packageInstall("@icones/vite", false, true)).toBe(
    "bun add -d @icones/vite"
  )
  expect(packageInstall("@icones/vite", true, true)).toBe(
    "bun add -d @icones/vite"
  )
  expect(packageInstallFilename(false)).toBe("Terminal")
  expect(packageInstallNote(false)).not.toContain("workspace")
  expect(packageInstallNote(true)).toBe(packageInstallNote(false))
  expect(packageInstallNote(true)).toContain("your application directory")
})

test("all package managers use their own registry install and dev-dependency syntax", () => {
  const expected = {
    npm: ["npm install @icones/react", "npm install -D @icones/vite"],
    pnpm: ["pnpm add @icones/react", "pnpm add -D @icones/vite"],
    yarn: ["yarn add @icones/react", "yarn add -D @icones/vite"],
    bun: ["bun add @icones/react", "bun add -d @icones/vite"],
    deno: ["deno add npm:@icones/react", "deno add -D npm:@icones/vite"],
  }
  expect<readonly string[]>(packageManagers).toEqual(Object.keys(expected))
  for (const removed of ["vlt", "vp", "nub", "ni"]) {
    expect(isPackageManager(removed)).toBe(false)
  }
  for (const manager of packageManagers) {
    expect(packageInstall("@icones/react", false, false, manager)).toBe(
      expected[manager][0]
    )
    expect(packageInstall("@icones/vite", false, true, manager)).toBe(
      expected[manager][1]
    )
    for (const development of [true, false]) {
      expect(packageInstall("@icones/react", development, false, manager)).toBe(
        expected[manager][0]
      )
      expect(packageInstallFilename(development, manager)).toBe("Terminal")
      expect(packageInstallNote(development, manager)).toBe(
        packageInstallNote()
      )
    }
  }
})

test("Guide getting-started installation remains identical across environments", () => {
  for (const framework of guideFrameworks) {
    for (const element of framework.id === "vanilla"
      ? (["standard", "web"] as const)
      : (["web"] as const)) {
      const section = (development: boolean) => {
        const article = getGuideArticle(
          "getting-started",
          framework.id,
          development,
          element
        )
        return article.sections[0]!.examples![0]!
      }
      const dev = section(true)
      const production = section(false)
      expect(dev.code).toBe(production.code)
      expect(dev.code).not.toContain("@workspace:*")
      expect(production.code).toBe(
        "bun add @icones/" + framework.id + "\nbun add -d @icones/vite"
      )
      expect(production.install?.dependencies).toEqual([
        { name: "@icones/" + framework.id },
        { name: "@icones/vite", dev: true },
      ])
      expect(production.filename).toBe("Terminal")
    }
  }
})

test("Vite production builds default to registry package names", async () => {
  const previousEnvironment = process.env.NODE_ENV
  process.env.NODE_ENV = "production"
  let result: Awaited<ReturnType<typeof build>>
  try {
    result = await build({
      configFile: false,
      root: new URL("../../", import.meta.url).pathname,
      logLevel: "silent",
      build: {
        ssr: new URL(
          "../src/shared/integrations/package-install.ts",
          import.meta.url
        ).pathname,
        write: false,
        minify: false,
      },
    })
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousEnvironment
  }
  if (Array.isArray(result) || !("output" in result))
    throw new Error("Expected one build output")
  const output = result.output.find((item) => item.type === "chunk")
  if (!output || output.type !== "chunk")
    throw new Error("Expected an entry chunk")
  const moduleUrl = "data:text/javascript," + encodeURIComponent(output.code)
  const resultText = execFileSync(
    "node",
    [
      "--input-type=module",
      "-e",
      "const compiled = await import(" +
        JSON.stringify(moduleUrl) +
        ");" +
        'process.stdout.write(JSON.stringify({development:compiled.isDevelopmentBuild,command:compiled.packageInstall("@icones/vue"),note:compiled.packageInstallNote()}));',
    ],
    { encoding: "utf8" }
  )
  const compiled = JSON.parse(resultText)
  expect(compiled.development).toBe(false)
  expect(compiled.command).toBe("bun add @icones/vue")
  expect(compiled.note).not.toContain("workspace")
})
