import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ImportCsvButton } from '@/components/posts/import-csv-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletePost } from '@/app/actions'

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

export default async function PostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_competitor', false)
    .eq('is_trending', false)
    .order('views', { ascending: false })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Posts</h1>
          <p className="text-muted-foreground mt-1">All your imported content analytics</p>
        </div>
        <ImportCsvButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All posts ({posts?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!posts || posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No posts yet. Import your analytics CSV to get started.</p>
              <ImportCsvButton />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Platform</th>
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Caption</th>
                    <th className="text-right py-3 pr-4 font-medium text-muted-foreground">Views</th>
                    <th className="text-right py-3 pr-4 font-medium text-muted-foreground">Likes</th>
                    <th className="text-right py-3 pr-4 font-medium text-muted-foreground">Comments</th>
                    <th className="text-right py-3 pr-4 font-medium text-muted-foreground">Shares</th>
                    <th className="text-right py-3 pr-4 font-medium text-muted-foreground">Eng %</th>
                    <th className="py-3" />
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b hover:bg-accent/30 transition-colors">
                      <td className="py-3 pr-4">
                        <Badge className={`text-xs ${PLATFORM_COLORS[post.platform] ?? ''}`}>
                          {post.platform}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 max-w-xs">
                        <p className="truncate text-muted-foreground">
                          {post.caption ?? post.title ?? post.url ?? '—'}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">{formatNumber(post.views)}</td>
                      <td className="py-3 pr-4 text-right">{formatNumber(post.likes)}</td>
                      <td className="py-3 pr-4 text-right">{formatNumber(post.comments)}</td>
                      <td className="py-3 pr-4 text-right">{formatNumber(post.shares)}</td>
                      <td className="py-3 pr-4 text-right">
                        {post.engagement_rate != null ? (
                          <span className={post.engagement_rate >= 5 ? 'text-green-600 font-medium' : ''}>
                            {post.engagement_rate.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3">
                        <DeleteButton onDelete={deletePost.bind(null, post.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
