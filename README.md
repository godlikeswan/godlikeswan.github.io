# Portfolio

A small, static personal portfolio. It presents an intro, the groups projects
fall into, and a rendered README for each project.

Almost everything comes from GitHub at build time. The only handwritten parts are
a project's own README frontmatter (`group`, `summary`, `tags`, `featured`, and
links) and a profile repository that defines the groups and the about-me intro.
[ARCHITECTURE.md](ARCHITECTURE.md) has the full picture.

Built with Vite + React + TypeScript, Tailwind CSS, and React Router.

## Status

Early. The application shell, layout, and the GitHub Pages deploy workflow are
in place against **mock data**; the GitHub data pipeline is next.

- [x] Vite + React + TypeScript shell
- [x] Styling and component stack chosen and wired
- [x] Layout, routing, project cards (mock data)
- [x] GitHub Pages deploy via Actions (push + manual; switch the Pages source to "GitHub Actions")
- [ ] `scripts/refresh-projects.mjs` — fetch profile, repos, groups, READMEs, assets
- [ ] `scripts/render-markdown.mjs` — markdown -> sanitized HTML
- [ ] Demo links / embedding for client-only projects

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run lint     # oxlint
npm run preview  # serve the built output locally
```

> On Windows PowerShell, if `npm` is blocked by the script execution policy, use
> `npm.cmd ...` instead (or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).

## Project structure

```
src/
  data/         mock data for now; src/generated/* (gitignored) once fetched
  layouts/      RootLayout — persistent sidebar + main content
  components/   Sidebar, RepoCard, ProjectActions, GroupIcon
  pages/        HomePage, GroupPage, RepoDetailPage, NotFoundPage
  router.tsx    route definitions
scripts/        (planned) refresh-projects.mjs, render-markdown.mjs
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — where content lives, data flow, build
  pipeline, README rendering, routing, and hosting.
