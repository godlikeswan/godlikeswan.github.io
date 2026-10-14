#!/usr/bin/env node
/**
 * refresh-projects.ts - fetch GitHub data and write src/generated/*.json.
 *
 * Invoked via `npm run refresh` (locally, opt-in) and as a step of the Pages
 * deploy workflow. It reads, in order:
 *
 *   GET /users/<login>                     -> src/generated/profile.json
 *                                          -> public/generated/avatar-<hash>.<ext>
 *   GET /users/<login>/repos (paginated)   -> the repository list
 *   GET /repos/<login>/<repo>/readme       -> each README body
 *
 * and writes:
 *
 *   src/generated/projects.json   one entry per repo that has a README
 *   src/generated/groups.json     placeholder: a single "ungrouped" group
 *
 * Still to come: reading the real groups from the profile repo's groups/<id>.md
 * files, parsing each README's YAML frontmatter for group/tags/links, and
 * downloading README images. The account resolution, request helper, and output
 * dirs below stay the same as those steps land.
 *
 * Runs directly under Node (>= 23.6 strips types with no flag). It imports
 * only TYPES from src/, so nothing browser-facing is ever loaded at runtime.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Group, Profile, Project } from '../src/data/types.ts'

const ROOT = resolve(import.meta.dirname, '..')
const GENERATED_DIR = resolve(ROOT, 'src/generated')
const PUBLIC_ASSETS_DIR = resolve(ROOT, 'public/generated')
const API = 'https://api.github.com'
const USER_AGENT = 'godlikeswan-portfolio-refresh'
const PER_PAGE = 100

/** Fine-grained PAT. Optional for the public endpoints, but raises the limit. */
const token = (process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '').trim() || undefined

function log(message: string): void {
  console.log(`[refresh] ${message}`)
}

/**
 * Account name resolution (plan section 11), first hit wins:
 *   1. GITHUB_REPOSITORY_OWNER (set automatically by Actions)
 *   2. the owner in the `origin` remote URL
 *   3. `gh api user --jq .login`
 * Never hardcoded.
 */
