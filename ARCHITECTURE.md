# Architecture

Technical companion to the [README](README.md). This explains **where the content
lives**, how it is fetched, and how it is built.

> **Status (2026-10-14).** The build, routing, and GitHub Pages deploy work, and
> the shell is live. The data pipeline is **in progress**:
> `scripts/refresh-projects.ts` fetches the profile, the repository list, and
> each README into `src/generated/`, stores the resources those READMEs
> reference (`scripts/readme-assets.ts`), and `scripts/render-markdown.mjs`
> precompiles them to sanitized HTML. Groups are not read yet, so every project
> sits in one temporary "ungrouped" group.

## Principles

- **Static and client-only.** No server, no runtime API keys, no auth; the
  browser loads only prebuilt files.
- **Fetched from GitHub at build time.** The browser never calls the GitHub API.
- **Content lives in two places only.** A project's own README, and the profile
  repository. Nothing is written twice.
- **Mock data in development, real data in CI.** The app uses mocks for local
  work; real data is gathered during the CI build and is never committed.

## Where content lives

There are exactly two handwritten places.

| Content | Lives in | Written as |
| --- | --- | --- |
| A project's group, summary, tags, links | that project's own README | YAML frontmatter |
| Whether a project is featured | that project's own README | `featured: true` |
| The groups: title, order, icon, accent, description | the profile repository | one file per group, `groups/<id>.md` |
| The "about me" intro | the profile repository | the `## About me` section of its README |

Everything else — names, descriptions, topics, languages, stars, dates, avatars —
comes straight from the GitHub API. In particular, **there is no central list of
projects**: a repository appears on the site because it has a README, and it is
placed by the `group` field that README declares.

### 1. Project README frontmatter

The only file a project owner edits to place a project.

```yaml
---
title: Example Project     # display-name override; defaults to the repo name
group: tools               # which group it appears in
summary: One-line pitch    # overrides the GitHub description
tags: [rust, wasm]         # card tags (falls back to GitHub topics)
demo: https://example.com/demo
try: https://example.com/play
download: https://example.com/releases
featured: true             # show it on the home page
order: 10                  # manual ordering within a group
hidden: false              # exclude it entirely
---
```

Every field is optional; anything missing falls back to GitHub data.

### 2. Groups (`groups/<id>.md` in the profile repository)

The profile repository (`<username>/<username>`) defines the groups, one file per
group, named for its id:

```markdown
---
title: Music & Audio
order: 2
icon: music
accent: "#db2777"
---

Ear training, synths, and tools that make noise in the browser.
```

- The **filename is the group id**: `groups/music.md` is the group `music`, which
  is what a project's `group:` field refers to.
- The **frontmatter** carries presentation only — display title, sort order,
  icon, accent color. All optional.
- The **body** is the description rendered above the cards on the group page.
- Groups are **declared, not inferred**, so mistakes fail loudly: a project whose
  `group:` matches no file is reported at build time and shown under "ungrouped".
- A group with no projects is still rendered (handy as "coming soon").

### 3. About me (profile README)

The profile repository's README supplies the home page intro: the content under
`## About me`, up to the next `##` heading. Keeping it there means the same prose
doubles as the GitHub profile text.

## Data flow

```
refresh (network)  ->  render (offline)  ->  build
```

- **refresh** (in progress) — `scripts/refresh-projects.ts` reads the profile,
  the public repository list (paginated), and each repository's README. It writes
  `src/generated/profile.json`, `projects.json`, `groups.json`, and
  `assets.json`, and downloads the avatar and every README image into
  `public/generated/`. Groups currently come from a single placeholder
  "ungrouped" entry.
- **render** — `scripts/render-markdown.mjs` turns the stored markdown into
  sanitized HTML, plus a heading list for the table of contents, and writes
  `rendered.json`. On the way it applies the rewrites recorded in `assets.json`,
  so the HTML points at the downloaded copies. It is offline and separate from
  refresh, so a styling or plugin tweak never re-hits the API; `npm run refresh`
  just runs it too.
- **build** — `vite build` bundles the site.

### Development vs CI

- **Development (`npm run dev`)** falls back to `src/data/mock.ts`. No network,
  no token. `npm run clean` removes the build output and both generated
  directories, so the next build starts fresh on the mocks.
- **Opt-in local fetch (`npm run refresh`)** fills `src/generated/` with real
  data and then renders the READMEs; the seam in `src/data/index.ts` prefers the
  generated data over the mocks when present. Reads `GH_TOKEN` from the
  environment or a gitignored `.env`/`.env.local` (see `.env.example`).
  `npm run render` re-renders on its own (offline) after a plugin tweak.
- **CI (the Actions build)** refreshes first (when a token secret is present), so
  the deployed site always reflects current GitHub state.

Generated output is **gitignored** and never committed: the JSON lands in
`src/generated/` (bundled) and downloaded images in `public/generated/` so they
are served as static files. The repository holds code and mocks only.

