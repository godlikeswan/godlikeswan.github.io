import type { Profile } from '../data/types'

/**
 * Point the document at this profile: the tab title and the avatar as the icon.
 *
 * Deliberately done at runtime rather than with static tags in index.html. The
 * avatar URL is only known once things are bundled -- for real data it is a
 * content-hashed /generated/avatar-<hash>.<ext>, and for the mock fallback it
 * is a Vite asset URL -- so neither can be written into index.html up front.
 * Reading it from the same `profile` the UI renders keeps the tab in sync with
 * whatever data the app is actually showing, mocks included.
 *
 * Called once from main.tsx, before React renders.
 */
export function applyProfileMeta(profile: Profile): void {
  const who = profile.name?.trim() || profile.login?.trim() || ''
  document.title = who ? `${who} | Portfolio` : 'Portfolio'

  if (!profile.avatar) return
  // `favicon` is the avatar pre-cropped to a circle with sharp, so the browser
  // only has to download it. Fall back to the square avatar if it is missing,
  // and keep the square for apple-touch-icon -- iOS applies its own mask.
  setIcon('icon', profile.favicon ?? profile.avatar)
  setIcon('apple-touch-icon', profile.avatar)
}

function setIcon(rel: string, href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.append(link)
  }
  link.href = href
  // Drop the placeholder's type="image/svg+xml"; let the browser sniff the
  // real type (a png file).
  link.removeAttribute('type')
}
