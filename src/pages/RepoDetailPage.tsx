import { ChevronLeft, Code } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ProjectActions } from '../components/ProjectActions'
import { RenderedMarkdown } from '../components/RenderedMarkdown'
import { groupById, projectByRepo, readmeByRepo, repoUrl, statusLabels } from '../data'

export function RepoDetailPage() {
  const { repo } = useParams()
  const project = repo ? projectByRepo(repo) : undefined

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Repository not found</h1>
        <p className="text-neutral-600 dark:text-neutral-400">No project matches "{repo}".</p>
        <Link to="/" className="inline-block text-sm font-medium underline">
          Back to all projects
        </Link>
      </div>
    )
  }

  const group = groupById(project.group)
  const rendered = readmeByRepo(project.repo)

  return (
    <div className="space-y-6">
      <Link
        to={group ? `/${group.id}` : '/'}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {group ? group.title : 'All projects'}
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          {project.status && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {statusLabels[project.status]}
            </span>
          )}
        </div>

        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">{project.summary}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ProjectActions project={project} />
          <a
            href={repoUrl(project.repo)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
          >
            <Code className="size-3.5" aria-hidden="true" />
            Open on GitHub
          </a>
        </div>
      </header>

      {rendered ? (
        <RenderedMarkdown content={rendered} />
      ) : project.readme ? (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">README</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Not rendered yet (run <code className="font-mono">npm run render</code>); showing the
            source.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {project.readme}
          </pre>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          No README available for <code className="font-mono text-neutral-700 dark:text-neutral-300">{project.repo}</code>.
        </section>
      )}
    </div>
  )
}
