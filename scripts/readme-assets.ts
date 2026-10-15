/**
 * readme-assets.ts - store and serve the resources a README references.
 *
 * Called by refresh-projects.ts once per README (plan sections 7 and 8). Two
 * jobs:
 *
 *   1. Images are DOWNLOADED, never hotlinked. raw.githubusercontent.com and
 *      user-images.githubusercontent.com are rate limited per VISITOR ip (60/h
 *      unauthenticated), so a README's own screenshots would start breaking
 *      under load. A local copy costs nothing at runtime. Files are named after
 *      their content hash, so the same bytes referenced twice are stored once.
 *   2. Relative links to repository files (ARCHITECTURE.md, doc/notes.md) are
 *      rewritten to the GitHub blob URL, so they stop 404ing on the site.
 *
 * Scope: relative references and absolute URLs already on GitHub's own asset
 * hosts. Everything else stays exactly as written -- badges (shields.io and
 * friends) are dynamic and are not ours to freeze into a snapshot.
 *
 * Deliberately NOT downloaded: files over MAX_ASSET_BYTES (they fall back to
 * the remote URL) and non-image media (a video stays a link). Every decision is
 * reported back so the caller can write src/generated/assets.json and the run
 * stays auditable.
 *
 * The returned map is keyed by the URL EXACTLY as written in the markdown, and
 * render-markdown.mjs applies it to the parsed tree. Rewriting the HTML rather
 * than the markdown keeps the stored body byte-identical to GitHub's: the raw
 * source stays traceable, and a URL inside a code fence is never touched.
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

/** Sent with every outbound request, by both scripts. */
export const USER_AGENT = 'godlikeswan-portfolio-refresh'

/** Content types we can name a file after; anything else falls back to the path. */
export const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
  'ico',
])

/**
 * Hosts whose files we localize. `camo` is GitHub's own image proxy, so a
 * README that embeds an external screenshot through it is already GitHub-hosted.
 */
const GITHUB_ASSET_HOSTS = new Set([
  'raw.githubusercontent.com',
  'user-images.githubusercontent.com',
  'camo.githubusercontent.com',
])

/** Above this we keep the remote URL instead of pulling it into the build. */
const MAX_ASSET_BYTES = 5 * 1024 * 1024

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

export interface AssetSkip {
  /** the reference as written in the README */
  url: string
  reason: string
}

export interface RepoAssets {
  /** URL as written -> the URL it is served from instead */
  rewrites: Record<string, string>
  /** references left remote or broken, with why */
  skipped: AssetSkip[]
}

export interface AssetOptions {
  /** base relative paths resolve against: .../<repo>/<branch>/<readme dir> */
  rawBase: string
  /** the same base in GitHub's blob view, for rewritten doc links */
  blobBase: string
  /** absolute directory the downloads are written to */
  outDir: string
  /** root-relative URL prefix those files are served from, e.g. /generated/<repo> */
  urlPrefix: string
  log: (message: string) => void
}

/** The subset of mdast/hast we walk. */
interface MarkdownNode {
  type: string
  url?: unknown
  value?: unknown
  children?: MarkdownNode[]
}

type Reference =
  | { kind: 'ignore' }
  | { kind: 'file'; target: string }
  | { kind: 'image'; source: URL; fallback: string }

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

