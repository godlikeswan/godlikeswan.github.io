#!/usr/bin/env node
/**
 * render-markdown.mjs - offline: README markdown -> sanitized HTML.
 *
 * Deliberately separate from refresh-projects.ts and touched only by LOCAL
 * data: it opens src/generated/projects.json, renders each stored markdown body
 * through the unified pipeline, and writes src/generated/rendered.json. No
 * network, no token. That split means a styling or plugin tweak never needs to
 * re-hit the GitHub API -- just `npm run render` again.
 *
 * Pipeline (plan section 7):
 *   remark-parse -> remark-gfm -> remark-github-blockquote-alert
 *   -> remark-rehype { allowDangerousHtml } -> rehype-raw
 *   -> rehype-sanitize (extended GitHub schema) -> rehype-slug
 *   -> collect headings -> rehype-autolink-headings -> @shikijs/rehype
 *   -> rehype-stringify
 *
 * Notes:
 *   - HTML is ALLOWED and sanitized, not stripped: real READMEs use
 *     <p align="center">, <img>, <details>, <sub>, <kbd>. rehype-raw parses it,
 *     then the schema keeps only the safe subset.
 *   - Shiki runs AFTER the sanitizer on purpose: the schema drops `class` and
 *     `style`, and Shiki's highlighting is inline styles added afterwards.
 *   - The output is an HTML string plus the heading list (for the TOC), so the
 *     browser ships no markdown parser.
 *
 * If src/generated/projects.json is missing (no `npm run refresh` yet, or after
 * `npm run clean`) this is a no-op: the app falls back to mock/plain text.
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkAlert from 'remark-github-blockquote-alert'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'

const ROOT = resolve(import.meta.dirname, '..')
const INPUT = resolve(ROOT, 'src/generated/projects.json')
const OUTPUT = resolve(ROOT, 'src/generated/rendered.json')

/** Light UI, so a single light theme -- no dark variant switching. */
const SHIKI_THEME = 'github-light'

/**
 * Language-less fenced blocks (``` with no info string) would otherwise skip
 * Shiki and fall back to the typography plugin's dark `pre`, clashing with the
 * highlighted blocks. `text` gives them the same light treatment.
 */
const SHIKI_DEFAULT_LANGUAGE = 'text'

function log(message) {
  console.log(`[render] ${message}`)
}

/**
 * GitHub's schema (hast-util-sanitize default) with the pieces real READMEs and
 * our plugins need added back:
 *   - `class` on the elements our plugins generate (alerts, octicons) and on
 *     the tags README authors commonly style
 *   - the alert callout markup: <svg class="octicon"><path d="..."> and the
 *     markdown-alert-* classes on <div>/<p>
 *   - <mark>, <figure>/<figcaption>, <abbr>, <hgroup> as harmless additions
 */
const CLASS_TAGS = [
  'div',
  'p',
  'span',
  'section',
  'a',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'img',
  'svg',
  'path',
  'kbd',
  'details',
  'summary',
  'blockquote',
  'mark',
  'figure',
  'figcaption',
  'hgroup',
]

const attributes = { ...defaultSchema.attributes }
for (const tag of CLASS_TAGS) {
  attributes[tag] = [...(attributes[tag] ?? []), 'className']
}
// The alert icon: <svg class="octicon" viewBox=...><path d=...>
attributes.svg = [...(attributes.svg ?? []), 'viewBox', 'ariaHidden', 'fill', 'xmlns']
attributes.path = [...(attributes.path ?? []), 'd', 'fill', 'fillRule', 'clipRule']

const schema = {
  ...defaultSchema,
  tagNames: [
    ...new Set([
      ...(defaultSchema.tagNames ?? []),
      'svg',
      'path',
      'mark',
      'figure',
      'figcaption',
      'abbr',
      'hgroup',
    ]),
  ],
  attributes,
}

/** The heading text of a node, flattened (used for the TOC). */
function textOf(node) {
  if (node.type === 'text') return node.value
  if (Array.isArray(node.children)) return node.children.map(textOf).join('')
  return ''
}

/** Collect h1-h6 (after rehype-slug, so ids exist; before autolink, so no dupes). */
function rehypeCollectHeadings(headings) {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        headings.push({
          depth: Number(node.tagName.slice(1)),
          id: typeof node.properties?.id === 'string' ? node.properties.id : '',
          text: textOf(node),
        })
      }
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
    walk(tree)
  }
}

/** README markdown -> { html, headings }. */
async function renderMarkdown(markdown) {
  const headings = []
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkAlert)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema)
    .use(rehypeSlug)
    .use(rehypeCollectHeadings, headings)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeShiki, { theme: SHIKI_THEME, defaultLanguage: SHIKI_DEFAULT_LANGUAGE })
    .use(rehypeStringify)
    .process(markdown)

  return { html: String(file), headings }
}

async function main() {
  if (!existsSync(INPUT)) {
    log('no src/generated/projects.json -- nothing to render (run `npm run refresh`)')
    return
  }

  const projects = JSON.parse(await readFile(INPUT, 'utf8'))
  const rendered = {}
  let count = 0

  for (const project of projects) {
    if (typeof project.readme !== 'string' || project.readme.trim() === '') continue
    const result = await renderMarkdown(project.readme)
    rendered[project.repo] = result
    count += 1
    log(`${project.repo} (${result.headings.length} headings)`)
  }

  await writeFile(OUTPUT, `${JSON.stringify(rendered, null, 2)}\n`)
  log(`wrote ${count} rendered READMEs to src/generated/rendered.json`)
}

main().catch((error) => {
  console.error(`[render] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
