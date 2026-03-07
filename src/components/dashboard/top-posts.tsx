import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Post } from '@/lib/types'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-pink-500 text-white',
  youtube: 'bg-red-500 text-white',
}

interface Props {
  posts: Post[]
}

export function TopPosts({ posts }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {posts.map((post, i) => (
            <div key={post.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <span className="text-2xl font-bold text-muted-foreground/40 w-6 shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${PLATFORM_COLORS[post.platform] ?? ''}`}>
                    {post.platform}
                  </Badge>
                  {post.posted_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.posted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {post.caption ?? post.title ?? post.url ?? 'No caption'}
                </p>
              </div>
              <div className="flex gap-4 text-sm shrink-0">
                <div className="text-right">
                  <p className="font-semibold">{formatNumber(post.views)}</p>
                  <p className="text-xs text-muted-foreground">views</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatNumber(post.likes)}</p>
                  <p className="text-xs text-muted-foreground">likes</p>
                </div>
                {post.engagement_rate != null && (
                  <div className="text-right">
                    <p className="font-semibold">{post.engagement_rate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">eng.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