function resolveLogin(): string {
  const fromCi = process.env.GITHUB_REPOSITORY_OWNER?.trim()
  if (fromCi) return fromCi

  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim()
    const match = /github\.com[:/]([^/]+)\//.exec(remote)
    if (match) return match[1]
  } catch {
    /* no git remote, or git unavailable */
  }

  try {
    const login = execFileSync('gh', ['api', 'user', '--jq', '.login'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim()
    if (login) return login
  } catch {
    /* gh missing or not authenticated */
  }

  throw new Error(
    'Could not determine the GitHub account. Set GITHUB_REPOSITORY_OWNER, or run from a clone with a GitHub origin remote.',
  )
}

/** Headers for api.github.com (the token is only ever sent here). */
function apiHeaders(accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function apiGet(url: string, accept: string): Promise<Response> {
  return fetch(url, { headers: apiHeaders(accept) })
}

async function getJson<T>(url: string): Promise<T> {
  const response = await apiGet(url, 'application/vnd.github+json')
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

interface GitHubUser {
  login: string
  name: string | null
  bio: string | null
  avatar_url: string
  blog: string | null
  location: string | null
}

interface GitHubRepo {
  name: string
  description: string | null
  topics?: string[]
  language: string | null
  homepage: string | null
  fork: boolean
  archived: boolean
  pushed_at: string | null
  stargazers_count: number
}

async function fetchProfile(login: string): Promise<GitHubUser> {
  return getJson<GitHubUser>(`${API}/users/${login}`)
}

/** All public repositories owned by the account, most recently pushed first. */
async function fetchRepos(login: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = []
  for (let page = 1; ; page += 1) {
    const url = `${API}/users/${login}/repos?type=owner&sort=pushed&per_page=${PER_PAGE}&page=${page}`
    const response = await apiGet(url, 'application/vnd.github+json')
    if (!response.ok) {
      throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`)
    }
    const batch = (await response.json()) as GitHubRepo[]
    repos.push(...batch)
    if (batch.length < PER_PAGE) break
  }
  return repos
}

/** The README body as markdown, or null when the repository has no README. */
async function fetchReadme(login: string, repo: string): Promise<string | null> {
  const url = `${API}/repos/${login}/${repo}/readme`
  const response = await apiGet(url, 'application/vnd.github.raw+json')
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`)
  }
  return response.text()
}

/**
 * Drop a YAML frontmatter block from the top of a README, if present.
 * The fields are not parsed yet (no repo has them); this only keeps the block
 * out of the rendered body. Parsing lands with the groups step.
 */
function stripFrontmatter(markdown: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(markdown)
  return match ? markdown.slice(match[0].length) : markdown
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Download the avatar next to the other generated assets and return its
 * root-relative URL. Downloaded, never hotlinked: raw/avatars URLs are rate
 * limited per VISITOR ip, so real users would see broken images under load.
 * The content hash in the filename keeps browsers from serving a stale avatar.
 */
async function downloadAvatar(url: string): Promise<string> {
  const sized = new URL(url)
  sized.searchParams.set('s', '256')

  // No Authorization header: this host is not api.github.com.
  const response = await fetch(sized, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`GET ${sized} -> ${response.status} ${response.statusText}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 8)
  const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
  const ext = EXT_BY_CONTENT_TYPE[contentType] ?? 'png'
  const name = `avatar-${hash}.${ext}`

  await writeFile(resolve(PUBLIC_ASSETS_DIR, name), bytes)
  return `/generated/${name}`
}

function toProject(repo: GitHubRepo, readme: string): Project {
  return {
    repo: repo.name,
    // Frontmatter overrides arrive with the groups step; for now GitHub is the source.
    title: repo.name,
    group: 'ungrouped',
    summary: repo.description ?? '',
    tags: repo.topics ?? [],
    language: repo.language ?? undefined,
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at ?? undefined,
    featured: false,
    demo: repo.homepage?.trim() || undefined,
    readme,
  }
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await writeFile(resolve(GENERATED_DIR, name), `${JSON.stringify(value, null, 2)}\n`)
}

async function main(): Promise<void> {
  const login = resolveLogin()
  log(`account: ${login}${token ? '' : ' (unauthenticated - 60 requests/hour)'}`)

  // Regenerate from scratch so removed/renamed output never lingers.
  await rm(GENERATED_DIR, { recursive: true, force: true })
  await rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true })
  await mkdir(GENERATED_DIR, { recursive: true })
  await mkdir(PUBLIC_ASSETS_DIR, { recursive: true })

  const user = await fetchProfile(login)
  const avatar = await downloadAvatar(user.avatar_url)

  const profile: Profile = {
    login: user.login,
    name: user.name ?? user.login,
    bio: user.bio ?? '',
    avatar,
    location: user.location ?? undefined,
    blog: user.blog?.trim() || undefined,
  }
  await writeJson('profile.json', profile)
  log(`profile: ${profile.name} (${avatar})`)

  const repos = await fetchRepos(login)
  log(`found ${repos.length} public repositories`)

  const projects: Project[] = []
  for (const repo of repos) {
    if (repo.fork) {
      log(`skip ${repo.name} (fork)`)
      continue
    }
    if (repo.archived) {
      log(`skip ${repo.name} (archived)`)
      continue
    }
    if (repo.name.toLowerCase() === login.toLowerCase()) {
      log(`skip ${repo.name} (profile repository)`)
      continue
    }

    const readme = await fetchReadme(login, repo.name)
    if (readme === null) {
      log(`skip ${repo.name} (no README)`)
      continue
    }

    const body = stripFrontmatter(readme)
    projects.push(toProject(repo, body))
    log(`+ ${repo.name} (${body.length} chars)`)
  }

  await writeJson('projects.json', projects)

  // Temporary: until groups come from the profile repo's groups/<id>.md files,
  // every project shares one bucket so the sidebar and group page have an entry.
  const ungrouped: Group = {
    id: 'ungrouped',
    title: 'Ungrouped',
    description: 'Repositories that do not declare a group in their README frontmatter yet.',
    accent: '#6b7280',
    icon: 'wrench',
  }
  await writeJson('groups.json', [ungrouped])

  log(`wrote ${projects.length} projects and 1 group`)
}

main().catch((error: unknown) => {
  console.error(`[refresh] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
