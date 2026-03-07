'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink } from 'lucide-react'
import { deleteSwipePost } from '@/app/actions'
import type { Post } from '@/lib/types'

interface Props {
  posts: Post[]
}

export function SwipeList({ posts: initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts)

  async function handleDelete(id: string) {
    await deleteSwipePost(id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (posts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No videos saved yet. Paste a URL above to add your first entry.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="p-4 rounded-lg border space-y-2">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="capitalize shrink-0">{post.platform}</Badge>
            {post.competitor_handle && (
              <span className="text-sm text-muted-foreground">@{post.competitor_handle}</span>
            )}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Open video"
                >
                  <ExternalLink size={14} />
                </a>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive h-7 w-7 p-0"
                onClick={() => handleDelete(post.id)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {post.url && (
            <p className="text-xs text-muted-foreground truncate">{post.url}</p>
          )}

          {post.caption && (
            <p className="text-sm">{post.caption}</p>
          )}

          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