/** The lowercase extension of a path, without the dot ('' when there is none). */
function extensionOf(pathname: string): string {
  const name = pathname.slice(pathname.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/**
 * Every link and image target in the document, exactly as written. Parsing
 * (rather than matching on the text) is what keeps references inside code
 * fences and inline code out of the list.
 */
function collectReferences(markdown: string): string[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as unknown as MarkdownNode
  const found = new Set<string>()

  const visit = (node: MarkdownNode): void => {
    if (Array.isArray(node.children)) node.children.forEach(visit)

    // image/link carry their target; definition is a reference-style target.
    if (
      (node.type === 'image' || node.type === 'link' || node.type === 'definition') &&
      typeof node.url === 'string' &&
      node.url !== ''
    ) {
      found.add(node.url)
    }

    // Raw HTML in a README: <img src="...">, <a href="...">.
    if (node.type === 'html' && typeof node.value === 'string') {
      const attributes = /(?<![\w-])(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
      for (const match of node.value.matchAll(attributes)) {
        const value = match[1] ?? match[2]
        if (value) found.add(value)
      }
    }
  }

  visit(tree)
  return [...found]
}

/** Decide what, if anything, to do with one reference. */
function classify(raw: string, options: AssetOptions): Reference {
  if (raw === '' || raw.startsWith('#')) return { kind: 'ignore' }

  // Absolute or protocol-relative: already points somewhere.
  if (HAS_SCHEME.test(raw) || raw.startsWith('//')) {
    let url: URL
    try {
      url = new URL(raw.startsWith('//') ? `https:${raw}` : raw)
    } catch {
      return { kind: 'ignore' }
    }
    // mailto:, data:, tel: and friends are not ours to touch.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'ignore' }
    // A third-party host (a badge, a CDN) is not ours to localize either.
    if (!GITHUB_ASSET_HOSTS.has(url.hostname)) return { kind: 'ignore' }
    return { kind: 'image', source: url, fallback: url.href }
  }

  // Root-relative resolves against github.com, not against this site.
  if (raw.startsWith('/')) {
    return { kind: 'file', target: new URL(raw, 'https://github.com').href }
  }

  // Relative: resolve it against the README's own directory, like GitHub does.
  let source: URL
  try {
    source = new URL(raw, options.rawBase)
  } catch {
    return { kind: 'ignore' }
  }

  if (IMAGE_EXTENSIONS.has(extensionOf(source.pathname))) {
    return { kind: 'image', source, fallback: source.href }
  }

  // Any other relative path is a repository file: send readers to the blob view.
  const relative = source.href.slice(options.rawBase.length)
  return { kind: 'file', target: new URL(relative, options.blobBase).href }
}

/** Fetch one asset, write it under its content hash, and return its file name. */
async function downloadAsset(
  source: URL,
  options: AssetOptions,
  written: Set<string>,
): Promise<string> {
  // No Authorization header: this host is not api.github.com.
  const response = await fetch(source, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`GET ${source.href} -> ${response.status} ${response.statusText}`)
  }

  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_ASSET_BYTES) {
    throw new Error(`${formatBytes(declared)} is over the ${formatBytes(MAX_ASSET_BYTES)} cap`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > MAX_ASSET_BYTES) {
    throw new Error(`${formatBytes(bytes.length)} is over the ${formatBytes(MAX_ASSET_BYTES)} cap`)
  }

  const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 8)
  const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
  const extension = (EXT_BY_CONTENT_TYPE[contentType] ?? extensionOf(source.pathname)) || 'png'
  const name = `${hash}.${extension}`

  if (!written.has(name)) {
    await mkdir(options.outDir, { recursive: true })
    await writeFile(resolve(options.outDir, name), bytes)
    written.add(name)
  }

  return name
}

/**
 * Localize every resource one README references, downloading what can be
 * downloaded and reporting what cannot. Files land in `outDir`; the returned
 * map is what render-markdown.mjs applies to the HTML.
 */
export async function localizeReadmeAssets(
  markdown: string,
  options: AssetOptions,
): Promise<RepoAssets> {
  const rewrites: Record<string, string> = {}
  const skipped: AssetSkip[] = []
  /** File names already written this run, so shared bytes are stored once. */
  const written = new Set<string>()

  for (const raw of collectReferences(markdown)) {
    const reference = classify(raw, options)
    if (reference.kind === 'ignore') continue

    if (reference.kind === 'file') {
      rewrites[raw] = reference.target
      options.log(`link  ${raw} -> ${reference.target}`)
      continue
    }

    try {
      const name = await downloadAsset(reference.source, options, written)
      const local = `${options.urlPrefix}/${name}`
      rewrites[raw] = local
      options.log(`image ${raw} -> ${local}`)
    } catch (error) {
      // Still worth pointing at an absolute URL: a relative one would resolve
      // against this site and 404 differently.
      const reason = error instanceof Error ? error.message : String(error)
      skipped.push({ url: raw, reason })
      if (reference.fallback !== raw) rewrites[raw] = reference.fallback
      options.log(`leave ${raw} (${reason})`)
    }
  }

  return { rewrites, skipped }
}
