import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { profile } from './data'
import { applyProfileMeta } from './lib/documentMeta'
import { router } from './router'
import './index.css'

// The tab title and icon are data-driven (they come from the profile), so they
// are set here rather than hardcoded in index.html.
applyProfileMeta(profile)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
