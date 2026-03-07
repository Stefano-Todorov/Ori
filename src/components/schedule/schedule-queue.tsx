'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cancelScheduledPost } from '@/app/actions'
import type { ScheduledPost } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  posts: ScheduledPost[]
}

const STATUS_COLORS: Record<ScheduledPost['status'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  processing: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  published: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
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
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No scheduled posts yet. Use the form above to schedule your first post.
        </CardContent>
      </Card>
    )
  }

  const activePosts = posts.filter(p => p.status === 'pending' || p.status === 'processing')
  const historyPosts = posts.filter(p => p.status !== 'pending' && p.status !== 'processing')

  return (
    <div className="space-y-4">
      {activePosts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activePosts.map(post => (
              <PostRow key={post.id} post={post} onCancel={handleCancel} cancelling={cancelling} isPending={isPending} />
            ))}
          </CardContent>
        </Card>
      )}

      {historyPosts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {historyPosts.map(post => (
              <PostRow key={post.id} post={post} onCancel={handleCancel} cancelling={cancelling} isPending={isPending} />
            ))}
          </CardContent>
        </Card>
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
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">{platformLabel}</span>
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[post.status]}`}>
            {post.status}
          </Badge>
        </div>
        <p className="text-sm line-clamp-2">{post.caption}</p>
        {post.hashtags.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {post.hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}
            {post.hashtags.length > 5 && ` +${post.hashtags.length - 5}`}
          </p>
        )}
        {post.error_message && (
          <p className="text-xs text-destructive mt-1">{post.error_message}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(post.scheduled_at)}</span>
        {post.status === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive h-6 px-2"
            onClick={() => onCancel(post.id)}
            disabled={isPending && cancelling === post.id}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
