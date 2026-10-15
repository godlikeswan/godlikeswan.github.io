import { Outlet } from 'react-router'
import { Sidebar } from '../components/Sidebar'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 md:flex dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