Why two directories: Vite only ships files under `src/` that are imported, but
rendered README HTML and the downloaded images are referenced by URL at runtime,
so their files must live where Vite copies them verbatim (`public/`). The JSON,
by contrast, is imported by the seam and is safe (and smaller) bundled.
`assets.json` is written to `src/generated/` but deliberately **not** globbed by
the seam: by the time the app runs, its rewrites are already baked into
`rendered.json`.

## Refresh script

Status: the profile, repository list, READMEs, and the resources they reference
are implemented. Real groups are still to come.

Authenticates with a fine-grained token (public repositories, read-only; stored
as a CI secret, never in the browser), then:

0. **[done]** resolve the account name (never hardcoded) and read the profile
   (`GET /users/<login>`), writing `profile.json` and downloading the avatar
1. **[done]** read the list of repositories (paginated, 100 per page)
2. **[done]** drop forks, archived repositories, and repositories without a
   README; also skip the `<login>/<login>` profile repository
3. **[done]** read each repository's README and strip the YAML frontmatter (the
   fields are not parsed yet, so every project lands in "ungrouped")
4. **[done]** store the resources each README references: download its images
   into `public/generated/<repo>/`, turn relative documentation links into
   GitHub blob URLs, and record the map in `assets.json`
5. read the group files from the profile repository
6. validate each `group` against the declared groups, warning on unknowns
7. **[partial]** write `projects.json`, `groups.json`, and `assets.json`; the
   groups file is a single placeholder "ungrouped" group for now

Account resolution order, first hit wins: `GITHUB_REPOSITORY_OWNER` (set by
Actions), then the owner in the `origin` remote URL, then `gh api user --jq .login`.

The script is TypeScript run directly by Node (no build step, no `tsx`): Node
strips the types, and it imports only *types* from `src/`, so no browser code is
ever loaded at runtime.

### Token

Authenticating only raises the rate limit — the data is public, so the token is
read-only.

- **Create:** a fine-grained PAT with **Public repositories (read-only)** access.
  That grants read-only access to all public repositories implicitly, so no
  per-permission selection is needed — Contents and Metadata read come with it.
- **CI:** store it as the repository secret `GH_TOKEN`
  (`gh secret set GH_TOKEN`). The deploy workflow reads it into a `GH_TOKEN`
  environment variable.
- **Local:** export `GH_TOKEN`, or put it in a gitignored `.env` / `.env.local`
  (copy `.env.example`).
- An expiry is fine: a lapsed token makes the refresh step fail loudly rather
  than silently shipping stale data. Only a *missing* secret falls back to
  mocks, and that prints a notice.
- The Pages deploy does not use this token at all — it uses the workflow's own
  `GITHUB_TOKEN` through OIDC.

**Assets are stored and served locally, never hotlinked.**
`scripts/readme-assets.ts` walks every reference a README makes — by parsing it,
so a URL inside a code fence or a code span is never touched — and:

- **downloads** each image into `public/generated/<repo>/<hash>.<ext>`, deduped
  by content hash, then serves it from `/generated/<repo>/...`
- **rewrites** relative documentation links to their GitHub blob URL
- **leaves everything else alone**: badges (shields.io and friends) and other
  third-party hosts stay live and keep updating, and absolute links and anchors
  already work

Only relative references and absolute URLs already on GitHub's own asset hosts
(`raw.githubusercontent.com`, `user-images.githubusercontent.com`,
`camo.githubusercontent.com`) are localized. Anything over 5 MB is left as a
remote URL rather than pulled into the build, and every decision — including
what was skipped and why — is recorded in `assets.json`. Hotlinking would burn
GitHub's per-visitor quota, and raw file URLs accept no auth, so visitors would
see broken images under load.

The map is keyed by the reference **exactly as written**, and
`scripts/render-markdown.mjs` applies it to the parsed HTML tree rather than to
the markdown text. That keeps the stored body byte-identical to GitHub's, so the
raw source stays traceable and rewrites never leak into prose.

**Refresh trigger.** Refresh is a step in the same workflow that deploys, so it
runs on every push to the default branch and on manual `workflow_dispatch` —
there are no scheduled runs. Optional later: `repository_dispatch`, where each
project repo pings this one on README changes for instant rebuilds, at the cost
of a token and a workflow file in every repo.

## README rendering

`scripts/render-markdown.mjs` precompiles each README to sanitized HTML at build
time. It is **offline**: it reads the markdown out of `projects.json` and writes
`rendered.json`, so a styling or plugin tweak never re-hits the API. The browser
ships an HTML string, never a markdown parser; the repo detail page injects it
into a `prose` wrapper, so styling lives in CSS and never needs a re-render.

