/**
 * clean.ts - remove build output and generated data.
 *
 * Deletes the Vite build output (dist, dist-ssr) and both generated
 * directories (src/generated, public/generated), so the next build starts
 * fresh and falls back to the mock data. `npm run refresh` recreates the
 * generated data; `npm run build` recreates dist.
 *
 * Paths are resolved from this file, so it does not matter where it is run from.
 */

import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

const TARGETS = ['dist', 'dist-ssr', 'src/generated', 'public/generated']

for (const target of TARGETS) {
  rmSync(resolve(ROOT, target), { recursive: true, force: true })
}
