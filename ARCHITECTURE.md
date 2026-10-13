# Architecture

Technical companion to the [README](README.md). This explains **where the content
lives**, how it is fetched, and how it is built.

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

- **refresh** — `scripts/refresh-projects.mjs` reads the profile, repositories,
  groups, and READMEs, downloads the referenced images, and writes
  `src/generated/*.json`.
- **render** — `scripts/render-markdown.mjs` turns the stored markdown into
  sanitized HTML, plus a heading list for the table of contents.
- **build** — `vite build` bundles the site.

### Development vs CI

- **Development (`npm run dev`)** uses `src/data/mock.ts`. No network, no token.
- **Opt-in local fetch (`npm run refresh`)** fills `src/generated/` with real
  data; when present, the app prefers it over the mocks. Requires a token in the
  environment.
- **CI (the Actions build)** refreshes first (when a token secret is present), so
  the deployed site always reflects current GitHub state.

`src/generated/` — both the JSON and the downloaded assets — is **gitignored**.
Nothing generated is committed; the repository holds code and mocks only.

## Refresh script

Authenticates with a fine-grained token (public repositories, contents: read;
stored as a CI secret, never in the browser), then:

1. read the profile and the list of repositories (paginated, 100 per page)
2. drop forks, archived repositories, and repositories without a README
3. read the group files from the profile repository
4. read each repository's README; parse and strip the YAML frontmatter
5. download the images each README references and rewrite the markdown to point
   at the local copies
6. rewrite relative documentation links to GitHub blob URLs
7. validate each `group` against the declared groups, warning on unknowns
8. write `projects.json`, `profile.json`, and `groups.json`

### Token

Authenticating only raises the rate limit — the data is public, so the token is
read-only.

- **Create:** a fine-grained PAT with *Public repositories (read-only)* access
  and the **Contents: Read** permission (Metadata: Read comes with it).
- **CI:** store it as the repository secret `GH_TOKEN`
  (`gh secret set GH_TOKEN`). The deploy workflow reads it into a `GH_TOKEN`
  environment variable.
- **Local:** export `GH_TOKEN`, or put it in `.env.local` (gitignored).
- An expiry is fine: a lapsed token makes the refresh step fail loudly rather
  than silently shipping stale data. Only a *missing* secret falls back to
  mocks, and that prints a notice.
- The Pages deploy does not use this token at all — it uses the workflow's own
  `GITHUB_TOKEN` through OIDC.

**Assets are downloaded, never hotlinked.** Dynamic badges (shields.io and the
like) are excluded so they keep updating; images are deduped by content hash and
written under `src/generated/assets/<repo>/`. Hotlinking would burn GitHub's
per-visitor quota, and raw file URLs accept no auth, so visitors would see broken
images under load.

**Refresh trigger.** Refresh is a step in the same workflow that deploys, so it
runs on every push to the default branch and on manual `workflow_dispatch` —
there are no scheduled runs. Optional later: `repository_dispatch`, where each
project repo pings this one on README changes for instant rebuilds, at the cost
of a token and a workflow file in every repo.

## README rendering

READMEs are precompiled to sanitized HTML at build time rather than rendered in
the browser.

```
remark-parse
remark-gfm                       tables, task lists, footnotes, autolinks
remark-github-blockquote-alert   > [!NOTE] callouts
remark-rehype                    { allowDangerousHtml: true }
rehype-raw                       parse the safe HTML subset READMEs use
rehype-sanitize                  GitHub schema (extended, see below)
rehype-slug                      heading ids
rehype-autolink-headings         clickable heading anchors
@shikijs/rehype                  Shiki highlighting (build-time only)
rehype-stringify
```

Why build time: the browser ships an HTML string instead of a markdown parser;
Shiki highlighting is free out here; the TOC falls out of the AST; and styling
lives in CSS (`prose`), so it never triggers a re-render.

**HTML policy.** Real READMEs use `<p align="center">`, `<img>` badges,
`<details>`, `<sub>`, and `<kbd>`. Stripping HTML silently degrades them, so raw
HTML is parsed and then sanitized with GitHub's schema (the safe subset). One
caveat: that schema strips `class` and `style`, so it must be extended to keep
the downloaded asset paths and the alert classes; Shiki runs after sanitize (its
output only wraps already-escaped code text).

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
refresh. The build copies `index.html` to `404.html`; Pages serves it for unknown
paths and the client-side router takes over.

Deployment runs through GitHub Actions (`actions/upload-pages-artifact` +
`actions/deploy-pages`) in `.github/workflows/deploy.yml`. It runs on every push
to the default branch and on manual `workflow_dispatch` — no scheduled builds.

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
