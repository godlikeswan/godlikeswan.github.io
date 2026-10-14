#!/usr/bin/env node
/**
 * refresh-projects.ts - fetch GitHub data and write src/generated/*.json.
 *
 * Invoked via `npm run refresh` (locally, opt-in) and as a step of the Pages
 * deploy workflow. This first slice only reads the account profile:
 *
 *   GET /users/<login>  ->  src/generated/profile.json
 *                       ->  public/generated/avatar-<hash>.<ext>
 *
 * Groups and projects slot in later as purely additive steps; the account,
 * token handling, output dirs, and the request helper stay the same.
 *
 * Runs directly under Node (>= 23.6 strips types with no flag). It imports
 * only TYPES from src/, so nothing browser-facing is ever loaded at runtime.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Profile } from '../src/data/types.ts'

const ROOT = resolve(import.meta.dirname, '..')
const GENERATED_DIR = resolve(ROOT, 'src/generated')
const PUBLIC_ASSETS_DIR = resolve(ROOT, 'public/generated')
const API = 'https://api.github.com'
const USER_AGENT = 'godlikeswan-portfolio-refresh'

/** Fine-grained PAT. Optional for a single public call, but raises the limit. */
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

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: apiHeaders('application/vnd.github+json') })
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

async function main(): Promise<void> {
  const login = resolveLogin()
  log(`account: ${login}${token ? '' : ' (unauthenticated - 60 requests/hour)'}`)

  // Regenerate from scratch so removed/renamed output never lingers.
  await rm(GENERATED_DIR, { recursive: true, force: true })
  await rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true })
  await mkdir(GENERATED_DIR, { recursive: true })
  await mkdir(PUBLIC_ASSETS_DIR, { recursive: true })

  const user = await getJson<GitHubUser>(`${API}/users/${login}`)
  const avatar = await downloadAvatar(user.avatar_url)

  const profile: Profile = {
    login: user.login,
    name: user.name ?? user.login,
    bio: user.bio ?? '',
    avatar,
    location: user.location ?? undefined,
    blog: user.blog?.trim() || undefined,
  }

  const outFile = resolve(GENERATED_DIR, 'profile.json')
  await writeFile(outFile, `${JSON.stringify(profile, null, 2)}\n`)
  log(`wrote src/generated/profile.json and ${avatar}`)
}

main().catch((error: unknown) => {
  console.error(`[refresh] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
