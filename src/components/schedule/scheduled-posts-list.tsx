'use client'

import { useTransition } from 'react'
import { deleteScheduledPost } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { refreshKeepScroll } from '@/lib/router-utils'
import { Trash2, ListChecks, Pencil } from 'lucide-react'
import type { ScheduledPost } from '@/lib/types'

interface PostWithIdea extends ScheduledPost {
  content_idea?: {
    id: string
    idea: string
    tags?: string[]
    hook_idea?: string | null
    cta?: string | null
  } | null
}

interface Props {
  posts: PostWithIdea[]
  /** When provided, clicking a post opens it for editing. */
  onEdit?: (post: PostWithIdea) => void
}

export function ScheduledPostsList({ posts, onEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (posts.length === 0) return null

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteScheduledPost(id)
      refreshKeepScroll(router)
    })
  }

  // Soonest first
  const sorted = [...posts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]">
      <p className="text-sm font-bold text-foreground flex items-center gap-2">
        <ListChecks size={15} className="text-purple-500" />
        Planned Posts
        <span className="text-[11px] font-medium text-muted-foreground">({posts.length})</span>
      </p>
      <div className="space-y-2">
        {sorted.map(post => {
          const idea = post.content_idea
          return (
            <div
              key={post.id}
              onClick={() => onEdit?.(post)}
              role={onEdit ? 'button' : undefined}
              tabIndex={onEdit ? 0 : undefined}
              onKeyDown={onEdit ? (e) => { if (e.key === 'Enter') onEdit(post) } : undefined}
              className={`px-4 py-3 rounded-xl bg-muted/30 dark:bg-white/[0.02] border border-border/50 dark:border-white/5 group transition-all ${
                onEdit ? 'cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/[0.03]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Date + platform row */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 shrink-0">
                      {new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {post.platform && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 capitalize">
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
                  {(idea?.tags?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {idea!.tags!.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {onEdit && (
                    <span className="p-1.5 text-muted-foreground group-hover:text-purple-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Pencil size={14} />
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id) }}
                    disabled={isPending}
                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                    aria-label="Delete scheduled post"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
