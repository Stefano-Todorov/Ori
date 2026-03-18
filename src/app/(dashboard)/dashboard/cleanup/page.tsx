'use client'

import { useState } from 'react'
import { cleanupZeroStatsPosts } from '@/app/actions'

export default function CleanupPage() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCleanup() {
    setLoading(true)
    const res = await cleanupZeroStatsPosts()
    setResult(`Deleted ${res.deleted} post(s) with 0 stats.`)
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-md space-y-4">
      <h1 className="text-xl font-bold">Cleanup Posts</h1>
      <p className="text-sm text-muted-foreground">
        Delete all posts that have 0 views, 0 likes, and 0 comments (broken saves from before the extraction fix).
      </p>
      <button
        onClick={handleCleanup}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Cleaning...' : 'Delete zero-stats posts'}
      </button>
      {result && <p className="text-sm text-green-500">{result}</p>}
    </div>
  )
}
