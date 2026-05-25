import type { Post } from '@/lib/types'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const PLATFORM_PILL: Record<string, string> = {
  tiktok: 'bg-black/80 dark:bg-white/10 text-white',
  instagram: 'bg-pink-500/15 border-pink-500/30 text-pink-600 dark:text-pink-400',
}

interface Props {
  posts: Post[]
}

export function TopPosts({ posts }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <p className="text-sm font-bold text-foreground">Top Performing Posts</p>
      <div className="space-y-1">
        {posts.map((post, i) => (
          <div key={post.id} className="flex items-center gap-2 sm:gap-4 p-3 rounded-xl hover:bg-muted/50 dark:hover:bg-white/[0.03] transition-colors">
            <span className="text-lg font-bold text-muted-foreground/30 w-6 shrink-0 text-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${PLATFORM_PILL[post.platform] ?? 'bg-muted text-muted-foreground'}`}>
                  {post.platform}
                </span>
                {post.posted_at && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(post.posted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {post.caption ?? post.title ?? post.url ?? 'No caption'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-5 text-sm shrink-0">
              <div className="text-right">
                <p className="font-bold text-foreground">{formatNumber(post.views)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">views</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{formatNumber(post.likes)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">likes</p>
              </div>
              {post.engagement_rate != null && (
                <div className="text-right">
                  <p className={`font-bold ${post.engagement_rate >= 5 ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                    {post.engagement_rate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">engagement</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
