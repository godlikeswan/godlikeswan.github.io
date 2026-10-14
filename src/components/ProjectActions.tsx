import type { ReactNode } from 'react'
import { Download, ExternalLink, Play } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Project } from '../data'

function ActionLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="relative z-10 inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      {icon}
      {children}
    </a>
  )
}

/** Optional Demo / Try / Download buttons, driven entirely by the data. */
export function ProjectActions({ project, className }: { project: Project; className?: string }) {
  if (!project.demo && !project.try && !project.download) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {project.demo && (
        <ActionLink href={project.demo} icon={<ExternalLink className="size-3.5" aria-hidden="true" />}>
          Demo
        </ActionLink>
      )}
      {project.try && (
        <ActionLink href={project.try} icon={<Play className="size-3.5" aria-hidden="true" />}>
          Try it
        </ActionLink>
      )}
      {project.download && (
        <ActionLink href={project.download} icon={<Download className="size-3.5" aria-hidden="true" />}>
          Download
        </ActionLink>
      )}
    </div>
  )
}
