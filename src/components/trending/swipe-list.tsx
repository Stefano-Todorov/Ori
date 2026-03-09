'use client'

import { useState } from 'react'
import { Trash2, ExternalLink } from 'lucide-react'
import { deleteSwipePost } from '@/app/actions'
import type { Post } from '@/lib/types'

interface Props {
  posts: Post[]
}

const PLATFORM_PILL: Record<string, string> = {
  tiktok: 'bg-black/80 dark:bg-white/10 text-white border-transparent',
  instagram: 'bg-pink-500/15 border-pink-500/30 text-pink-600 dark:text-pink-400',
  youtube: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
}

export function SwipeList({ posts: initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts)

  async function handleDelete(id: string) {
    await deleteSwipePost(id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (posts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16 text-sm">
        No videos saved yet. Paste a URL above to add your first entry.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-5 space-y-2.5 transition-all duration-150 hover:border-purple-500/20">
          <div className="flex items-start gap-2.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 ${PLATFORM_PILL[post.platform] ?? 'bg-muted text-muted-foreground border-border'}`}>
              {post.platform}
            </span>
            {post.competitor_handle && (
              <span className="text-sm font-medium text-muted-foreground">@{post.competitor_handle}</span>
            )}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {post.url && (
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-purple-500 transition-colors" title="Open video">
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg p-1.5 transition-all duration-150"
                onClick={() => handleDelete(post.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {post.url && (
            <p className="text-xs text-muted-foreground/60 truncate">{post.url}</p>
          )}

          {post.caption && (
            <p className="text-sm text-foreground/85 leading-relaxed">{post.caption}</p>
          )}

          <p className="text-[11px] text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
