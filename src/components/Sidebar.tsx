import { Home } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '../lib/cn'
import { groups, profile, projectCount } from '../data'
import { Avatar } from './Avatar'
import { GroupIcon } from './GroupIcon'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-neutral-900 font-medium text-white'
      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  )
}

export function Sidebar() {
  return (
    <aside className="border-b border-neutral-200 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="p-4 md:p-6">
        <NavLink to="/" className="flex items-center gap-3 px-1">
          <Avatar size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{profile.name}</span>
            <span className="block truncate text-xs text-neutral-400">@{profile.login}</span>
          </span>
        </NavLink>

        <nav className="mt-6 flex flex-col gap-1" aria-label="Project groups">
          <NavLink to="/" end className={navLinkClass}>
            <Home className="size-4" aria-hidden="true" />
            <span>All projects</span>
          </NavLink>

          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Groups
          </p>
          {groups.map((group) => (
            <NavLink key={group.id} to={`/${group.id}`} className={navLinkClass}>
              <GroupIcon name={group.icon} className="size-4" />
              <span className="flex-1 truncate">{group.title}</span>
              <span className="text-xs tabular-nums opacity-60">{projectCount(group.id)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
