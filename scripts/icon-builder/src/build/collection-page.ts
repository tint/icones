import type { IconManifest } from "@icones/core/manifest"
import { collectionDomain, deployment } from "./deployment.ts"

const escapeHtml = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!
  )
const label = (value: string) =>
  value.replace(
    /(^|-)([a-z])/g,
    (_, separator, letter) => (separator ? " " : "") + letter.toUpperCase()
  )

function sourceLink(id: string, address: string) {
  // Source metadata is not trusted HTML, nor permission to create executable links.
  try {
    const url = new URL(address)
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return `<a href="${escapeHtml(url.href)}" rel="noreferrer">${escapeHtml(id)}</a>`
  } catch {
    /* Keep the source name even when no safe URL is available. */
  }
  return escapeHtml(id)
}

/** A self-contained landing page: no JavaScript, external fonts, or runtime requests. */
export function createCollectionPage(
  manifest: IconManifest,
  icons: number,
  sample: string
) {
  const { prefix } = manifest
  const name = label(prefix)
  const origin = `https://${collectionDomain(prefix)}`
  const dataPath = `./data/${encodeURIComponent(sample)}.json`
  const symbolPath = `./symbols/${encodeURIComponent(sample)}.svg`
  const variants = Object.entries(manifest.variants)
    .map(([variant, categories]) => {
      const count = Object.values(categories).reduce(
        (sum, files) => sum + files.json.length,
        0
      )
      const alias =
        manifest.variantAliases?.[variant as "outline" | "solid"] ?? variant
      return `<li><strong>${escapeHtml(label(alias))}</strong><span><code>${escapeHtml(variant)}</code> · ${count.toLocaleString("en-US")} icons</span></li>`
    })
    .join("\n")
  const sources = Object.entries(manifest.sources ?? {})
    .map(([id, source]) => {
      const revision = source.revision ?? source.snapshot
      return `<li>${sourceLink(id, source.url)}${revision ? `<p class="meta">Revision / snapshot: <code>${escapeHtml(String(revision))}</code></p>` : ""}${source.distributionNotice ? `<p>${escapeHtml(source.distributionNotice)}</p>` : ""}</li>`
    })
    .join("\n")
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(name)} collection: ${icons} icons, static JSON data, SVG symbols, and original licenses.">
  <title>${escapeHtml(name)} · Icones collections</title>
  <style>
    :root { color-scheme: light dark; --bg: #f8fafc; --card: #fff; --ink: #0f172a; --muted: #526277; --line: #dbe3ee; --accent: #0369a1; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.65 system-ui, sans-serif; }
    main { max-width: 960px; margin: auto; padding: 40px 24px; }
    a { color: var(--accent); text-underline-offset: .2em; }
    a:focus-visible { outline: 2px solid var(--accent); outline-offset: 5px; }
    header { padding: 32px 0; }
    h1 { font-size: clamp(2.5rem, 8vw, 4.5rem); line-height: 1.1; letter-spacing: -.05em; margin: 16px 0; }
    h2 { font-size: 1.2rem; margin: 0 0 16px; }
    p { margin: 12px 0; }
    code { font-size: .9em; overflow-wrap: anywhere; }
    .eyebrow { color: var(--accent); font-size: .8rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .meta, .intro { color: var(--muted); }
    .meta { font-size: .875rem; }
    .intro { max-width: 680px; font-size: 1.1rem; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 24px; }
    .button { padding: 10px 18px; border-radius: 9px; background: var(--accent); color: var(--card); text-decoration: none; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    section { min-width: 0; padding: 24px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }
    .wide { grid-column: 1 / -1; }
    ul { padding-left: 20px; margin: 0; }
    li + li { margin-top: 12px; }
    .variants { list-style: none; padding: 0; }
    .variants li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
    .variants span { color: var(--muted); font-size: .875rem; }
    .endpoint { display: block; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; margin: 10px 0; overflow-wrap: anywhere; }
    pre { padding: 16px; border-radius: 8px; background: var(--bg); white-space: pre-wrap; overflow-wrap: anywhere; }
    footer { padding: 24px 0 8px; color: var(--muted); font-size: .875rem; }
    @media (max-width: 620px) { main { padding: 20px 16px; } .grid { grid-template-columns: 1fr; } section { padding: 20px; } }
    @media (prefers-color-scheme: dark) { :root { --bg: #0b1220; --card: #111c2e; --ink: #e2e8f0; --muted: #a6b5ca; --line: #293b54; --accent: #7dd3fc; } }
  </style>
</head>
<body>
<main>
  <header>
    <div class="eyebrow">Icones / Static collection</div>
    <h1>${escapeHtml(name)}</h1>
    <p class="intro">${icons.toLocaleString("en-US")} icons, served as individual JSON files and SVG symbols. Original artwork and license notices are preserved.</p>
    <p class="meta"><code>${escapeHtml(origin)}</code></p>
    <nav class="actions" aria-label="Collection links">
      <a class="button" href="https://${escapeHtml(deployment.domain)}/icons?set=${encodeURIComponent(prefix)}">Browse collection</a>
      <a href="./manifest.json">Manifest</a>
      <a href="./license.txt">License</a>
    </nav>
  </header>
  <div class="grid">
    <section aria-labelledby="variants-title">
      <h2 id="variants-title">${prefix === "flag" ? "Shapes &amp; aspect ratios" : "Styles"}</h2>
      <ul class="variants">${variants}</ul>
      <p class="meta">Display names retain upstream aliases. IDs match the collection manifest.</p>
    </section>
    <section aria-labelledby="files-title">
      <h2 id="files-title">Try an icon</h2>
      <p class="meta">Example: <code>${escapeHtml(prefix)}:${escapeHtml(sample)}</code></p>
      <a class="endpoint" href="${escapeHtml(dataPath)}"><code>data/${escapeHtml(sample)}.json</code></a>
      <a class="endpoint" href="${escapeHtml(symbolPath)}"><code>symbols/${escapeHtml(sample)}.svg</code></a>
      <p class="meta">Each SVG file contains a symbol with the ID <code>icon</code>.</p>
    </section>
    <section class="wide" aria-labelledby="usage-title">
      <h2 id="usage-title">Using the data</h2>
      <pre><code>${escapeHtml(`const response = await fetch("${origin}/data/${encodeURIComponent(sample)}.json")\nif (!response.ok) throw new Error("Icon data is unavailable")\nconst elements = await response.json()`)}</code></pre>
      <p>JSON files contain element tuples, not an Iconify API response. Fetch the JSON and render inline SVG when using icons across domains.</p>
      <p class="meta">An SVG symbol can be referenced with <code>#icon</code> on the same origin. CORS headers do not remove browsers’ cross-origin restrictions on external SVG <code>&lt;use&gt;</code>.</p>
    </section>
    <section class="wide" aria-labelledby="sources-title">
      <h2 id="sources-title">Sources &amp; licenses</h2>
      ${sources ? `<ul>${sources}</ul>` : "<p>See the collection manifest for available provenance.</p>"}
      <p>Read the <a href="./license.txt">original license</a> before using or redistributing artwork. Brand names and logos may also be subject to trademark rights.</p>
    </section>
  </div>
  <footer>A static resource collection from <a href="https://${escapeHtml(deployment.domain)}">Icones</a>. No scripts are required to read this page.</footer>
</main>
</body>
</html>
`
}
