'use client'

import { useTransition } from 'react'
import { deleteScheduledPost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { ScheduledPost } from '@/lib/types'

interface PostWithIdea extends ScheduledPost {
  content_idea?: { id: string; idea: string } | null
}

interface Props {
  posts: PostWithIdea[]
}

export function ScheduledPostsList({ posts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (posts.length === 0) return null

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteScheduledPost(id)
      router.refresh()
    })
  }

  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-3">
      <p className="text-sm font-bold text-foreground">Planned Posts</p>
      <div className="space-y-2">
        {posts.map(post => (
          <div key={post.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {post.platform && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                  {post.platform}
                </span>
              )}
              <span className="text-xs font-medium text-foreground truncate">
                {post.title || post.content_idea?.idea || 'Untitled'}
              </span>
            </div>
            <button
              onClick={() => handleDelete(post.id)}
              disabled={isPending}
              className="p-1 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
