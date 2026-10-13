import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// GitHub Pages has no rewrite rules, so a client-side route such as
// /repos/example would 404 on a hard refresh. Copy the built index.html to
// 404.html; Pages serves it for unknown paths and the router takes over.
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/', // served from a user-site repo (<user>.github.io) at the root
  plugins: [react(), tailwindcss(), spaFallback()],
})
