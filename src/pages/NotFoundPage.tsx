import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-neutral-400">404</p>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="text-neutral-600">That link does not go anywhere (yet).</p>
      <Link to="/" className="inline-block text-sm font-medium underline">
        Back to all projects
      </Link>
    </div>
  )
}
