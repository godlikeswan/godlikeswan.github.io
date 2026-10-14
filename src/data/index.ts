/**
 * The data seam.
 *
 * Everything in the UI imports from here, never from ./mock or ./generated
 * directly. If a generated file exists (written by scripts/refresh-projects.ts,
 * gitignored), it wins; otherwise we fall back to ./mock so the app runs with
 * no network, no token, and no build step.
 *
 * `import.meta.glob` (rather than a static import of a possibly-missing file)
 * is what makes the fallback work in both dev and build: it yields `{}` when
 * nothing matches instead of failing to resolve.
 */

import type { Group, Profile, Project } from './types'
import {
  groups as mockGroups,
  profile as mockProfile,
  projects as mockProjects,
} from './mock'

export type { Group, GroupIconId, Profile, Project, ProjectStatus } from './types'

export const statusLabels: Record<Project['status'] & string, string> = {
  built: 'live',
  wip: 'WIP',
  archived: 'archived',
}

const generated = import.meta.glob('../generated/{profile,groups,projects}.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

export const profile: Profile =
  (generated['../generated/profile.json'] as Profile | undefined) ?? mockProfile

export const groups: Group[] =
  (generated['../generated/groups.json'] as Group[] | undefined) ?? mockGroups

export const projects: Project[] =
  (generated['../generated/projects.json'] as Project[] | undefined) ?? mockProjects

export function groupById(id: string): Group | undefined {
  return groups.find((group) => group.id === id)
}

export function projectsInGroup(id: string): Project[] {
  return projects.filter((project) => project.group === id)
}

export function projectCount(id: string): number {
  return projectsInGroup(id).length
}

export function projectByRepo(repo: string): Project | undefined {
  return projects.find((project) => project.repo === repo)
}

export function repoUrl(repo: string): string {
  return `https://github.com/${profile.login}/${repo}`
}

export const featuredProjects: Project[] = projects.filter((project) => project.featured)
