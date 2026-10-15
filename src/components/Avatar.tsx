import { cn } from '../lib/cn'
import { profile } from '../data'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * The profile picture, with an initials fallback so the layout holds up when
 * `npm run refresh` has not run (no downloaded avatar yet).
 */
export function Avatar({ size = 40, className }: { size?: number; className?: string }) {
  const box = { width: size, height: size }

  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt=""
        width={size}
        height={size}
        style={box}
        className={cn('shrink-0 rounded-full bg-neutral-100 object-cover dark:bg-neutral-800', className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.round(size * 0.36) }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
        className,
      )}
    >
      {initials(profile.name)}
    </span>
  )
}
