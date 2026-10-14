import { Link } from 'react-router'
import { Avatar } from '../components/Avatar'
import { GroupIcon } from '../components/GroupIcon'
import { RepoCard } from '../components/RepoCard'
import { featuredProjects, groups, profile, projectCount } from '../data'

function projectLabel(count: number): string {
  return count === 1 ? '1 project' : `${count} projects`
}

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar size={72} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hi, I'm {profile.name}.</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">{profile.bio}</p>
          {profile.location && <p className="mt-2 text-sm text-neutral-400">{profile.location}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">What I make</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                to={`/${group.id}`}
                className="flex h-full flex-col rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: group.accent }}>
                  <GroupIcon name={group.icon} className="size-4" />
                  {group.title}
                </span>
                <span className="mt-1 text-xs text-neutral-400">{projectLabel(projectCount(group.id))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Featured</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {featuredProjects.map((project) => (
            <RepoCard key={project.repo} project={project} />
          ))}
        </div>
      </section>
    </div>
  )
}
