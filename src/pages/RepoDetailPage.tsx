import { ChevronLeft, Code } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ProjectActions } from '../components/ProjectActions'
import { groupById, projectByRepo, repoUrl, statusLabels } from '../data'

export function RepoDetailPage() {
  const { repo } = useParams()
  const project = repo ? projectByRepo(repo) : undefined

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Repository not found</h1>
        <p className="text-neutral-600">No project matches "{repo}".</p>
        <Link to="/" className="inline-block text-sm font-medium underline">
          Back to all projects
        </Link>
      </div>
    )
  }

  const group = groupById(project.group)

  return (
    <div className="space-y-6">
      <Link
        to={group ? `/${group.id}` : '/'}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {group ? group.title : 'All projects'}
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          {project.status && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
              {statusLabels[project.status]}
            </span>
          )}
        </div>

        <p className="max-w-2xl text-neutral-600">{project.summary}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
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
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Code className="size-3.5" aria-hidden="true" />
            Open on GitHub
          </a>
        </div>
      </header>

      {project.readme ? (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">README</h2>
          {/* Plain text for now; render-markdown.mjs will emit sanitized HTML later (plan section 7). */}
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-700">
            {project.readme}
          </pre>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-500">
          No README available for <code className="font-mono text-neutral-700">{project.repo}</code>.
        </section>
      )}
    </div>
  )
}
