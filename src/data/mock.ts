/**
 * MOCK DATA - stands in for the real build output.
 *
 * This module is the single seam between the UI and its data. Later it is
 * replaced by src/generated/{profile,groups,projects}.json produced by
 * scripts/refresh-projects.mjs + scripts/render-markdown.mjs (plan sections
 * 4 and 6). The UI should only ever import from a module like this one, so
 * swapping the source means editing this file, not the components.
 */

export type ProjectStatus = 'built' | 'wip' | 'archived'

export type GroupIconId = 'gamepad' | 'music' | 'languages' | 'wrench'

export interface Profile {
  name: string
  login: string
  bio: string
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
}

export const statusLabels: Record<ProjectStatus, string> = {
  built: 'live',
  wip: 'WIP',
  archived: 'archived',
}

export const profile: Profile = {
  name: 'User',
  login: 'user',
  bio: 'I build small, self-contained tools and games: tiny puzzle solvers, audio toys, and language experiments. Mostly client-side, and mostly over-engineered in a good way.',
  location: 'Somewhere on the internet',
  blog: 'https://example.com/',
}

export const groups: Group[] = [
  {
    id: 'games',
    title: 'Games & Puzzle Solvers',
    description:
      'Small games and the solvers that play them - mostly things that are more fun to watch than to beat.',
    accent: '#7c3aed',
    icon: 'gamepad',
  },
  {
    id: 'music',
    title: 'Music & Audio',
    description: 'Ear training, synths, and tools that make noise in the browser.',
    accent: '#db2777',
    icon: 'music',
  },
  {
    id: 'languages',
    title: 'Languages & Linguistics',
    description: 'Conlanging helpers, scripts, and the occasional bit of computational linguistics.',
    accent: '#0891b2',
    icon: 'languages',
  },
  {
    id: 'tools',
    title: 'Tools & Experiments',
    description: 'Utilities, toys, and half-finished ideas that were too fun to leave in a gist.',
    accent: '#16a34a',
    icon: 'wrench',
  },
]

export const projects: Project[] = [
  {
    repo: 'perfect-tetris',
    title: 'Perfect Tetris',
    group: 'games',
    summary: 'A Zig perfect-clear solver that finds a full-board clear in about 10 ms on average.',
    tags: ['zig', 'wasm', 'tetris', 'solver'],
    language: 'Zig',
    stars: 128,
    pushedAt: '2026-08-14',
    featured: true,
    status: 'built',
    demo: 'https://example.com/perfect-tetris/',
    download: 'https://example.com/perfect-tetris/releases',
  },
  {
    repo: 'maze-cartographer',
    title: 'Maze Cartographer',
    group: 'games',
    summary: 'Generates and renders mazes with several algorithms, then animates the search.',
    tags: ['typescript', 'canvas'],
    language: 'TypeScript',
    stars: 17,
    pushedAt: '2026-06-21',
    status: 'wip',
  },
  {
    repo: 'ear-trainer',
    title: 'Ear Trainer',
    group: 'music',
    summary: 'Interval and chord recognition drills with a Web Audio synth you can tweak.',
    tags: ['typescript', 'web-audio', 'music'],
    language: 'TypeScript',
    stars: 41,
    pushedAt: '2026-07-02',
    featured: true,
    status: 'built',
    try: 'https://example.com/ear-trainer/',
  },
  {
    repo: 'midi-scripter',
    title: 'MIDI Scripter',
    group: 'music',
    summary: 'Write JavaScript against live MIDI input to prototype arpeggiators and transforms.',
    tags: ['javascript', 'midi', 'webmidi'],
    language: 'JavaScript',
    stars: 9,
    pushedAt: '2026-04-11',
    demo: 'https://example.com/midi-scripter/',
  },
  {
    repo: 'conlang-forge',
    title: 'Conlang Forge',
    group: 'languages',
    summary: 'A toolkit for building phonologies and generating consistent word lists.',
    tags: ['rust', 'cli', 'linguistics'],
    language: 'Rust',
    stars: 22,
    pushedAt: '2026-05-30',
    status: 'wip',
  },
  {
    repo: 'stroke-order',
    title: 'Stroke Order',
    group: 'languages',
    summary: 'Animates kanji stroke order from a dataset, with a quiz mode.',
    tags: ['svg', 'japanese', 'education'],
    language: 'TypeScript',
    stars: 6,
    pushedAt: '2026-02-08',
    status: 'archived',
  },
  {
    repo: 'regex-golf',
    title: 'Regex Golf',
    group: 'tools',
    summary: 'Daily regex puzzles scored by character count, graded in a Web Worker.',
    tags: ['typescript', 'worker', 'game'],
    language: 'TypeScript',
    stars: 33,
    pushedAt: '2026-09-01',
    featured: true,
    status: 'built',
    try: 'https://example.com/regex-golf/',
    download: 'https://example.com/regex-golf/releases',
  },
]

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
