import { Link, useParams } from 'react-router'
import { GroupIcon } from '../components/GroupIcon'
import { RepoCard } from '../components/RepoCard'
import { groupById, projectsInGroup } from '../data'

export function GroupPage() {
  const { group: groupId } = useParams()
  const group = groupId ? groupById(groupId) : undefined

  if (!group) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Unknown group</h1>
        <p className="text-neutral-600 dark:text-neutral-400">There is no group named "{groupId}".</p>
        <Link to="/" className="inline-block text-sm font-medium underline">
          Back to all projects
        </Link>
      </div>
    )
  }

  const items = projectsInGroup(group.id)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <span style={{ color: group.accent }} className="dark:brightness-125">
            <GroupIcon name={group.icon} className="size-6" />
          </span>
          {group.title}
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">{group.description}</p>
      </header>

      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((project) => (
            <RepoCard key={project.repo} project={project} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No projects in this group yet.
        </p>
      )}
    </div>
  )
}
