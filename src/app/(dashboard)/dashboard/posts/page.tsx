import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportCsvButton } from '@/components/posts/import-csv-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletePost } from '@/app/actions'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const PLATFORM_PILL: Record<string, string> = {
  tiktok: 'bg-black/80 dark:bg-white/10 text-white border-transparent',
  instagram: 'bg-pink-500/15 border-pink-500/30 text-pink-600 dark:text-pink-400',
  youtube: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Posts</h1>
          <p className="text-muted-foreground mt-1">All your imported content analytics</p>
        </div>
        <ImportCsvButton />
      </div>

      <div className="bg-card dark:bg-[#12121a] border border-border dark:border-white/8 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border dark:border-white/6">
          <p className="text-sm font-bold text-foreground">All posts ({posts?.length ?? 0})</p>
        </div>

        {!posts || posts.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-muted-foreground mb-5">No posts yet. Import your analytics CSV to get started.</p>
            <ImportCsvButton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-white/6">
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Platform</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Caption</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Views</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Likes</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Comments</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Shares</th>
                  <th className="text-right py-3 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Eng %</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-border dark:border-white/4 last:border-0 hover:bg-muted/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-6">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${PLATFORM_PILL[post.platform] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {post.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="truncate text-foreground/70">
                        {post.caption ?? post.title ?? post.url ?? '—'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">{formatNumber(post.views)}</td>
                    <td className="py-3 px-4 text-right text-foreground/80">{formatNumber(post.likes)}</td>
                    <td className="py-3 px-4 text-right text-foreground/80">{formatNumber(post.comments)}</td>
                    <td className="py-3 px-4 text-right text-foreground/80">{formatNumber(post.shares)}</td>
                    <td className="py-3 px-4 text-right">
                      {post.engagement_rate != null ? (
                        <span className={`font-semibold ${post.engagement_rate >= 5 ? 'text-green-600 dark:text-green-400' : 'text-foreground/80'}`}>
                          {post.engagement_rate.toFixed(1)}%
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <DeleteButton onDelete={deletePost.bind(null, post.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
