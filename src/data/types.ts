/**
 * Shared data shapes.
 *
 * This module is TYPE-ONLY on purpose: the refresh script imports from it with
 * `import type`, so those imports vanish at runtime and Node never has to load
 * any browser-facing code. Keep it free of imports and runtime values.
 */

export type ProjectStatus = 'built' | 'wip' | 'archived'

export type GroupIconId = 'gamepad' | 'music' | 'languages' | 'wrench'

export interface Profile {
  name: string
  login: string
  bio: string
  /** root-relative path to the downloaded avatar, e.g. /generated/avatar-1a2b3c4d.png */
  avatar?: string
  location?: string
  blog?: string
}

export interface Group {
  id: string
  title: string
  description: string
  /** hex color used as this group's accent */
  accent: string
  icon: GroupIconId
}

export interface Project {
  /** GitHub repo name; doubles as the /repos/:repo slug */
  repo: string
  title: string
  /** id of the owning group */
  group: string
  summary: string
  tags: string[]
  language?: string
  stars?: number
  pushedAt?: string
  featured?: boolean
  status?: ProjectStatus
  demo?: string
  /** reserved word, fine as an object key but not as a variable name */
  try?: string
  download?: string
  /** raw README markdown, frontmatter stripped (rendered later by render-markdown) */
  readme?: string
}

/** A heading lifted out of a rendered README, for the table of contents. */
export interface Heading {
  depth: number
  id: string
  text: string
}

/**
 * A README precompiled to sanitized HTML by scripts/render-markdown.mjs
 * (src/generated/rendered.json), keyed by repo name.
 */
export interface RenderedReadme {
  html: string
  headings: Heading[]
}
