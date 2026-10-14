# Portfolio

A small, static personal portfolio. It presents an intro, the groups projects
fall into, and a rendered README for each project.

Almost everything comes from GitHub at build time. The only handwritten parts are
a project's own README frontmatter (`group`, `summary`, `tags`, `featured`, and
links) and a profile repository that defines the groups and the about-me intro.
[ARCHITECTURE.md](ARCHITECTURE.md) has the full picture.

Built with Vite + React + TypeScript, Tailwind CSS, and React Router.

## Status

Early, but the shell is live. The app shell, layout, and the GitHub Pages
deploy workflow are in place. The refresh script fetches the profile (name,
handle, bio, avatar), the repository list, and each README from GitHub, and a
separate offline step precompiles those READMEs to sanitized HTML (tables, task
lists, alert callouts, and Shiki-highlighted code). Projects still sit in one
temporary **ungrouped** bucket; real groups and README asset downloading are
next.

- [x] Vite + React + TypeScript shell
- [x] Styling and component stack chosen and wired
- [x] Layout, routing, project cards (mock data)
- [x] GitHub Pages deploy via Actions — runs on push and manual dispatch, with
      the Pages source set to "GitHub Actions"
- [x] `scripts/refresh-projects.ts` — fetch the profile (name, handle, bio,
      avatar) into `src/generated/` (run with `npm run refresh`)
- [x] `scripts/refresh-projects.ts` — fetch repositories and their READMEs
      (all under a temporary "ungrouped" group until groups land)
- [x] `scripts/render-markdown.mjs` — README markdown -> sanitized HTML with the
      unified pipeline (GFM tables/task lists, alert callouts, heading ids and
      anchors, Shiki highlighting), plus a heading list for the TOC
- [ ] `scripts/refresh-projects.ts` — read the real groups from the profile repo
- [ ] `scripts/refresh-projects.ts` — download README images and rewrite relative
      doc links (images are still hotlinked/relative until then)
- [ ] Demo links / embedding for client-only projects

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run lint     # oxlint
npm run preview  # serve the built output locally
npm run refresh  # fetch GitHub data + render READMEs into src/generated/ (optional)
npm run render   # (re)render READMEs only — offline, no API calls
npm run clean    # remove dist/ and generated data (next build falls back to mocks)
```

`npm run refresh` is optional — without it, the app falls back to the mocks in
`src/data/`. It reads `GH_TOKEN` from the environment or a gitignored `.env` /
`.env.local` (copy `.env.example`).

## Project structure

```
.github/workflows/  deploy.yml — build + deploy to GitHub Pages
scripts/        refresh-projects.ts — fetch GitHub data into src/generated/
                render-markdown.mjs — README markdown -> sanitized HTML (offline)
                clean.ts — remove dist/ and generated data
src/
  data/         types.ts (shared shapes), mock.ts (dev fallback), index.ts (the seam)
  assets/       mock-avatar.png — the fallback profile picture for mock data
  layouts/      RootLayout — persistent sidebar + main content
  components/   Sidebar, Avatar, RepoCard, ProjectActions, GroupIcon, RenderedMarkdown
  pages/        HomePage, GroupPage, RepoDetailPage, NotFoundPage
  lib/          cn() class helper
  router.tsx    route definitions
  generated/    (gitignored) JSON produced by `npm run refresh` / `npm run render`
public/
  generated/    (gitignored) downloaded images, e.g. the avatar
vite.config.ts  Tailwind plugin + the index.html -> 404.html SPA fallback
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — where content lives, data flow, build
  pipeline, README rendering, routing, and hosting.