```
remark-parse
remark-gfm                       tables, task lists, footnotes, autolinks
remark-github-blockquote-alert   > [!NOTE] callouts
remark-rehype                    { allowDangerousHtml: true }
rehype-raw                       parse the safe HTML subset READMEs use
rehype-localize-references       point images/links at the stored copies
rehype-sanitize                  GitHub schema (extended, see below)
rehype-slug                      heading ids
                                 (headings are collected here, for the TOC)
rehype-autolink-headings         each heading becomes its own anchor link
@shikijs/rehype                  Shiki highlighting, github-light
rehype-stringify
```

Headings are collected right after `rehype-slug` (so the ids exist) and before
`rehype-autolink-headings` (so the anchor copies do not duplicate the text); the
detail page builds a table of contents from the depth-2 and depth-3 headings.

References are localized **before** the sanitizer runs, so the sanitizer sees
(and allows) the final `src` and `href`; the map comes from `assets.json`, keyed
by each reference exactly as written in the stored markdown.

**HTML policy.** Real READMEs use `<p align="center">`, `<img>` badges,
`<details>`, `<sub>`, and `<kbd>`. Stripping HTML silently degrades them, so raw
HTML is parsed (`rehype-raw`) and then sanitized with GitHub's schema — the safe
subset, not "no HTML". Two deliberate extensions to that schema:

- `class` is allowed on the tags READMEs and our plugins use, so the alert
  callouts (`markdown-alert-*`) and the octicon `<svg>`/`<path>` survive.
- `<svg>`, `<path>`, `<mark>`, `<figure>`/`<figcaption>`, `<abbr>`, and
  `<hgroup>` are added to the allowed tag list.

Shiki runs **after** the sanitizer on purpose: the schema drops `class` and
`style`, while Shiki's highlighting is inline styles added afterwards.
Language-less fenced blocks are highlighted as `text` (`defaultLanguage`) so
every code block gets the same light treatment instead of falling back to the
dark `prose` `pre`.

**Style overrides.** `src/index.css` brings the typography plugin's `prose` in
line with GitHub — mostly removing what the plugin adds and restoring what it
drops:

- No backticks around inline `code` and no quote marks around `blockquote`
  paragraphs (the plugin draws both; GitHub doesn't).
- A visible background for code blocks: Shiki bakes an inline
  `background-color:#fff` onto its `<pre>`, which overrides the plugin's dark
  `--tw-prose-pre-bg` and leaves the block invisible on a white page, so the
  stylesheet forces `#f6f8fa` back on with `!important`.
- Inline `code` as GitHub's gray chip (background, radius, padding, normal
  weight).
- A stronger left border on `blockquote` — GitHub marks quotes with a border,
  not a background.

The same file styles the alert callouts and keeps heading anchors looking like
headings.

**Limits.** A README's non-image files (a video, an archive) stay links rather
than being copied into the build, and images hosted outside GitHub are left
hotlinked so third-party content keeps working. Anything GitHub-hosted that
could not be downloaded — over the size cap, or a failed request — is recorded
in `assets.json` with the reason and falls back to its absolute URL rather than
staying relative.

## Routing

| Route | Contents |
| --- | --- |
| `/` | Intro, the groups, featured projects |
| `/<group>` | A group's description and its project cards |
| `/repos/<repo>` | A rendered README, plus tags, links, and stars |

A single layout route renders the persistent sidebar around all pages.

## Hosting

Deployed to GitHub Pages from a user-site repository (`<user>.github.io`), served
at the domain root, so Vite uses `base: '/'` and there is no path prefix.

Pages has no rewrite rules, so a deep link such as `/repos/example` would 404 on
refresh. The build copies `index.html` to `404.html` (a small Vite plugin in
`vite.config.ts`); Pages serves it for unknown paths and the client-side router
takes over.

Deployment runs through GitHub Actions (`actions/upload-pages-artifact` +
`actions/deploy-pages`) in `.github/workflows/deploy.yml`. It runs on every push
to the default branch and on manual `workflow_dispatch` — no scheduled builds.
The repository's Pages source is set to *GitHub Actions* rather than a branch.

Two notes for future demos:

- Every Pages site under one account shares the origin, so a demo embedded from
  another repo path is a same-origin iframe: document, CSS, and JS globals are
  isolated, but it is not a security boundary (shared `localStorage`, can reach
  `window.top`).
- Pages cannot set custom response headers. WASM threads that need
  `SharedArrayBuffer` require COOP/COEP, injectable from a service worker (for
  example `coi-serviceworker`) at the demo's own entry point.

## Front-end stack

| Concern | Choice | Why |
| --- | --- | --- |
| Build | Vite + React + TypeScript | fast, simple static output, easy base path |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` | utility styling, and `prose` for rendered READMEs |
| Components | Radix primitives + hand-rolled UI | accessible primitives without a heavy design system |
| Icons | `lucide-react` | tree-shaken, only what is imported ships |
| Routing | React Router | a layout route keeps the sidebar mounted across pages |
| Markdown | unified (remark + rehype), at build time | tiny runtime, Shiki highlighting, free TOC |
