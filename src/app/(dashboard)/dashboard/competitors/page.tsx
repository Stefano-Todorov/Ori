import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

const PLATFORM_PILL: Record<string, string> = {
  tiktok: 'bg-black/80 dark:bg-white/10 text-white border-transparent',
  instagram: 'bg-pink-500/15 border-pink-500/30 text-pink-600 dark:text-pink-400',
  youtube: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
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

  const postsByHandle: Record<string, Post[]> = {}
  for (const post of (competitorPosts ?? [])) {
    const key = (post.competitor_handle ?? '__unknown__').toLowerCase()
    if (!postsByHandle[key]) postsByHandle[key] = []
    postsByHandle[key].push(post)
  }

  const trackedHandles = new Set((competitors ?? []).map(c => c.handle.toLowerCase()))
  const orphanedHandles = Object.keys(postsByHandle).filter(
    h => h !== '__unknown__' && !trackedHandles.has(h)
  )

  const totalPosts = competitorPosts?.length ?? 0

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Competitors</h1>
          <p className="text-muted-foreground mt-1">
            Track what&apos;s working in your niche
            {totalPosts > 0 && <span className="ml-2 text-xs font-medium text-purple-600 dark:text-purple-400">— {totalPosts} posts tracked</span>}
          </p>
        </div>
        <AddCompetitorButton />
      </div>

      {(!competitors || competitors.length === 0) ? (
        <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-12 text-center space-y-2">
          <p className="font-bold text-foreground">No competitors yet</p>
          <p className="text-sm text-muted-foreground">Add a competitor to start tracking their content and get AI-generated ideas from their top posts.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(competitors ?? []).map((c: Competitor) => {
            const posts = postsByHandle[c.handle.toLowerCase()] ?? []
            return <CompetitorCard key={c.id} competitor={c} posts={posts} />
          })}

          {orphanedHandles.map(handle => (
            <div key={handle} className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-muted-foreground">@{handle}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-400 text-gray-500">account removed</span>
              </div>
              <div className="space-y-2">
                {postsByHandle[handle].map(post => (
                  <PostRow key={post.id} post={post} handle={handle} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ competitor: c, posts }: { competitor: Competitor; posts: Post[] }) {
  return (
    <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize ${PLATFORM_PILL[c.platform] ?? 'bg-muted text-muted-foreground border-border'}`}>
            {c.platform}
          </span>
          <span className="font-bold text-lg text-foreground">@{c.handle}</span>
          {c.display_name && <span className="text-muted-foreground text-sm">{c.display_name}</span>}
          {c.profile_url && (
            <a href={c.profile_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline">
              Profile <ExternalLink size={10} />
            </a>
          )}
          {c.follower_count && (
            <span className="text-xs font-medium text-muted-foreground">
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

      {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border dark:border-white/10 rounded-xl">
          No posts tracked yet — click &quot;Add post&quot; to log one of their top videos.
        </p>
      ) : (
        <div className="space-y-2 pt-2 border-t border-border dark:border-white/6">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
            {posts.length} tracked post{posts.length !== 1 ? 's' : ''}
          </p>
          {posts.map(post => (
            <PostRow key={post.id} post={post} handle={c.handle} />
          ))}
        </div>
      )}
    </div>
  )
}

function PostRow({ post, handle }: { post: Post; handle: string }) {
  const er = engagementRate(post)

  return (
    <div className="p-4 rounded-xl border border-border dark:border-white/6 bg-muted/30 dark:bg-[#1a1a2e] space-y-2 transition-colors hover:bg-muted/50 dark:hover:bg-[#1e1e38]">
      {post.hook_text && (
        <p className="text-sm font-medium italic text-foreground leading-snug">
          &ldquo;{post.hook_text}&rdquo;
        </p>
      )}

      {post.caption && (
        <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4 text-sm">
          {post.views > 0 && (
            <div>
              <span className="font-bold text-foreground">{formatNumber(post.views)}</span>
              <span className="text-[10px] text-muted-foreground ml-1 uppercase">views</span>
            </div>
          )}
          {post.likes > 0 && (
            <div>
              <span className="font-bold text-foreground">{formatNumber(post.likes)}</span>
              <span className="text-[10px] text-muted-foreground ml-1 uppercase">likes</span>
            </div>
          )}
          {post.comments > 0 && (
            <div>
              <span className="font-bold text-foreground">{formatNumber(post.comments)}</span>
              <span className="text-[10px] text-muted-foreground ml-1 uppercase">comments</span>
            </div>
          )}
          {er && (
            <div>
              <span className={`font-bold ${parseFloat(er) >= 5 ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>{er}%</span>
              <span className="text-[10px] text-muted-foreground ml-1 uppercase">eng.</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {post.url && (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-purple-500 transition-colors">
              <ExternalLink size={14} />
            </a>
          )}
          <GetIdeasButton postId={post.id} handle={handle} platform={post.platform} caption={post.caption} hookText={post.hook_text} views={post.views} likes={post.likes} url={post.url} />
          <DeleteButton onDelete={deletePost.bind(null, post.id)} />
        </div>
      </div>
    </div>
  )
}
