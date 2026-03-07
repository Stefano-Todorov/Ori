'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface Props {
  postId: string
  handle: string
  platform: string
  caption: string | null
  hookText: string | null
  views: number
  likes: number
  url: string | null
}

export function GetIdeasButton({ postId, handle, platform, caption, hookText, views, likes, url }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGetIdeas() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/competitors/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, handle, platform, caption, hookText, views, likes, url }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate ideas')
      }

      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        ✓ 3 ideas saved to Ideas board
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-7 px-2 text-muted-foreground hover:text-primary"
        onClick={handleGetIdeas}
        disabled={loading}
      >
        <Sparkles size={12} className="mr-1" />
        {loading ? 'Generating...' : 'Get ideas'}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
