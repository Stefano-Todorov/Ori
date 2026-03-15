'use client'

import { useTransition } from 'react'
import { deleteScheduledPost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { ScheduledPost, Difficulty } from '@/lib/types'

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

interface PostWithIdea extends ScheduledPost {
  content_idea?: {
    id: string
    idea: string
    difficulty?: Difficulty | null
    video_type?: string | null
    tags?: string[]
    hook_idea?: string | null
    cta?: string | null
  } | null
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
        {posts.map(post => {
          const idea = post.content_idea
          return (
            <div key={post.id} className="px-4 py-3 rounded-xl bg-muted/30 dark:bg-white/[0.02] border border-border/50 dark:border-white/5 group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Date + platform row */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">
                      {new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {post.platform && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                        {post.platform}
                      </span>
                    )}
                  </div>

                  {/* Idea title */}
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {post.title || idea?.idea || 'Untitled'}
                  </p>

                  {/* Hook idea */}
                  {idea?.hook_idea && (
                    <p className="text-[11px] text-muted-foreground italic leading-snug line-clamp-1">
                      Hook: {idea.hook_idea}
                    </p>
                  )}

                  {/* Tags row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {idea?.difficulty && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[idea.difficulty] ?? 'bg-muted text-muted-foreground'}`}>
                        {idea.difficulty}
                      </span>
                    )}
                    {idea?.video_type && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {idea.video_type}
                      </span>
                    )}
                    {idea?.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={isPending}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
