import { Gamepad2, Languages, Music, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GroupIconId } from '../data'

const icons: Record<GroupIconId, LucideIcon> = {
  gamepad: Gamepad2,
  music: Music,
  languages: Languages,
  wrench: Wrench,
}

export function GroupIcon({ name, className }: { name: GroupIconId; className?: string }) {
  const Icon = icons[name]
  return <Icon className={className} aria-hidden="true" />
}
