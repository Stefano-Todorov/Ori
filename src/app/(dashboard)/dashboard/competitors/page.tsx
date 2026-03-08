import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { AddCompetitorButton } from '@/components/posts/add-competitor-button'
import { AddPostButton } from '@/components/competitors/add-post-button'
import { GetIdeasButton } from '@/components/competitors/get-ideas-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { deleteCompetitor, deletePost } from '@/app/actions'
import type { Competitor, Post, Platform } from '@/lib/types'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function engagementRate(post: Post): string | null {
  if (!post.views || post.views === 0) return null
  const rate = ((post.likes + post.comments + post.shares) / post.views) * 100
  return rate.toFixed(1)
}

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: competitors }, { data: competitorPosts }] = await Promise.all([
    supabase
      .from('competitors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_competitor', true)
      .order('views', { ascending: false }),
  ])

  // Group posts by competitor handle (case-insensitive)
  const postsByHandle: Record<string, Post[]> = {}
  for (const post of (competitorPosts ?? [])) {
    const key = (post.competitor_handle ?? '__unknown__').toLowerCase()
    if (!postsByHandle[key]) postsByHandle[key] = []
    postsByHandle[key].push(post)
  }

  // Collect handles that have posts but no competitor row (orphaned posts)
  const trackedHandles = new Set((competitors ?? []).map(c => c.handle.toLowerCase()))
  const orphanedHandles = Object.keys(postsByHandle).filter(
    h => h !== '__unknown__' && !trackedHandles.has(h)
  )

  const totalPosts = competitorPosts?.length ?? 0

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitors</h1>
          <p className="text-muted-foreground mt-1">
            Track what&apos;s working in your niche
            {totalPosts > 0 && <span className="ml-2 text-xs">— {totalPosts} posts tracked</span>}
          </p>
        </div>
        <AddCompetitorButton />
      </div>

      {(!competitors || competitors.length === 0) ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">No competitors yet</p>
            <p className="text-sm">Add a competitor to start tracking their content and get AI-generated ideas from their top posts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(competitors ?? []).map((c: Competitor) => {
            const posts = postsByHandle[c.handle.toLowerCase()] ?? []
            return (
              <CompetitorCard
                key={c.id}
                competitor={c}
                posts={posts}
              />
            )
          })}

          {/* Orphaned posts (competitor row deleted but posts remain) */}
          {orphanedHandles.map(handle => (
            <Card key={handle}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-muted-foreground">@{handle}</span>
                  <Badge variant="outline" className="text-xs">account removed</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {postsByHandle[handle].map(post => (
                  <PostRow key={post.id} post={post} handle={handle} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ competitor: c, posts }: { competitor: Competitor; posts: Post[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline">{c.platform}</Badge>
            <span className="font-semibold text-lg">@{c.handle}</span>
            {c.display_name && <span className="text-muted-foreground text-sm">{c.display_name}</span>}
            {c.profile_url && (
              <a
                href={c.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-0.5 underline"
              >
                Profile <ExternalLink size={10} />
              </a>
            )}
            {c.follower_count && (
              <span className="text-sm text-muted-foreground">
                {c.follower_count >= 1_000_000
                  ? `${(c.follower_count / 1_000_000).toFixed(1)}M`
                  : c.follower_count >= 1_000
                  ? `${(c.follower_count / 1_000).toFixed(1)}K`
                  : c.follower_count} followers
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AddPostButton handle={c.handle} platform={c.platform as Platform} />
            <DeleteButton onDelete={deleteCompetitor.bind(null, c.id)} />
          </div>
        </div>
        {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
      </CardHeader>

      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            No posts tracked yet — click &quot;Add post&quot; to log one of their top videos.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {posts.length} tracked post{posts.length !== 1 ? 's' : ''}
            </p>
            {posts.map(post => (
              <PostRow key={post.id} post={post} handle={c.handle} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PostRow({ post, handle }: { post: Post; handle: string }) {
  const er = engagementRate(post)

  return (
    <div className="p-4 rounded-lg border space-y-2">
      {/* Hook */}
      {post.hook_text && (
        <p className="text-sm font-medium leading-snug">
          &ldquo;{post.hook_text}&rdquo;
        </p>
      )}

      {/* Caption */}
      {post.caption && (
        <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4 text-sm">
          {post.views > 0 && (
            <div>
              <span className="font-semibold">{formatNumber(post.views)}</span>
              <span className="text-xs text-muted-foreground ml-1">views</span>
            </div>
          )}
          {post.likes > 0 && (
            <div>
              <span className="font-semibold">{formatNumber(post.likes)}</span>
              <span className="text-xs text-muted-foreground ml-1">likes</span>
            </div>
          )}
          {post.comments > 0 && (
            <div>
              <span className="font-semibold">{formatNumber(post.comments)}</span>
              <span className="text-xs text-muted-foreground ml-1">comments</span>
            </div>
          )}
          {er && (
            <div>
              <span className="font-semibold">{er}%</span>
              <span className="text-xs text-muted-foreground ml-1">eng.</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <GetIdeasButton
            postId={post.id}
            handle={handle}
            platform={post.platform}
            caption={post.caption}
            hookText={post.hook_text}
            views={post.views}
            likes={post.likes}
            url={post.url}
          />
          <DeleteButton onDelete={deletePost.bind(null, post.id)} />
        </div>
      </div>
    </div>
  )
}
