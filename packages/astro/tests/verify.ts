import { strict as assert } from "node:assert"
import { readFile } from "node:fs/promises"
const html = await readFile(
  new URL("../playground/dist/index.html", import.meta.url),
  "utf8"
)
if (process.env.ICONES_TEST_MODE === "symbol") {
  const references = [
    ...html.matchAll(
      /<use href="(\/icons\/[a-z0-9-]+\/symbols\/[^"#]+)#[^"]+"/g
    ),
  ]
  assert.equal(references.length, 2)
  for (const [, href] of references) {
    const svg = await readFile(
      new URL("../playground/dist" + href, import.meta.url),
      "utf8"
    )
    assert.match(svg, /<symbol/)
  }
}
assert.match(html, /data-icon="tabler:star"[^>]*data-state="loaded"/)
assert.match(html, /data-icon="remote"[^>]*data-state="loaded"/)
assert.match(html, /width="28"/)
assert.match(html, /<svg[^>]* width="24"[^>]*data-icon="tabler:star"/)
assert.match(html, /<svg[^>]* width="16"[^>]*data-icon="tabler:heart"/)
assert.match(html, /<svg[^>]* width="28"[^>]*data-icon="remote"/)
assert.match(html, /未找到图标/)
const perSetPrimary = html.match(
  /<svg[^>]*id="per-set-primary"[^>]*>[\s\S]*?<\/svg>/
)?.[0]
assert.ok(perSetPrimary)
assert.match(perSetPrimary, /width="48"/)
assert.match(perSetPrimary, /stroke-width="1"/)
assert.match(perSetPrimary, /href="\/runtime-icons\/runtime\/shape.svg#icon"/)
const perSetAlternative = html.match(
  /<svg[^>]*id="per-set-alternative"[^>]*>[\s\S]*?<\/svg>/
)?.[0]
assert.ok(perSetAlternative)
assert.match(perSetAlternative, /width="24"/)
assert.match(perSetAlternative, /stroke-width="3"/)
assert.match(perSetAlternative, /data-state="loaded"/)
assert.match(perSetAlternative, /<path/)
const inlineAlternative = html.match(
  /<svg[^>]*id="inline-alternative"[^>]*>[\s\S]*?<\/svg>/
)?.[0]
assert.ok(inlineAlternative, "Astro renders the inline alternative during SSR")
assert.match(inlineAlternative, /<path/)
assert.doesNotMatch(
  inlineAlternative,
  /<circle|\s(?:altData|altName|showAlt|data)=/i
)
const ids = [...html.matchAll(/id="(icon-[^"]+-paint)"/g)].map(
  (match) => match[1]
)
assert.equal(ids.length, 2)
assert.equal(new Set(ids).size, 2)
for (const id of ids) assert.ok(html.includes("url(#" + id + ")"))
assert.ok(
  !html.includes("<script"),
  "Astro icons must not ship a client runtime"
)
console.log(
  "Astro SSR verified: static extraction, async data, scopes, fallback and unique SVG ids."
)
