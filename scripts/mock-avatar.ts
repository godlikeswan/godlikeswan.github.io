#!/usr/bin/env node
/**
 * Regenerate src/assets/mock-avatar-circle.png from the square mock avatar.
 *
 * The real avatar's circle is produced by scripts/refresh-projects.ts at build
 * time, but the mock avatar is a committed fixture that never goes through a
 * fetch, so its circle is generated here and checked in. Run `npm run
 * mock-avatar` after changing src/assets/mock-avatar.png.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { circleAvatar } from './avatar.ts'

const ROOT = resolve(import.meta.dirname, '..')
const SOURCE = resolve(ROOT, 'src/assets/mock-avatar.png')
const TARGET = resolve(ROOT, 'src/assets/mock-avatar-circle.png')

const bytes = await readFile(SOURCE)
await writeFile(TARGET, await circleAvatar(bytes))
console.log(`[mock-avatar] wrote ${TARGET}`)
