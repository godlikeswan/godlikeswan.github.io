import { ChevronRight, Star } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../lib/cn'
import { statusLabels, type Project, type ProjectStatus } from '../data/mock'
import { ProjectActions } from './ProjectActions'

const statusClasses: Record<ProjectStatus, string> = {
  built: 'bg-emerald-100 text-emerald-800',
  wip: 'bg-amber-100 text-amber-800',
  archived: 'bg-neutral-200 text-neutral-600',
}

/**
 * Card affordances (plan section 3):
 *  - the title <Link> is stretched over the whole card with `after:inset-0`,
 *    so anywhere on the card navigates while staying a real anchor (middle /
 *    ctrl click work, and there is a single, well-labelled tab stop);
 *  - the action buttons are separate <a> elements lifted above the overlay
 *    with `relative z-10`, so they never trigger card navigation;
 *  - hover lift, border change, chevron nudge, and focus-within ring signal
 *    that the card is clickable.
 */
export function RepoCard({ project }: { project: Project }) {
  const hasMeta = project.language != null || project.stars != null
  const hasActions = project.demo != null || project.try != null || project.download != null

  return (
    <article className="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus-within:border-neutral-400">
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">
          <Link
            to={`/repos/${project.repo}`}
            className="after:absolute after:inset-0 after:rounded-xl group-hover:underline"
          >
            {project.title}
          </Link>
        </h3>
        <ChevronRight
          className="mt-0.5 size-5 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500"
          aria-hidden="true"
        />
      </header>

      <p className="mt-2 flex-1 line-clamp-2 text-sm text-neutral-600">{project.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {project.status && (
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusClasses[project.status])}>
            {statusLabels[project.status]}
          </span>
        )}
        {project.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
            {tag}
          </span>
        ))}
      </div>

      {(hasMeta || hasActions) && (
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            {project.language && <span>{project.language}</span>}
            {project.stars != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5" aria-hidden="true" />
                {project.stars}
              </span>
            )}
          </div>
          <ProjectActions project={project} />
        </footer>
      )}
    </article>
  )
}
