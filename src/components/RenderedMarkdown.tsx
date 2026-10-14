import type { RenderedReadme } from '../data'

/**
 * Renders a README that scripts/render-markdown.mjs precompiled to HTML.
 *
 * The HTML is sanitized at build time (rehype-sanitize), so injecting the string
 * here is safe and the browser never ships a markdown parser. Styling comes from
 * the typography plugin (`prose`) plus the markdown rules in index.css, so a
 * look-and-feel tweak is CSS-only and needs no re-render or re-fetch.
 */
export function RenderedMarkdown({ content }: { content: RenderedReadme }) {
  // h1 is usually the README title (already the page heading), so link only into sections.
  const toc = content.headings.filter((heading) => heading.depth === 2 || heading.depth === 3)

  return (
    <div className="space-y-6">
      {toc.length >= 3 && (
        <nav
          aria-label="On this page"
          className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            On this page
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {toc.map((heading) => (
              <li
                key={heading.id || heading.text}
                className={heading.depth === 3 ? 'pl-4' : undefined}
              >
                <a
                  href={`#${heading.id}`}
                  className="text-neutral-600 transition-colors hover:text-neutral-900"
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <article
        className="prose prose-neutral max-w-none"
        dangerouslySetInnerHTML={{ __html: content.html }}
      />
    </div>
  )
}
