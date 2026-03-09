'use client'

import { useState, useTransition } from 'react'
import { cancelScheduledPost } from '@/app/actions'
import type { ScheduledPost } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  posts: ScheduledPost[]
}

const STATUS_PILL: Record<ScheduledPost['status'], string> = {
  pending: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
  processing: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
  published: 'bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400',
  failed: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
  cancelled: 'bg-muted border-border text-muted-foreground',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ScheduleQueue({ posts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cancelling, setCancelling] = useState<string | null>(null)

  function handleCancel(id: string) {
    setCancelling(id)
    startTransition(async () => {
      await cancelScheduledPost(id)
      setCancelling(null)
      router.refresh()
    })
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-10 text-center text-sm text-muted-foreground">
        No scheduled posts yet. Use the form above to schedule your first post.
      </div>
    )
  }

  const activePosts = posts.filter(p => p.status === 'pending' || p.status === 'processing')
  const historyPosts = posts.filter(p => p.status !== 'pending' && p.status !== 'processing')

  return (
    <div className="space-y-4">
      {activePosts.length > 0 && (
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-3">
          <p className="text-sm font-bold text-foreground">Upcoming</p>
          <div className="space-y-2">
            {activePosts.map(post => (
              <PostRow key={post.id} post={post} onCancel={handleCancel} cancelling={cancelling} isPending={isPending} />
            ))}
          </div>
        </div>
      )}

      {historyPosts.length > 0 && (
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-3">
          <p className="text-sm font-bold text-foreground">History</p>
          <div className="space-y-2">
            {historyPosts.map(post => (
              <PostRow key={post.id} post={post} onCancel={handleCancel} cancelling={cancelling} isPending={isPending} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PostRow({
  post,
  onCancel,
  cancelling,
  isPending,
}: {
  post: ScheduledPost
  onCancel: (id: string) => void
  cancelling: string | null
  isPending: boolean
}) {
  const platformLabel = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' }[post.platform]

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] transition-colors hover:bg-muted/50 dark:hover:bg-[#1e1e38]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground">{platformLabel}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_PILL[post.status]}`}>
            {post.status}
          </span>
        </div>
        <p className="text-sm text-foreground/85 line-clamp-2">{post.caption}</p>
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.hashtags.slice(0, 5).map(h => (
              <span key={h} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted dark:bg-white/[0.04] text-muted-foreground">#{h}</span>
            ))}
            {post.hashtags.length > 5 && <span className="text-[10px] text-muted-foreground">+{post.hashtags.length - 5}</span>}
          </div>
        )}
        {post.error_message && (
          <p className="text-xs text-red-500 mt-1">{post.error_message}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(post.scheduled_at)}</span>
        {post.status === 'pending' && (
          <button
            className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-all duration-150"
            onClick={() => onCancel(post.id)}
            disabled={isPending && cancelling === post.id}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
